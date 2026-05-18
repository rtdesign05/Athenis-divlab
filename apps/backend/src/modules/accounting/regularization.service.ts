/**
 * Régularisations d'inventaire — réglementation SYSCOHADA / PCG
 *
 *  CCA  (Charges Constatées d'Avance) :
 *    À la clôture N :  D: 476 (OHADA) / 486 (PCG)   C: 6xx
 *    Contre-passation N+1 : D: 6xx  C: 476 / 486
 *
 *  PCA  (Produits Constatés d'Avance) :
 *    À la clôture N :  D: 7xx   C: 477 (OHADA) / 487 (PCG)
 *    Contre-passation N+1 : D: 477 / 487   C: 7xx
 *
 *  FNP  (Factures Non Parvenues — fournisseurs) :
 *    À la clôture N :  D: 6xx  C: 408 (Fournisseurs - FNP)
 *    Contre-passation N+1 : D: 408  C: 6xx
 *
 *  FAE  (Factures à Établir — clients) :
 *    À la clôture N :  D: 418  C: 7xx
 *    Contre-passation N+1 : D: 7xx  C: 418
 *
 *  CAP  (Charges À Payer — personnel, social, fiscal, divers ; hors FNP) :
 *    À la clôture N :  D: 6xx (charge)  C: 468 OHADA / 4686 PCG
 *    Contre-passation N+1 : D: 4x8 / 4686  C: 6xx
 *
 *  PAR  (Produits À Recevoir — hors FAE clients) :
 *    À la clôture N :  D: 4687  C: 7xx (produit)
 *    Contre-passation N+1 : D: 7xx  C: 4687
 *
 *  CD   (Créances Douteuses — dotation à la dépréciation des clients) :
 *    À la clôture N :  D: 6817 (compte de dotation, classe 6)  C: 491 (dépréciation)
 *    Contre-passation N+1 : D: 491  C: 6817
 *
 *  Les contre-passations sont datées au 1er jour de l'exercice N+1 et n'ont
 *  lieu que si l'exercice N+1 existe et n'est pas clôturé.
 */
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { normalizeAccountCode } from '../../lib/accountCodes.js'
import { getFiscalYear } from './accounting.service.js'

export type RegularizationType = 'CCA' | 'PCA' | 'FNP' | 'FAE' | 'CAP' | 'PAR' | 'CD'

interface RegPayload {
  type:               RegularizationType
  date:               Date          // date de l'écriture (en général fin d'exercice)
  contrepartie:       string        // compte de charge (6xx) ou de produit (7xx)
  libelle:            string
  montant:            number
  reference?:         string | null // référence libre (sinon auto-générée)
  autoContrepassation: boolean      // créer aussi l'extourne au 1er jour de N+1
}

/** Comptes de régularisation selon la zone comptable */
function getRegAccount(zone: string, type: RegularizationType): string {
  // PCG France
  if (zone === 'FRANCE' || zone === 'PCG') {
    return ({
      CCA: '486',  PCA: '487',  FNP: '408',  FAE: '418',
      CAP: '4686', PAR: '4687', CD:  '491',
    } as const)[type]
  }
  // OHADA (et défaut)
  return ({
    CCA: '476',  PCA: '477',  FNP: '408',  FAE: '418',
    CAP: '468',  PAR: '4687', CD:  '491',
  } as const)[type]
}

/**
 * Détermine la classe attendue du compte de contrepartie selon le type :
 *  - CCA, FNP, CAP, CD : compte de charge (classe 6)
 *  - PCA, FAE, PAR     : compte de produit (classe 7)
 */
function expectedCounterClass(type: RegularizationType): '6' | '7' {
  return type === 'PCA' || type === 'FAE' || type === 'PAR' ? '7' : '6'
}

