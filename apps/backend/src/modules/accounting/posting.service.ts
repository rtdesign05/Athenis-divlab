/**
 * Service de comptabilisation automatique des factures (Gestion ↔ Comptabilité)
 *
 * Réglementation SYSCOHADA / PCG :
 *
 *   FACTURE DE VENTE (journal VTE) :
 *     D 411xxx (client)        — montant TTC
 *     C 70xxx  (produit)       — montant HT (1 ligne par compte de produit)
 *     C 4431   (TVA collectée) — montant TVA      [OHADA]
 *     C 44571  (TVA collectée) — montant TVA      [PCG France]
 *
 *   FACTURE D'ACHAT (journal ACH) :
 *     D 60xxx  (charge)         — montant HT
 *     D 4452   (TVA déductible) — montant TVA     [OHADA]
 *     D 44566  (TVA déductible) — montant TVA     [PCG France]
 *     C 401xxx (fournisseur)    — montant TTC
 *
 * Auto-création des comptes au Plan Comptable :
 *  - Clients 411xxx, fournisseurs 401xxx, articles 6xx/7xx ajoutés à AccountPlan
 *    s'ils n'existent pas déjà.
 *
 * Idempotence : si une facture est déjà comptabilisée (posted=true), un nouvel
 * appel est rejeté pour éviter les doublons. Le délettrage/annulation impose
 * d'annuler manuellement la pièce comptable d'abord.
 */
import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { normalizeAccountCode } from '../../lib/accountCodes.js'

// ── Comptes par défaut selon zone comptable ──────────────────────────────────

function defaultAccounts(zone: string) {
  const isOhada = zone === 'OHADA' || zone !== 'FRANCE'
  return {
    client:       '411',
    supplier:     '401',
    produit:      isOhada ? '706' : '706',         // 706 Services vendus
    charge:       isOhada ? '604' : '604',         // 604 Achats stockés
    tvaCollectee: isOhada ? '4431' : '44571',
    tvaDeductible:isOhada ? '4452' : '44566',
    journalVente: 'VTE',
    journalAchat: 'ACH',
  }
}

/**
 * Vérifie qu'un compte existe dans le AccountPlan, sinon le crée.
 * Garantit la communication Gestion ↔ Plan Comptable.
 */
async function ensureAccountInPlan(
  companyId: string,
  numeroRaw: string,
  intitule: string,
): Promise<string> {
  const numero = normalizeAccountCode(numeroRaw)
  const existing = await prisma.accountPlan.findUnique({
    where: { companyId_numero: { companyId, numero } },
  })
  if (existing) {
    if (!existing.isActive) {
      await prisma.accountPlan.update({ where: { id: existing.id }, data: { isActive: true } })
    }
    return numero
  }
  // Récupère la zone de la société
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId }, select: { accountingZone: true },
  })
  // Déduit la classe à partir du premier chiffre
  const classe = parseInt(numero[0] ?? '0', 10)
  // Déduit le type comptable
  let type: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT' = 'ACTIF'
  if (classe === 1 || classe === 4) type = numero.startsWith('41') ? 'ACTIF' : 'PASSIF'
  if (classe === 4 && numero.startsWith('40')) type = 'PASSIF'
  if (classe === 4 && numero.startsWith('44')) type = 'PASSIF'
  if (classe === 6) type = 'CHARGE'
  if (classe === 7) type = 'PRODUIT'

  await prisma.accountPlan.create({
    data: { companyId, numero, intitule, classe, type, zone: company.accountingZone, isSystem: false, isActive: true },
  })
  return numero
}

// ── Résolution de l'exercice fiscal à utiliser ────────────────────────────────

async function findOrThrowFiscalYear(
  companyId: string,
  date: Date,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  // B11 : lecture dans la transaction quand fournie, pour éviter qu'une
  //       clôture concurrente ne rende le FY CLOSED entre check et write.
  const db = tx ?? prisma
  const fy = await db.fiscalYear.findFirst({
    where: { companyId, startDate: { lte: date }, endDate: { gte: date } },
  })
  if (!fy)
    throw new AppError(
      `Aucun exercice comptable ne couvre la date ${date.toISOString().slice(0,10)}. Créez-le dans Paramètres › Comptabilité.`,
      400, 'NO_FISCAL_YEAR',
    )
  if (fy.status === 'CLOSED')
    throw new AppError(
      `L'exercice ${fy.year} est clôturé — comptabilisation impossible.`,
      400, 'FISCAL_YEAR_CLOSED',
    )
  return fy.id
}

// ── Mouvements de stock SYSCOHADA (inventaire permanent) ─────────────────────
//
// Achat stocké :
//   D 31x (stock — marchandises 311, MP 311, etc.)
//   C 6031/6032 (Variation de stocks — biens achetés)
//   Montant : prix d'achat HT × quantité
//
// Vente avec déstockage :
//   D 6031/6032 (Variation de stocks)
//   C 31x (stock)
//   Montant : CMUP × quantité (coût et non prix de vente)

type StockJournalLine = {
  compte: string
  debit:  number
  credit: number
}

/** Génère le mouvement StockMouvement + retourne les lignes de variation comptable */
async function generateStockEntry(
  tx: Prisma.TransactionClient,
  companyId: string,
  articleId: string,
  type: 'ENTREE_ACHAT' | 'SORTIE_VENTE',
  quantite: number,
  prixUnitaire: number,
  reference: string,
  description: string,
  userId: string,
): Promise<StockJournalLine[]> {
  // B6 : verrouille la ligne article pour la durée de la transaction afin
  //      d'éviter une "lost update" si 2 ventes du même article sont postées
  //      en parallèle (les 2 liraient stockAvant identique → calculs faux).
  await tx.$executeRaw`SELECT id FROM articles WHERE id = ${articleId} AND company_id = ${companyId} FOR UPDATE`
  const article = await tx.article.findFirst({ where: { id: articleId, companyId } })
  if (!article) return []

  const stockAvant = Number(article.stockActuel)
  const cmupAvant  = Number(article.valeurCmup)
  const isFifo     = article.methodeValuation === 'FIFO'

  // B16 : pour les articles en FIFO, on consomme les lots dans l'ordre
  //       (dateEntree asc) plutôt qu'au CMUP. Le coût de sortie devient
  //       la somme des coûts unitaires des lots consommés (×qté).
  let stockApres: number
  let cmupApres:  number
  let prixTotal:  number
  let coutSortie = 0

  if (type === 'ENTREE_ACHAT') {
    stockApres = stockAvant + quantite
    cmupApres  = stockApres > 0
      ? (stockAvant * cmupAvant + quantite * prixUnitaire) / stockApres
      : prixUnitaire
    prixTotal  = quantite * prixUnitaire

    if (isFifo) {
      // FIFO : créer un nouveau lot pour cette entrée
      await tx.stockLot.create({
        data: {
          articleId,
          quantiteInitiale: quantite,
          quantiteRestante: quantite,
          prixUnitaire,
          dateEntree:       new Date(),
          reference,
          isEpuise:         false,
        },
      })
    }
  } else { // SORTIE_VENTE
    stockApres = stockAvant - quantite
    prixTotal  = quantite * prixUnitaire

    if (isFifo) {
      // FIFO : consommer les lots non épuisés dans l'ordre d'entrée
      const lots = await tx.stockLot.findMany({
        where:   { articleId, isEpuise: false, quantiteRestante: { gt: 0 } },
        orderBy: { dateEntree: 'asc' },
      })
      let qteRestanteAConsommer = quantite
      let coutCumul = 0
      for (const lot of lots) {
        if (qteRestanteAConsommer <= 0) break
        const qteDispo  = Number(lot.quantiteRestante)
        const qteAConsommer = Math.min(qteDispo, qteRestanteAConsommer)
        const lotPrix  = Number(lot.prixUnitaire)
        coutCumul += qteAConsommer * lotPrix
        const nouvelleQte = qteDispo - qteAConsommer
        await tx.stockLot.update({
          where: { id: lot.id },
          data:  {
            quantiteRestante: nouvelleQte,
            isEpuise:         nouvelleQte <= 0.0001, // tolérance float
          },
        })
        qteRestanteAConsommer -= qteAConsommer
      }
      if (qteRestanteAConsommer > 0.0001) {
        // Pas assez de lots — fallback au CMUP pour le reliquat (rupture)
        coutCumul += qteRestanteAConsommer * cmupAvant
      }
      coutSortie = coutCumul
      // Le CMUP reste tel quel (inchangé sur sortie en FIFO comme en CMUP)
      cmupApres = cmupAvant
    } else {
      // CMUP : coût de sortie = qté × CMUP courant
      cmupApres  = cmupAvant
      coutSortie = quantite * cmupAvant
    }
  }

  // Crée le mouvement de stock
  await tx.stockMouvement.create({
    data: {
      companyId, articleId,
      type, quantite, prixUnitaire,
      prixTotal,
      stockAvant, stockApres,
      cmupAvant,  cmupApres,
      reference, description,
      createdBy: userId,
    },
  })

  // Met à jour l'article
  await tx.article.update({
    where: { id: articleId },
    data:  { stockActuel: stockApres, valeurCmup: cmupApres },
  })

  // Comptes par défaut SYSCOHADA : 311 (stock marchandises), 6031 (variation)
  const compteStock     = article.compteStock?.trim()          || '311'
  const compteVariation = article.compteVariationStock?.trim() || '6031'

  const stockAcct = await ensureAccountInPlan(companyId, compteStock, 'Stocks de marchandises')
  const varAcct   = await ensureAccountInPlan(companyId, compteVariation, 'Variation des stocks de biens achetés')

  // Lignes comptables à ajouter à la pièce
  if (type === 'ENTREE_ACHAT') {
    return [
      { compte: stockAcct, debit: prixTotal,  credit: 0 },          // D Stock
      { compte: varAcct,   debit: 0,          credit: prixTotal },  // C Variation
    ]
  } else {
    // Vente : déstockage au CMUP (et non au prix de vente)
    return [
      { compte: varAcct,   debit: coutSortie, credit: 0 },          // D Variation
      { compte: stockAcct, debit: 0,          credit: coutSortie }, // C Stock
    ]
  }
}