/**
 * Détermine le sens (D/C) du compte de RÉGULARISATION sur l'écriture principale.
 * Le compte de contrepartie reçoit le sens opposé.
 *
 *  - CCA : D: 476 / C: 6xx  → régu = D, contrepartie = C
 *  - PCA : D: 7xx / C: 477  → régu = C, contrepartie = D
 *  - FNP : D: 6xx / C: 408  → régu = C, contrepartie = D
 *  - FAE : D: 418 / C: 7xx  → régu = D, contrepartie = C
 *  - CAP : D: 6xx / C: 468  → régu = C, contrepartie = D (charges à payer)
 *  - PAR : D: 4687 / C: 7xx → régu = D, contrepartie = C (produits à recevoir)
 *  - CD  : D: 681x / C: 491 → régu = C, contrepartie = D (dotation aux dépréciations)
 */
function regAccountSide(type: RegularizationType): 'D' | 'C' {
  return type === 'CCA' || type === 'FAE' || type === 'PAR' ? 'D' : 'C'
}

/** Génère la prochaine référence séquentielle pour ce type / cet exercice */
async function nextRegReference(
  companyId: string,
  fiscalYearId: string,
  type: RegularizationType,
  year: number,
  tx?: import('@prisma/client').Prisma.TransactionClient,
): Promise<string> {
  const prefix = `REG-${type}-${year}-`
  const db = tx ?? prisma
  // N1 : advisory lock pour sérialiser la lecture du compteur. Sans tx fourni,
  //      on lit sans lock (fallback compatibilité legacy).
  if (tx) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId + ':REG:' + type + ':' + year}))`
  }
  const last = await db.journalEntry.findFirst({
    where: { companyId, fiscalYearId, reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  })
  let nextNum = 1
  if (last?.reference) {
    const m = /-(\d+)$/.exec(last.reference)
    if (m) nextNum = parseInt(m[1]!, 10) + 1
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`
}

/**
 * Crée une écriture de régularisation (deux lignes équilibrées D=C) et
 * optionnellement son extourne au 1er jour de l'exercice suivant.
 */