// ── Comptabilisation d'une facture de VENTE ──────────────────────────────────

export async function postSaleInvoice(companyId: string, invoiceId: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({
    where:   { id: invoiceId, companyId },
    include: { client: true, lines: { include: { article: true } } },
  })
  if (!invoice) throw new AppError('Facture introuvable', 404, 'NOT_FOUND')
  if (invoice.posted)
    throw new AppError(
      `Facture ${invoice.reference} déjà comptabilisée le ${invoice.postedAt?.toISOString().slice(0,10)} (pièce ${invoice.postedPieceId}).`,
      400, 'ALREADY_POSTED',
    )

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId }, select: { accountingZone: true },
  })
  const def = defaultAccounts(company.accountingZone)

  // 1. Compte client : auto-génération si absent
  let clientAccount = invoice.client.accountingCode
  if (!clientAccount?.trim()) {
    // Auto-génération : 411 + 6 premiers caractères du nom (alphanumériques)
    const slug = invoice.client.nom.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'CLIENT'
    clientAccount = `411${slug}`
    await prisma.client.update({ where: { id: invoice.clientId }, data: { accountingCode: clientAccount } })
  }
  clientAccount = await ensureAccountInPlan(companyId, clientAccount, `Client ${invoice.client.nom}`)

  // 2. Comptes de produits — priorité : ligne > article > défaut zone (706)
  const productGroups = new Map<string, number>()  // compteVente → Σ montantHT
  for (const line of invoice.lines) {
    const compte = line.compteVente?.trim()
                ?? line.article?.compteVente?.trim()
                ?? def.produit
    const acct   = await ensureAccountInPlan(companyId, compte, 'Produits — ventes')
    productGroups.set(acct, (productGroups.get(acct) ?? 0) + Number(line.montantHT))
  }

  // 3. TVA collectée
  const taxAmt = Number(invoice.taxAmount)
  const tvaAcct = taxAmt > 0
    ? await ensureAccountInPlan(companyId, def.tvaCollectee, 'TVA collectée')
    : null

  // 4. Exercice et date — vérif initiale (early-fail si pas de FY)
  const fyId = await findOrThrowFiscalYear(companyId, invoice.issuedAt)

  // 5. Création de la pièce dans le journal VTE
  const pieceId = `INV-${invoice.reference}-${Date.now().toString(36)}`
  const reference = `FA-${invoice.reference}`
  const lines: Prisma.JournalEntryCreateManyInput[] = [
    {
      companyId, fiscalYearId: fyId, date: invoice.issuedAt,
      journal:   def.journalVente,
      pieceId,
      compte:    clientAccount,
      libelle:   `Vente ${invoice.reference} — ${invoice.client.nom}`,
      debit:     Number(invoice.amountTTC),
      credit:    0,
      reference, createdBy: userId,
    },
    ...Array.from(productGroups.entries()).map(([acct, amount]) => ({
      companyId, fiscalYearId: fyId, date: invoice.issuedAt,
      journal:   def.journalVente,
      pieceId,
      compte:    acct,
      libelle:   `Vente ${invoice.reference} — ${invoice.client.nom}`,
      debit:     0,
      credit:    amount,
      reference, createdBy: userId,
    })),
  ]
  if (taxAmt > 0 && tvaAcct) {
    lines.push({
      companyId, fiscalYearId: fyId, date: invoice.issuedAt,
      journal:   def.journalVente,
      pieceId,
      compte:    tvaAcct,
      libelle:   `TVA collectée ${invoice.reference}`,
      debit:     0,
      credit:    taxAmt,
      reference, createdBy: userId,
    })
  }

  // Vérif équilibre D=C (avant ajout des écritures de stock — qui sont elles-mêmes équilibrées)
  const sumD = lines.reduce((s, l) => s + Number(l.debit  ?? 0), 0)
  const sumC = lines.reduce((s, l) => s + Number(l.credit ?? 0), 0)
  if (Math.abs(sumD - sumC) > 0.01) {
    throw new AppError(
      `Déséquilibre interne facture ${invoice.reference} : D=${sumD.toFixed(2)} ≠ C=${sumC.toFixed(2)}`,
      500, 'POSTING_IMBALANCE',
    )
  }

  // 6. Transaction : pièce comptable + mouvements de stock + lignes de variation
  let stockMovements = 0
  await prisma.$transaction(async (tx) => {
    // B11 : re-vérifier dans la transaction que l'exercice n'a pas été clôturé
    //       entre l'early-check et l'écriture (course avec admin closeFiscalYear).
    await findOrThrowFiscalYear(companyId, invoice.issuedAt, tx)

    // Lignes principales (D 411 / C 7xx / C 4431)
    await tx.journalEntry.createMany({ data: lines })

    // Pour chaque ligne avec article : mouvement stock + écritures variation
    for (const line of invoice.lines) {
      if (!line.articleId) continue
      const stockLines = await generateStockEntry(
        tx, companyId, line.articleId,
        'SORTIE_VENTE',
        Number(line.quantite),
        Number(line.prixUnitaireHT),
        reference,
        `Vente ${invoice.reference} — ${line.description}`,
        userId,
      )
      if (stockLines.length > 0) {
        // Ajoute les écritures de variation dans la même pièce
        await tx.journalEntry.createMany({
          data: stockLines.map(sl => ({
            companyId, fiscalYearId: fyId, date: invoice.issuedAt,
            journal: def.journalVente,
            pieceId,
            compte: sl.compte,
            libelle: `Déstockage vente ${invoice.reference} — ${line.description}`,
            debit:  sl.debit,
            credit: sl.credit,
            reference, createdBy: userId,
          })),
        })
        stockMovements++
      }
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { posted: true, postedPieceId: pieceId, postedAt: new Date() },
    })
  })

  return { pieceId, reference, clientAccount, lines: lines.length, stockMovements }
}