export async function createRegularization(
  companyId: string,
  fiscalYearId: string,
  userId: string,
  payload: RegPayload,
) {
  // ── Validations basiques ────────────────────────────────────────────────
  const { type, contrepartie, libelle, montant, autoContrepassation } = payload
  if (!['CCA', 'PCA', 'FNP', 'FAE', 'CAP', 'PAR', 'CD'].includes(type))
    throw new AppError('Type de régularisation invalide', 400, 'VALIDATION_ERROR')
  if (!contrepartie?.trim())
    throw new AppError('Compte de contrepartie requis', 400, 'VALIDATION_ERROR')
  if (!libelle?.trim())
    throw new AppError('Libellé requis', 400, 'VALIDATION_ERROR')
  if (!(montant > 0))
    throw new AppError('Le montant doit être strictement positif', 400, 'VALIDATION_ERROR')

  const fy = await getFiscalYear(companyId, fiscalYearId)
  if (fy.status === 'CLOSED')
    throw new AppError('Exercice clôturé — saisie impossible', 400, 'FISCAL_YEAR_CLOSED')

  // Date dans l'exercice
  const entryDate = new Date(payload.date)
  if (entryDate < fy.startDate || entryDate > fy.endDate)
    throw new AppError(
      `La date doit être comprise dans l'exercice (${fy.startDate.toISOString().slice(0,10)} → ${fy.endDate.toISOString().slice(0,10)})`,
      400, 'DATE_OUT_OF_RANGE',
    )

  // ── Comptes de régularisation et de contrepartie ────────────────────────
  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { accountingZone: true },
  })
  if (!company) throw new AppError('Société introuvable', 404, 'NOT_FOUND')

  const regAccount  = normalizeAccountCode(getRegAccount(company.accountingZone, type))
  const counterAcct = normalizeAccountCode(contrepartie)

  // Vérification de la classe du compte de contrepartie
  const expectedClass = expectedCounterClass(type)
  if (!counterAcct.startsWith(expectedClass)) {
    const expectedLabel = expectedClass === '6' ? 'charge (classe 6)' : 'produit (classe 7)'
    throw new AppError(
      `Le compte de contrepartie doit être un compte de ${expectedLabel} pour une ${type}. Compte saisi : ${counterAcct}`,
      400, 'COUNTERPARTY_CLASS_MISMATCH',
    )
  }

  const side     = regAccountSide(type) // 'D' or 'C' for reg account
  const pieceId  = `reg_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Définit les deux lignes
  const regLine = {
    compte:  regAccount,
    debit:   side === 'D' ? montant : 0,
    credit:  side === 'C' ? montant : 0,
  }
  const counterLine = {
    compte:  counterAcct,
    debit:   side === 'D' ? 0 : montant,
    credit:  side === 'D' ? montant : 0,
  }

  // ── Création atomique : écriture principale (+ extourne éventuelle) ─────
  // N1 : génération de la référence DANS la transaction avec advisory lock
  //      pour éviter les courses (2 POST simultanés → même REG-CCA-YYYY-NNNN).
  const result = await prisma.$transaction(async (tx) => {
    const reference = payload.reference?.trim()
      || (await nextRegReference(companyId, fiscalYearId, type, fy.year, tx))
    // Écriture principale (OD)
    const main = await tx.journalEntry.createMany({
      data: [
        {
          companyId,
          fiscalYearId,
          date:      entryDate,
          journal:   'OD',
          pieceId,
          compte:    regLine.compte,
          libelle,
          debit:     regLine.debit,
          credit:    regLine.credit,
          reference,
          createdBy: userId,
        },
        {
          companyId,
          fiscalYearId,
          date:      entryDate,
          journal:   'OD',
          pieceId,
          compte:    counterLine.compte,
          libelle,
          debit:     counterLine.debit,
          credit:    counterLine.credit,
          reference,
          createdBy: userId,
        },
      ],
    })

    let extourne: { pieceId: string; fiscalYearId: string; created: number } | null = null

    // ── Contre-passation N+1 (si demandée) ────────────────────────────────
    if (autoContrepassation) {
      const nextFy = await tx.fiscalYear.findFirst({
        where: { companyId, year: fy.year + 1 },
      })
      if (!nextFy)
        throw new AppError(
          `Impossible de générer la contre-passation : l'exercice ${fy.year + 1} n'existe pas. Créez-le d'abord.`,
          400, 'NEXT_FY_NOT_FOUND',
        )
      if (nextFy.status === 'CLOSED')
        throw new AppError(
          `Exercice ${fy.year + 1} clôturé — contre-passation impossible.`,
          400, 'FISCAL_YEAR_CLOSED',
        )

      const extPieceId  = `reg_${type.toLowerCase()}_ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const extReference = `${reference}-EXT`
      const extLabel    = `Contre-passation ${reference} — ${libelle}`

      await tx.journalEntry.createMany({
        data: [
          {
            companyId,
            fiscalYearId: nextFy.id,
            date:         nextFy.startDate,
            journal:      'OD',
            pieceId:      extPieceId,
            compte:       regLine.compte,
            libelle:      extLabel,
            debit:        regLine.credit,  // inversé
            credit:       regLine.debit,
            reference:    extReference,
            createdBy:    userId,
          },
          {
            companyId,
            fiscalYearId: nextFy.id,
            date:         nextFy.startDate,
            journal:      'OD',
            pieceId:      extPieceId,
            compte:       counterLine.compte,
            libelle:      extLabel,
            debit:        counterLine.credit,  // inversé
            credit:       counterLine.debit,
            reference:    extReference,
            createdBy:    userId,
          },
        ],
      })

      extourne = { pieceId: extPieceId, fiscalYearId: nextFy.id, created: 2 }
    }

    return { main: { pieceId, created: main.count }, extourne, reference }
  })

  return result
}

/**
 * Liste toutes les régularisations de l'exercice, groupées par pièce,
 * avec leur type, montant, et indication d'une éventuelle contre-passation.
 */
export async function listRegularizations(companyId: string, fiscalYearId: string) {
  await getFiscalYear(companyId, fiscalYearId)

  // On filtre par référence préfixée 'REG-' (sans le suffixe -EXT pour avoir l'écriture principale)
  const entries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      fiscalYearId,
      reference: { startsWith: 'REG-' },
      NOT:       { reference: { endsWith: '-EXT' } },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  // Group by pieceId
  const groups = new Map<string, typeof entries>()
  for (const e of entries) {
    if (!e.pieceId) continue
    const arr = groups.get(e.pieceId) ?? []
    arr.push(e)
    groups.set(e.pieceId, arr)
  }

  // Liste des contre-passations existantes (référencées par REF-EXT)
  const extReferences = new Set<string>()
  if (entries.length > 0) {
    const allRefs = [...new Set(entries.map(e => e.reference).filter(Boolean) as string[])]
    const exts = await prisma.journalEntry.findMany({
      where:  { companyId, reference: { in: allRefs.map(r => `${r}-EXT`) } },
      select: { reference: true, fiscalYearId: true },
    })
    for (const e of exts) {
      if (e.reference) extReferences.add(e.reference)
    }
  }

  return [...groups.entries()].map(([pieceId, lines]) => {
    const ref     = lines[0]?.reference ?? null
    const date    = lines[0]?.date
    const libelle = lines[0]?.libelle ?? ''
    // Détection du type via le préfixe REG-XYZ-
    const m       = ref ? /^REG-(CCA|PCA|FNP|FAE|CAP|PAR|CD)-/.exec(ref) : null
    const type    = (m?.[1] ?? 'XXX') as RegularizationType | 'XXX'
    // Montant = max debit ou credit d'une ligne (les deux lignes ont le même montant)
    const montant = Math.max(...lines.map(l => Math.max(Number(l.debit), Number(l.credit))))

    return {
      pieceId,
      reference:        ref,
      type,
      date,
      libelle,
      montant,
      lignes:           lines.map(l => ({
        id:      l.id,
        compte:  l.compte,
        debit:   Number(l.debit),
        credit:  Number(l.credit),
      })),
      hasContrepassation: ref ? extReferences.has(`${ref}-EXT`) : false,
    }
  })
}

/**
 * Liste les régularisations de l'exercice N-1 qui doivent être extournées
 * dans l'exercice N (en cours), avec pour chacune le statut de son extourne.
 *
 * Réglementation SYSCOHADA / PCG :
 *  Les régularisations d'inventaire (CCA, PCA, FNP, FAE) passées à la
 *  clôture de N-1 doivent être contre-passées au 1er jour de N pour
 *  rendre la charge / le produit à son exercice d'origine.
 */
export async function listExtournesRequises(companyId: string, fiscalYearId: string) {
  const fy = await getFiscalYear(companyId, fiscalYearId)
  const prevFy = await prisma.fiscalYear.findFirst({
    where: { companyId, year: fy.year - 1 },
  })
  if (!prevFy) {
    return {
      previousFyExists: false,
      previousYear:     fy.year - 1,
      currentYear:      fy.year,
      currentFyStatus:  fy.status,
      regularizations:  [],
    }
  }

  // 1. Régularisations de N-1 (références REG-* sans suffixe -EXT)
  const regsInPrev = await prisma.journalEntry.findMany({
    where: {
      companyId,
      fiscalYearId: prevFy.id,
      reference:    { startsWith: 'REG-' },
      NOT:          { reference: { endsWith: '-EXT' } },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  // Group by pieceId
  const groups = new Map<string, typeof regsInPrev>()
  for (const e of regsInPrev) {
    if (!e.pieceId) continue
    const arr = groups.get(e.pieceId) ?? []
    arr.push(e)
    groups.set(e.pieceId, arr)
  }

  // 2. Extournes déjà créées dans N (références REF-EXT)
  const allRefs = [...new Set(regsInPrev.map(e => e.reference).filter(Boolean) as string[])]
  const extsInN = allRefs.length > 0
    ? await prisma.journalEntry.findMany({
        where: {
          companyId,
          fiscalYearId,
          reference: { in: allRefs.map(r => `${r}-EXT`) },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      })
    : []

  const extByRef = new Map<string, typeof extsInN>()
  for (const e of extsInN) {
    if (!e.reference) continue
    const baseRef = e.reference.replace(/-EXT$/, '')
    const arr = extByRef.get(baseRef) ?? []
    arr.push(e)
    extByRef.set(baseRef, arr)
  }

  // 3. Construit le résultat
  const regularizations = [...groups.entries()].map(([pieceId, lines]) => {
    const ref     = lines[0]?.reference ?? null
    const date    = lines[0]?.date
    const libelle = lines[0]?.libelle ?? ''
    const m       = ref ? /^REG-(CCA|PCA|FNP|FAE|CAP|PAR|CD)-/.exec(ref) : null
    const type    = (m?.[1] ?? 'XXX') as 'CCA' | 'PCA' | 'FNP' | 'FAE' | 'XXX'
    const montant = Math.max(...lines.map(l => Math.max(Number(l.debit), Number(l.credit))))

    const extLines = ref ? extByRef.get(ref) ?? [] : []
    const ext = extLines.length > 0 ? {
      pieceId: extLines[0]?.pieceId ?? null,
      date:    extLines[0]?.date    ?? null,
      lignes:  extLines.map(l => ({
        id:     l.id,
        compte: l.compte,
        debit:  Number(l.debit),
        credit: Number(l.credit),
      })),
    } : null

    return {
      pieceId,
      reference: ref,
      type,
      date,
      libelle,
      montant,
      lignes: lines.map(l => ({
        id:     l.id,
        compte: l.compte,
        debit:  Number(l.debit),
        credit: Number(l.credit),
      })),
      extourne: ext,
    }
  })

  return {
    previousFyExists:  true,
    previousYear:      prevFy.year,
    previousFyStatus:  prevFy.status,
    currentYear:       fy.year,
    currentFyStatus:   fy.status,
    regularizations,
    totalPending:      regularizations.filter(r => !r.extourne).length,
    totalDone:         regularizations.filter(r =>  r.extourne).length,
  }
}

/**
 * Crée manuellement l'extourne d'une régularisation N-1 dans l'exercice N.
 * Vérifie qu'elle n'existe pas déjà (idempotence).
 */
export async function createExtourne(
  companyId: string,
  fiscalYearId: string,   // N — exercice où l'extourne sera enregistrée
  regPieceId: string,     // pieceId de la régularisation N-1
  userId: string,
  extDateRaw?: Date,
): Promise<{ pieceId: string; reference: string; created: number }> {
  const fy = await getFiscalYear(companyId, fiscalYearId)
  if (fy.status === 'CLOSED')
    throw new AppError('Exercice clôturé — extourne impossible', 400, 'FISCAL_YEAR_CLOSED')

  // Récupère les lignes de la régularisation N-1
  const regLines = await prisma.journalEntry.findMany({
    where: { companyId, pieceId: regPieceId },
  })
  if (regLines.length === 0)
    throw new AppError('Régularisation introuvable', 404, 'NOT_FOUND')

  // Vérifie que c'est bien une régularisation (référence préfixée REG-)
  const reference = regLines[0]?.reference
  if (!reference || !reference.startsWith('REG-') || reference.endsWith('-EXT'))
    throw new AppError('Cette pièce n\'est pas une régularisation', 400, 'NOT_REGULARIZATION')

  // Vérifie qu'on n'a pas déjà l'extourne
  const existing = await prisma.journalEntry.findFirst({
    where: { companyId, fiscalYearId, reference: `${reference}-EXT` },
  })
  if (existing)
    throw new AppError(
      `Extourne déjà créée pour ${reference} (le ${existing.date.toISOString().slice(0,10)})`,
      400, 'ALREADY_EXTOURNED',
    )

  // Date : par défaut au 1er jour de N
  const date = extDateRaw ?? fy.startDate
  if (date < fy.startDate || date > fy.endDate)
    throw new AppError(
      `Date hors exercice ${fy.year} (${fy.startDate.toISOString().slice(0,10)} → ${fy.endDate.toISOString().slice(0,10)})`,
      400, 'DATE_OUT_OF_RANGE',
    )

  const extPieceId = `reg_ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const extReference = `${reference}-EXT`

  await prisma.journalEntry.createMany({
    data: regLines.map(l => ({
      companyId,
      fiscalYearId,
      date,
      journal:      'OD',
      pieceId:      extPieceId,
      compte:       l.compte,
      libelle:      `Contre-passation ${reference} — ${l.libelle}`,
      debit:        Number(l.credit),  // inversion D/C
      credit:       Number(l.debit),
      reference:    extReference,
      createdBy:    userId,
    })),
  })

  return { pieceId: extPieceId, reference: extReference, created: regLines.length }
}

/**
 * Crée en bulk toutes les extournes manquantes pour les régularisations N-1.
 * Retourne le détail (succès / erreurs par pièce).
 */
export async function createAllPendingExtournes(
  companyId: string,
  fiscalYearId: string,
  userId: string,
): Promise<{ processed: number; created: number; errors: { reference: string; error: string }[] }> {
  const data = await listExtournesRequises(companyId, fiscalYearId)
  const pending = data.regularizations.filter(r => !r.extourne)

  let created = 0
  const errors: { reference: string; error: string }[] = []
  for (const reg of pending) {
    try {
      await createExtourne(companyId, fiscalYearId, reg.pieceId, userId)
      created++
    } catch (e) {
      errors.push({
        reference: reg.reference ?? '?',
        error:     e instanceof Error ? e.message : String(e),
      })
    }
  }
  return { processed: pending.length, created, errors }
}

/**
 * Supprime une extourne par son pieceId. Vérifie que la pièce est bien
 * une extourne (référence -EXT) et que l'exercice n'est pas clôturé.
 */
export async function deleteExtourne(companyId: string, pieceId: string) {
  const lines = await prisma.journalEntry.findMany({
    where:   { companyId, pieceId },
    include: { fiscalYear: { select: { status: true, year: true } } },
  })
  if (lines.length === 0) throw new AppError('Extourne introuvable', 404, 'NOT_FOUND')

  const ref = lines[0]?.reference
  if (!ref?.endsWith('-EXT'))
    throw new AppError('Cette pièce n\'est pas une extourne', 400, 'NOT_EXTOURNE')

  const fyStatus = lines[0]?.fiscalYear.status
  const fyYear   = lines[0]?.fiscalYear.year
  if (fyStatus === 'CLOSED')
    throw new AppError(`Exercice ${fyYear} clôturé — suppression impossible`, 400, 'FISCAL_YEAR_CLOSED')

  const result = await prisma.journalEntry.deleteMany({ where: { companyId, pieceId } })
  return { deleted: result.count }
}