// ── Comptabilisation d'une commande d'ACHAT ──────────────────────────────────

export async function postPurchaseOrder(companyId: string, orderId: string, userId: string) {
  const order = await prisma.purchaseOrder.findFirst({
    where:   { id: orderId, companyId },
    include: { lines: { include: { article: true } } },
  })
  if (!order) throw new AppError('Commande introuvable', 404, 'NOT_FOUND')
  if (order.posted)
    throw new AppError(
      `Commande ${order.reference} déjà comptabilisée le ${order.postedAt?.toISOString().slice(0,10)} (pièce ${order.postedPieceId}).`,
      400, 'ALREADY_POSTED',
    )

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId }, select: { accountingZone: true },
  })
  const def = defaultAccounts(company.accountingZone)

  // 1. Compte fournisseur : auto-génération si absent
  let supplierAccount = order.supplierAccount
  if (!supplierAccount?.trim()) {
    const slug = order.fournisseur.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'FOURN'
    supplierAccount = `401${slug}`
    await prisma.purchaseOrder.update({ where: { id: order.id }, data: { supplierAccount } })
  }
  supplierAccount = await ensureAccountInPlan(companyId, supplierAccount, `Fournisseur ${order.fournisseur}`)

  // 2. Comptes de charges — priorité : ligne > article > défaut zone (604)
  const chargeGroups = new Map<string, number>()
  for (const line of order.lines) {
    const compte = line.compteAchat?.trim()
                ?? line.article?.compteAchat?.trim()
                ?? def.charge
    const acct   = await ensureAccountInPlan(companyId, compte, 'Achats — charges')
    chargeGroups.set(acct, (chargeGroups.get(acct) ?? 0) + Number(line.montantHT))
  }

  // 3. TVA déductible
  const taxAmt = Number(order.montantTTC) - Number(order.montantHT)
  const tvaAcct = taxAmt > 0
    ? await ensureAccountInPlan(companyId, def.tvaDeductible, 'TVA déductible')
    : null

  // 4. Exercice et date
  const fyId = await findOrThrowFiscalYear(companyId, order.date)

  // 5. Création de la pièce dans le journal ACH
  const pieceId = `PO-${order.reference}-${Date.now().toString(36)}`
  const reference = `FA-${order.reference}`
  const lines: Prisma.JournalEntryCreateManyInput[] = [
    ...Array.from(chargeGroups.entries()).map(([acct, amount]) => ({
      companyId, fiscalYearId: fyId, date: order.date,
      journal:   def.journalAchat,
      pieceId,
      compte:    acct,
      libelle:   `Achat ${order.reference} — ${order.fournisseur}`,
      debit:     amount,
      credit:    0,
      reference, createdBy: userId,
    })),
  ]
  if (taxAmt > 0 && tvaAcct) {
    lines.push({
      companyId, fiscalYearId: fyId, date: order.date,
      journal:   def.journalAchat,
      pieceId,
      compte:    tvaAcct,
      libelle:   `TVA déductible ${order.reference}`,
      debit:     taxAmt,
      credit:    0,
      reference, createdBy: userId,
    })
  }
  lines.push({
    companyId, fiscalYearId: fyId, date: order.date,
    journal:   def.journalAchat,
    pieceId,
    compte:    supplierAccount,
    libelle:   `Achat ${order.reference} — ${order.fournisseur}`,
    debit:     0,
    credit:    Number(order.montantTTC),
    reference, createdBy: userId,
  })

  const sumD = lines.reduce((s, l) => s + Number(l.debit  ?? 0), 0)
  const sumC = lines.reduce((s, l) => s + Number(l.credit ?? 0), 0)
  if (Math.abs(sumD - sumC) > 0.01) {
    throw new AppError(
      `Déséquilibre interne commande ${order.reference} : D=${sumD.toFixed(2)} ≠ C=${sumC.toFixed(2)}`,
      500, 'POSTING_IMBALANCE',
    )
  }

  let stockMovements = 0
  await prisma.$transaction(async (tx) => {
    // B11 : re-vérifier que l'exercice n'a pas été clôturé entre-temps.
    await findOrThrowFiscalYear(companyId, order.date, tx)

    // Lignes principales (D 6xx / D 4452 / C 401)
    await tx.journalEntry.createMany({ data: lines })

    // Mouvements de stock + écritures de variation pour chaque article
    for (const line of order.lines) {
      if (!line.articleId) continue
      const stockLines = await generateStockEntry(
        tx, companyId, line.articleId,
        'ENTREE_ACHAT',
        Number(line.quantite),
        Number(line.prixUnitaireHT),
        reference,
        `Achat ${order.reference} — ${line.designation}`,
        userId,
      )
      if (stockLines.length > 0) {
        await tx.journalEntry.createMany({
          data: stockLines.map(sl => ({
            companyId, fiscalYearId: fyId, date: order.date,
            journal: def.journalAchat,
            pieceId,
            compte: sl.compte,
            libelle: `Mise en stock achat ${order.reference} — ${line.designation}`,
            debit:  sl.debit,
            credit: sl.credit,
            reference, createdBy: userId,
          })),
        })
        stockMovements++
      }
    }

    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { posted: true, postedPieceId: pieceId, postedAt: new Date() },
    })
  })

  return { pieceId, reference, supplierAccount, lines: lines.length, stockMovements }
}