/**
 * Supprime une régularisation (toutes les lignes du pieceId)
 * et sa contre-passation éventuelle (référence + '-EXT').
 * Bloque si l'une des écritures est dans un exercice clôturé.
 */
export async function deleteRegularization(companyId: string, pieceId: string) {
  const lines = await prisma.journalEntry.findMany({
    where:   { companyId, pieceId },
    include: { fiscalYear: { select: { status: true, year: true } } },
  })
  if (lines.length === 0) throw new AppError('Régularisation introuvable', 404, 'NOT_FOUND')

  const closed = lines.find(l => l.fiscalYear.status === 'CLOSED')
  if (closed)
    throw new AppError(
      `Exercice ${closed.fiscalYear.year} clôturé — suppression impossible`,
      400, 'FISCAL_YEAR_CLOSED',
    )

  const reference = lines[0]?.reference

  return prisma.$transaction(async (tx) => {
    // Supprime la pièce principale
    const main = await tx.journalEntry.deleteMany({ where: { companyId, pieceId } })

    // Cherche et supprime la contre-passation associée (si existante)
    let ext = { count: 0 }
    if (reference) {
      // Vérifie aussi que sa FY n'est pas clôturée
      const extLines = await tx.journalEntry.findMany({
        where:   { companyId, reference: `${reference}-EXT` },
        include: { fiscalYear: { select: { status: true, year: true } } },
      })
      const extClosed = extLines.find(l => l.fiscalYear.status === 'CLOSED')
      if (extClosed)
        throw new AppError(
          `Exercice ${extClosed.fiscalYear.year} (contre-passation) clôturé — suppression impossible`,
          400, 'FISCAL_YEAR_CLOSED',
        )
      ext = await tx.journalEntry.deleteMany({
        where: { companyId, reference: `${reference}-EXT` },
      })
    }

    return { deleted: main.count, deletedExtourne: ext.count }
  })
}