// ── Annulation de comptabilisation (extourne) ─────────────────────────────────

/**
 * B7 : Réinverse les mouvements de stock créés pour la pièce de référence.
 *      Crée des mouvements compensatoires (AJUSTEMENT) et restaure les
 *      stockActuel/valeurCmup des articles concernés.
 *
 *      Approche : recalculer le stock à partir du SORTIE_VENTE / ENTREE_ACHAT
 *      d'origine. Pour conserver l'historique, on insère un mouvement
 *      AJUSTEMENT inverse plutôt que de supprimer.
 */
async function reverseStockMovementsForPiece(
  tx: Prisma.TransactionClient,
  companyId: string,
  reference: string,
  reason: string,
  userId: string,
): Promise<number> {
  const mouvements = await tx.stockMouvement.findMany({
    where: { companyId, reference },
    orderBy: { createdAt: 'desc' },
  })
  for (const m of mouvements) {
    // Verrou article pour éviter race avec d'autres opérations concurrentes
    await tx.$executeRaw`SELECT id FROM articles WHERE id = ${m.articleId} AND company_id = ${companyId} FOR UPDATE`
    const article = await tx.article.findFirst({ where: { id: m.articleId, companyId } })
    if (!article) continue

    const stockAvant = Number(article.stockActuel)
    const cmupAvant  = Number(article.valeurCmup)
    const qte        = Number(m.quantite)
    const isEntree   = m.type === 'ENTREE_ACHAT' || m.type === 'ENTREE_RETOUR' || m.type === 'ENTREE_INVENTAIRE'

    // Inverse la quantité (sortie devient entrée et vice-versa)
    const delta = isEntree ? -qte : qte
    const stockApres = stockAvant + delta
    const cmupApres  = cmupAvant  // CMUP inchangé sur réinversion

    await tx.stockMouvement.create({
      data: {
        companyId,
        articleId:   m.articleId,
        type:        'AJUSTEMENT',
        quantite:    qte,
        prixUnitaire: m.prixUnitaire,
        prixTotal:    m.prixTotal,
        stockAvant, stockApres,
        cmupAvant,  cmupApres,
        reference:   `${reference}-INV`,
        description: `Réinversion ${reason} — ${m.description ?? ''}`,
        createdBy:   userId,
      },
    })
    await tx.article.update({
      where: { id: m.articleId },
      data:  { stockActuel: stockApres, valeurCmup: cmupApres },
    })
  }
  return mouvements.length
}

/** Supprime la pièce comptable, réinverse les mouvements de stock, et
 *  réinitialise les flags posted. */
export async function unpostSaleInvoice(companyId: string, invoiceId: string, userId: string = 'system') {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } })
  if (!inv) throw new AppError('Facture introuvable', 404, 'NOT_FOUND')
  if (!inv.posted || !inv.postedPieceId)
    throw new AppError('Facture non comptabilisée', 400, 'NOT_POSTED')

  let stockReversed = 0
  await prisma.$transaction(async (tx) => {
    await tx.journalEntry.deleteMany({ where: { companyId, pieceId: inv.postedPieceId! } })
    // B7 : réinverser les mouvements de stock créés pour cette vente.
    //      Le `reference` utilisé au posting est `FA-${invoice.reference}`.
    stockReversed = await reverseStockMovementsForPiece(
      tx, companyId, `FA-${inv.reference}`, `annulation vente ${inv.reference}`, userId,
    )
    await tx.invoice.update({
      where: { id: inv.id },
      data: { posted: false, postedPieceId: null, postedAt: null },
    })
  })
  return { unposted: 1, stockReversed }
}

export async function unpostPurchaseOrder(companyId: string, orderId: string, userId: string = 'system') {
  const o = await prisma.purchaseOrder.findFirst({ where: { id: orderId, companyId } })
  if (!o) throw new AppError('Commande introuvable', 404, 'NOT_FOUND')
  if (!o.posted || !o.postedPieceId)
    throw new AppError('Commande non comptabilisée', 400, 'NOT_POSTED')

  let stockReversed = 0
  await prisma.$transaction(async (tx) => {
    await tx.journalEntry.deleteMany({ where: { companyId, pieceId: o.postedPieceId! } })
    // B7 : réinverser les entrées en stock créées pour cet achat.
    stockReversed = await reverseStockMovementsForPiece(
      tx, companyId, `FA-${o.reference}`, `annulation achat ${o.reference}`, userId,
    )
    await tx.purchaseOrder.update({
      where: { id: o.id },
      data: { posted: false, postedPieceId: null, postedAt: null },
    })
  })
  return { unposted: 1, stockReversed }
}
