import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

type Zone = 'FRANCE' | 'OHADA' | 'IFRS'

interface Pair { n: number; nm1: number }

async function aggregateAccounts(
  companyId: string,
  fiscalYearId: string,
): Promise<Map<string, { debit: number; credit: number }>> {
  const entries = await prisma.journalEntry.findMany({
    where: { companyId, fiscalYearId },
    select: { compte: true, debit: true, credit: true },
  })
  const totals = new Map<string, { debit: number; credit: number }>()
  for (const e of entries) {
    const cur = totals.get(e.compte) ?? { debit: 0, credit: 0 }
    cur.debit  += Number(e.debit)
    cur.credit += Number(e.credit)
    totals.set(e.compte, cur)
  }
  return totals
}

// Sum accounts whose numbers start with any of the given prefixes.
// isActif=true  → solde débiteur (debit - credit), clamped to ≥ 0
// isActif=false → solde créditeur (credit - debit), clamped to ≥ 0
function sum(
  totals: Map<string, { debit: number; credit: number }>,
  prefixes: string[],
  isActif = true,
): number {
  let s = 0
  for (const [acc, { debit, credit }] of totals) {
    if (prefixes.some((p) => acc.startsWith(p))) {
      s += isActif ? debit - credit : credit - debit
    }
  }
  return Math.max(0, s)
}

// Signed sum — does NOT clamp to 0 (for results that can be negative)
function sumSigned(
  totals: Map<string, { debit: number; credit: number }>,
  prefixes: string[],
  isActif = true,
): number {
  let s = 0
  for (const [acc, { debit, credit }] of totals) {
    if (prefixes.some((p) => acc.startsWith(p))) {
      s += isActif ? debit - credit : credit - debit
    }
  }
  return s
}

function pair(
  nMap:   Map<string, { debit: number; credit: number }>,
  nm1Map: Map<string, { debit: number; credit: number }>,
  prefixes: string[],
  isActif = true,
): Pair {
  return { n: sum(nMap, prefixes, isActif), nm1: sum(nm1Map, prefixes, isActif) }
}

function pairSigned(
  nMap:   Map<string, { debit: number; credit: number }>,
  nm1Map: Map<string, { debit: number; credit: number }>,
  prefixes: string[],
  isActif = true,
): Pair {
  return { n: sumSigned(nMap, prefixes, isActif), nm1: sumSigned(nm1Map, prefixes, isActif) }
}

// ── France PCG ────────────────────────────────────────────────────────────────

function buildFrance(
  n:   Map<string, { debit: number; credit: number }>,
  nm1: Map<string, { debit: number; credit: number }>,
) {
  const p  = (prefixes: string[], isActif = true) => pair(n, nm1, prefixes, isActif)
  const ps = (prefixes: string[], isActif = true) => pairSigned(n, nm1, prefixes, isActif)

  // ── Compte de résultat (calculé EN PREMIER pour alimenter le passif) ──────
  const ventes        = p(['70'], false)
  const autresProd    = p(['71', '72', '73', '74', '75'], false)
  const prodFin       = p(['76'], false)
  const prodExcep     = p(['77'], false)
  const repriseProv   = p(['78', '79'], false)
  const totalProduits: Pair = {
    n:   ventes.n + autresProd.n + prodFin.n + prodExcep.n + repriseProv.n,
    nm1: ventes.nm1 + autresProd.nm1 + prodFin.nm1 + prodExcep.nm1 + repriseProv.nm1,
  }

  const achatsMarc    = p(['607'], true)
  const autresAchats  = p(['60', '61', '62'], true)
  const impotsTaxes   = p(['63'], true)
  const chargesPerso  = p(['64'], true)
  const dotations     = p(['68'], true)
  const autresCharges = p(['65'], true)
  const chargesFin    = p(['66'], true)
  const chargesExcep  = p(['67'], true)
  const is            = p(['69'], true)
  const totalCharges: Pair = {
    n:   achatsMarc.n + autresAchats.n + impotsTaxes.n + chargesPerso.n + dotations.n
       + autresCharges.n + chargesFin.n + chargesExcep.n + is.n,
    nm1: achatsMarc.nm1 + autresAchats.nm1 + impotsTaxes.nm1 + chargesPerso.nm1 + dotations.nm1
       + autresCharges.nm1 + chargesFin.nm1 + chargesExcep.nm1 + is.nm1,
  }
  // Résultat calculé depuis le P&L (signé — peut être négatif)
  const resultatNet: Pair = {
    n:   totalProduits.n - totalCharges.n,
    nm1: totalProduits.nm1 - totalCharges.nm1,
  }

  // ── Bilan — Actif ─────────────────────────────────────────────────────────
  const immIncorp       = p(['20', '21'], true)
  const immCorp         = p(['22', '23', '24', '25'], true)
  const immFin          = p(['26', '27'], true)
  const stocks          = p(['31', '32', '33', '34', '35', '36', '37', '38'], true)
  const creancesCli     = p(['411'], true)
  const autresCreances  = p(['409', '421', '425', '431', '437', '441', '445', '446', '447', '448', '449', '486', '487', '488'], true)
  const tresorerie      = p(['51', '52', '53', '54', '58'], true)
  const totalActifImmo: Pair = {
    n:   immIncorp.n + immCorp.n + immFin.n,
    nm1: immIncorp.nm1 + immCorp.nm1 + immFin.nm1,
  }
  const totalActifCirc: Pair = {
    n:   stocks.n + creancesCli.n + autresCreances.n + tresorerie.n,
    nm1: stocks.nm1 + creancesCli.nm1 + autresCreances.nm1 + tresorerie.nm1,
  }
  const totalActif: Pair = {
    n:   totalActifImmo.n + totalActifCirc.n,
    nm1: totalActifImmo.nm1 + totalActifCirc.nm1,
  }

  // ── Bilan — Passif ────────────────────────────────────────────────────────
  const capital       = p(['101', '102', '103', '104', '105', '106'], false)
  const reserves      = p(['11'], false)
  const reportANouv   = ps(['119', '129'], false)  // peut être négatif (report débiteur)
  // Résultat = résultat calculé du P&L (pas compte 12 non alimenté en cours d'exercice)
  const resultatEx    = resultatNet
  const provisions    = p(['14', '15'], false)
  const emprunts      = p(['16'], false)
  const dettesF       = p(['401'], false)
  const dettesFisSoc  = p(['421', '422', '423', '424', '425', '426', '427', '428',
                            '431', '437', '438', '441', '442', '443', '444', '445', '447', '448'], false)
  const autresDettes  = p(['40', '45', '46', '47', '48'], false)
  const totalCP: Pair = {
    n:   capital.n + reserves.n + reportANouv.n + resultatEx.n,
    nm1: capital.nm1 + reserves.nm1 + reportANouv.nm1 + resultatEx.nm1,
  }
  const totalDettes: Pair = {
    n:   emprunts.n + dettesF.n + dettesFisSoc.n + autresDettes.n,
    nm1: emprunts.nm1 + dettesF.nm1 + dettesFisSoc.nm1 + autresDettes.nm1,
  }
  const totalPassif: Pair = {
    n:   totalCP.n + provisions.n + totalDettes.n,
    nm1: totalCP.nm1 + provisions.nm1 + totalDettes.nm1,
  }

  // ── SIG France ───────────────────────────────────────────────────────────
  const resultatExpl: Pair = {
    n:   ventes.n + autresProd.n - achatsMarc.n - autresAchats.n - impotsTaxes.n - chargesPerso.n - dotations.n - autresCharges.n,
    nm1: ventes.nm1 + autresProd.nm1 - achatsMarc.nm1 - autresAchats.nm1 - impotsTaxes.nm1 - chargesPerso.nm1 - dotations.nm1 - autresCharges.nm1,
  }
  const resultatFin: Pair = {
    n:   prodFin.n - chargesFin.n,
    nm1: prodFin.nm1 - chargesFin.nm1,
  }
  const resultatCourant: Pair = {
    n:   resultatExpl.n + resultatFin.n,
    nm1: resultatExpl.nm1 + resultatFin.nm1,
  }

  return {
    bilan: {
      actif: {
        immobilisationsIncorporelles: immIncorp,
        immobilisationsCorporelles:   immCorp,
        immobilisationsFinancieres:   immFin,
        totalActifImmobilise:         totalActifImmo,
        stocks,
        creancesClients:              creancesCli,
        autresCreances,
        tresorerie,
        totalActifCirculant:          totalActifCirc,
        totalActif,
      },
      passif: {
        capital,
        reserves,
        reportANouveau:               reportANouv,
        resultatExercice:             resultatEx,
        totalCapitauxPropres:         totalCP,
        provisions,
        emprunts,
        dettesFournisseurs:           dettesF,
        dettesFiscalesSociales:       dettesFisSoc,
        autresDettes,
        totalDettes,
        totalPassif,
      },
    },
    compteDeResultat: {
      produits: {
        ventesEtProductions:           ventes,
        autresProduits:                autresProd,
        produitsFinanciers:            prodFin,
        produitsExceptionnels:         prodExcep,
        reprisesSurProvisions:         repriseProv,
        totalProduits,
      },
      charges: {
        achatsMarchandises:            achatsMarc,
        autresAchats,
        impotsTaxes,
        chargesPersonnel:              chargesPerso,
        dotationsAmortissements:       dotations,
        autresCharges,
        chargesFinancieres:            chargesFin,
        chargesExceptionnelles:        chargesExcep,
        impotBenefices:                is,
        totalCharges,
      },
      resultatExploitation:            resultatExpl,
      resultatFinancier:               resultatFin,
      resultatCourant,
      resultatNet,
    },
  }
}

// ── OHADA SYSCOHADA révisé ────────────────────────────────────────────────────

function buildOhada(
  n:   Map<string, { debit: number; credit: number }>,
  nm1: Map<string, { debit: number; credit: number }>,
) {
  const p  = (prefixes: string[], isActif = true) => pair(n, nm1, prefixes, isActif)
  const ps = (prefixes: string[], isActif = true) => pairSigned(n, nm1, prefixes, isActif)

  // ── Compte de résultat par nature (calculé EN PREMIER) ───────────────────
  const ventes          = p(['70'], false)
  const productionVend  = p(['71', '72'], false)
  const autresProd      = p(['73', '74', '75'], false)
  const prodFin         = p(['77'], false)
  const repriseProv     = p(['78'], false)
  const transferts      = p(['79'], false)
  const totalProd: Pair = {
    n:   ventes.n + productionVend.n + autresProd.n + prodFin.n + repriseProv.n + transferts.n,
    nm1: ventes.nm1 + productionVend.nm1 + autresProd.nm1 + prodFin.nm1 + repriseProv.nm1 + transferts.nm1,
  }

  const achats          = p(['60', '61'], true)
  const autresAchats    = p(['62'], true)
  const transports      = p(['63'], true)
  const impTaxes        = p(['64'], true)
  const chargesPerso    = p(['66'], true)
  const autresCharges   = p(['65'], true)
  const dotations       = p(['68'], true)
  const chargesFin      = p(['67'], true)
  const chargesHAO      = p(['83'], true)
  const participation   = p(['87'], true)
  const is              = p(['89'], true)
  const totalCharges: Pair = {
    n:   achats.n + autresAchats.n + transports.n + impTaxes.n + chargesPerso.n
       + autresCharges.n + dotations.n + chargesFin.n + chargesHAO.n + participation.n + is.n,
    nm1: achats.nm1 + autresAchats.nm1 + transports.nm1 + impTaxes.nm1 + chargesPerso.nm1
       + autresCharges.nm1 + dotations.nm1 + chargesFin.nm1 + chargesHAO.nm1 + participation.nm1 + is.nm1,
  }
  // Résultat net signé — calculé depuis le P&L (pas compte 13 non alimenté en cours d'exercice)
  const resultatPL: Pair = {
    n:   totalProd.n - totalCharges.n,
    nm1: totalProd.nm1 - totalCharges.nm1,
  }

  // ── SIG (Soldes Intermédiaires de Gestion) ─────────────────────────────
  const margeComm: Pair = {
    n:   ventes.n - achats.n,
    nm1: ventes.nm1 - achats.nm1,
  }
  const valeurAjoutee: Pair = {
    n:   margeComm.n + productionVend.n + autresProd.n - autresAchats.n - transports.n,
    nm1: margeComm.nm1 + productionVend.nm1 + autresProd.nm1 - autresAchats.nm1 - transports.nm1,
  }
  const ebe: Pair = {
    n:   valeurAjoutee.n - chargesPerso.n - impTaxes.n,
    nm1: valeurAjoutee.nm1 - chargesPerso.nm1 - impTaxes.nm1,
  }
  const resultatExpl: Pair = {
    n:   ebe.n - dotations.n + repriseProv.n + transferts.n - autresCharges.n,
    nm1: ebe.nm1 - dotations.nm1 + repriseProv.nm1 + transferts.nm1 - autresCharges.nm1,
  }
  const resultatFin: Pair = {
    n:   prodFin.n - chargesFin.n,
    nm1: prodFin.nm1 - chargesFin.nm1,
  }
  const resultatAO: Pair = {
    n:   resultatExpl.n + resultatFin.n,
    nm1: resultatExpl.nm1 + resultatFin.nm1,
  }

  // ── Bilan — Actif ─────────────────────────────────────────────────────────
  const chargesImm    = p(['20'], true)
  const immIncorp     = p(['21'], true)
  const terrains      = p(['22'], true)
  const batiments     = p(['23'], true)
  const matEquip      = p(['24'], true)
  const matTransp     = p(['25'], true)
  const avancesImm    = p(['26'], true)
  const autresImm     = p(['27'], true)
  const totalActifImmo: Pair = {
    n:   chargesImm.n + immIncorp.n + terrains.n + batiments.n + matEquip.n + matTransp.n + avancesImm.n + autresImm.n,
    nm1: chargesImm.nm1 + immIncorp.nm1 + terrains.nm1 + batiments.nm1 + matEquip.nm1 + matTransp.nm1 + avancesImm.nm1 + autresImm.nm1,
  }

  const stocksMarch   = p(['31'], true)
  const stocksMP      = p(['32'], true)
  const encoursProd   = p(['33', '34'], true)
  const stocksProdF   = p(['35'], true)
  const avanceFourn   = p(['409'], true)
  const creancesCli   = p(['41'], true)
  const autresCre     = p(['42', '43', '44', '45', '46', '47', '48'], true)
  const totalActifCirc: Pair = {
    n:   stocksMarch.n + stocksMP.n + encoursProd.n + stocksProdF.n + avanceFourn.n + creancesCli.n + autresCre.n,
    nm1: stocksMarch.nm1 + stocksMP.nm1 + encoursProd.nm1 + stocksProdF.nm1 + avanceFourn.nm1 + creancesCli.nm1 + autresCre.nm1,
  }

  const titresPlac    = p(['50'], true)
  const valEncaiss    = p(['51'], true)
  const banques       = p(['52', '53', '54', '55', '56', '57', '58'], true)
  const totalTresos: Pair = {
    n:   titresPlac.n + valEncaiss.n + banques.n,
    nm1: titresPlac.nm1 + valEncaiss.nm1 + banques.nm1,
  }

  const totalActif: Pair = {
    n:   totalActifImmo.n + totalActifCirc.n + totalTresos.n,
    nm1: totalActifImmo.nm1 + totalActifCirc.nm1 + totalTresos.nm1,
  }

  // ── Bilan — Passif ────────────────────────────────────────────────────────
  const capitalSoc    = p(['101', '102', '103', '104'], false)
  const primes        = p(['105', '106'], false)
  // Réserves : comptes 111-118 uniquement (hors report à nouveau 110/119)
  const reserves      = p(['111', '112', '113', '114', '115', '116', '117', '118'], false)
  // Report à nouveau : 110 (créditeur) + 119 (débiteur) — signés
  // compte 110 → créditeur normal (bénéfice reporté) → positif
  // compte 119 → débiteur normal (perte reportée) → négatif
  const reportAN      = ps(['110', '119', '129'], false)
  // Résultat net = résultat calculé P&L (pas compte 13)
  const resultatNet   = resultatPL
  const subvInv       = p(['14'], false)
  const provRegl      = p(['15'], false)
  const totalCP: Pair = {
    n:   capitalSoc.n + primes.n + reserves.n + reportAN.n + resultatNet.n + subvInv.n + provRegl.n,
    nm1: capitalSoc.nm1 + primes.nm1 + reserves.nm1 + reportAN.nm1 + resultatNet.nm1 + subvInv.nm1 + provRegl.nm1,
  }

  const empLT         = p(['16'], false)
  const dettesLocAcq  = p(['17'], false)
  const provrCh       = p(['19'], false)
  const totalDettFin: Pair = {
    n:   empLT.n + dettesLocAcq.n + provrCh.n,
    nm1: empLT.nm1 + dettesLocAcq.nm1 + provrCh.nm1,
  }
  const totalResStables: Pair = {
    n:   totalCP.n + totalDettFin.n,
    nm1: totalCP.nm1 + totalDettFin.nm1,
  }

  const avancesRec    = p(['419'], false)
  const dettesFourn   = p(['401', '402', '403', '404', '405', '408'], false)
  const dettesFisSoc  = p(['42', '43', '44', '45', '46', '47', '48'], false)
  const totalPassifCirc: Pair = {
    n:   avancesRec.n + dettesFourn.n + dettesFisSoc.n,
    nm1: avancesRec.nm1 + dettesFourn.nm1 + dettesFisSoc.nm1,
  }

  // Trésorerie-Passif (SYSCOHADA B7) : soldes créditeurs des comptes de trésorerie
  // = découverts bancaires, crédits de trésorerie (comptes 50-58 en position créditrice)
  const tresoCredits  = p(['50', '51', '52', '53', '54', '55', '56', '57', '58'], false)
  const totalTresoPassif: Pair = {
    n:   tresoCredits.n,
    nm1: tresoCredits.nm1,
  }

  const totalPassif: Pair = {
    n:   totalResStables.n + totalPassifCirc.n + totalTresoPassif.n,
    nm1: totalResStables.nm1 + totalPassifCirc.nm1 + totalTresoPassif.nm1,
  }

  // ── TAFIRE ────────────────────────────────────────────────────────────────
  const cafBrute: Pair = {
    n:   resultatPL.n + dotations.n,
    nm1: resultatPL.nm1 + dotations.nm1,
  }
  const variStocks: Pair = {
    n:   (stocksMarch.n + stocksMP.n) - (stocksMarch.nm1 + stocksMP.nm1),
    nm1: 0,
  }
  const fluxExpl: Pair = {
    n:   cafBrute.n - variStocks.n,
    nm1: cafBrute.nm1,
  }
  const invest: Pair = {
    n:   -(totalActifImmo.n - totalActifImmo.nm1),
    nm1: 0,
  }
  const financement: Pair = {
    n:   empLT.n - empLT.nm1,
    nm1: 0,
  }
  const variTreso: Pair = {
    n:   totalTresos.n - totalTresos.nm1,
    nm1: 0,
  }

  return {
    bilan: {
      actif: {
        chargesImmobilisees:          chargesImm,
        immobilisationsIncorporelles: immIncorp,
        terrains,
        batimentsAgencements:         batiments,
        materielEquipement:           matEquip,
        materielTransport:            matTransp,
        avancesAcomptesImmo:          avancesImm,
        autresImmobilisations:        autresImm,
        totalActifImmobilise:         totalActifImmo,
        stocksMarchandises:           stocksMarch,
        stocksMatieresPremiere:       stocksMP,
        encoursProduction:            encoursProd,
        stocksProduitsFinis:          stocksProdF,
        avancesFournisseurs:          avanceFourn,
        creancesClients:              creancesCli,
        autresCreances:               autresCre,
        totalActifCirculant:          totalActifCirc,
        titresPlacement:              titresPlac,
        valeursEncaissement:          valEncaiss,
        banquesCaisse:                banques,
        totalTresorerie:              totalTresos,
        totalActif,
      },
      passif: {
        capitalSocial:                capitalSoc,
        primesReserves:               primes,
        reserves,
        reportANouveau:               reportAN,
        resultatNet,
        subventionsInvestissement:    subvInv,
        provisionsReglementees:       provRegl,
        totalCapitauxPropres:         totalCP,
        empruntsDettesFin:            empLT,
        dettesLocationAcquisition:    dettesLocAcq,
        provisionsRisquesCharges:     provrCh,
        totalDettesFinancieres:       totalDettFin,
        totalRessourcesStables:       totalResStables,
        avancesRecues:                avancesRec,
        dettesFournisseurs:           dettesFourn,
        dettesFiscalesSociales:       dettesFisSoc,
        totalPassifCirculant:         totalPassifCirc,
        tresoBanquesPassif:           tresoCredits,
        totalTresoreriePassif:        totalTresoPassif,
        totalPassif,
      },
    },
    compteDeResultat: {
      produits: {
        chiffreAffaires:              ventes,
        productionVendue:             productionVend,
        autresProduits:               autresProd,
        produitsFinanciers:           prodFin,
        reprisesProvisions:           repriseProv,
        transfertsCharges:            transferts,
        totalProduits:                totalProd,
      },
      charges: {
        achatsConsommes:              achats,
        autresAchats,
        transports,
        impotsTaxes:                  impTaxes,
        chargesPersonnel:             chargesPerso,
        autresCharges,
        dotations,
        chargesFinancieres:           chargesFin,
        chargesHAO,
        participation,
        impotResultat:                is,
        totalCharges,
      },
      // SIG
      margeCommerciale:               margeComm,
      valeurAjoutee,
      ebe,
      resultatExploitation:           resultatExpl,
      resultatFinancier:              resultatFin,
      resultatAO,
      resultat:                       resultatPL,
    },
    tafire: {
      cafBrute,
      variationStocks:                variStocks,
      fluxExploitation:               fluxExpl,
      investissements:                invest,
      financements:                   financement,
      variationTresorerie:            variTreso,
    },
  }
}

// ── IFRS (IAS 1) ──────────────────────────────────────────────────────────────

function buildIfrs(
  n:   Map<string, { debit: number; credit: number }>,
  nm1: Map<string, { debit: number; credit: number }>,
) {
  const p = (prefixes: string[], isActif = true) => pair(n, nm1, prefixes, isActif)

  // P&L first
  const revenue        = p(['70'], false)
  const otherIncome    = p(['71', '72', '73', '74', '75', '76', '77', '78', '79'], false)
  const costOfSales    = p(['60', '61'], true)
  const distSelling    = p(['62', '63'], true)
  const admin          = p(['64', '65'], true)
  const financeCharges = p(['66', '67'], true)
  const incomeTax      = p(['69', '89'], true)
  const depreciation   = p(['68'], true)
  const totalExpenses: Pair = {
    n:   costOfSales.n + distSelling.n + admin.n + financeCharges.n + incomeTax.n + depreciation.n,
    nm1: costOfSales.nm1 + distSelling.nm1 + admin.nm1 + financeCharges.nm1 + incomeTax.nm1 + depreciation.nm1,
  }
  const profitForYear: Pair = {
    n:   revenue.n + otherIncome.n - totalExpenses.n,
    nm1: revenue.nm1 + otherIncome.nm1 - totalExpenses.nm1,
  }

  // Statement of Financial Position
  const ppe            = p(['21', '22', '23', '24', '25'], true)
  const intangibles    = p(['20', '26'], true)
  const investments    = p(['27'], true)
  const deferredTax    = p(['474', '477'], true)
  const totalNonCurrAssets: Pair = {
    n:   ppe.n + intangibles.n + investments.n + deferredTax.n,
    nm1: ppe.nm1 + intangibles.nm1 + investments.nm1 + deferredTax.nm1,
  }
  const inventories     = p(['31', '32', '33', '34', '35', '36', '37', '38'], true)
  const tradReceivables = p(['41'], true)
  const otherReceivables = p(['40', '42', '43', '44', '45', '46', '47', '48'], true)
  const cashEquiv       = p(['51', '52', '53'], true)
  const totalCurrAssets: Pair = {
    n:   inventories.n + tradReceivables.n + otherReceivables.n + cashEquiv.n,
    nm1: inventories.nm1 + tradReceivables.nm1 + otherReceivables.nm1 + cashEquiv.nm1,
  }
  const totalAssets: Pair = {
    n:   totalNonCurrAssets.n + totalCurrAssets.n,
    nm1: totalNonCurrAssets.nm1 + totalCurrAssets.nm1,
  }

  const shareCapital    = p(['101', '102'], false)
  const retainedEarnings = p(['11', '12'], false)
  const otherEquity     = p(['103', '104', '105', '106'], false)
  const totalEquity: Pair = {
    n:   shareCapital.n + retainedEarnings.n + otherEquity.n + profitForYear.n,
    nm1: shareCapital.nm1 + retainedEarnings.nm1 + otherEquity.nm1 + profitForYear.nm1,
  }
  const ltBorrowings    = p(['16'], false)
  const deferredTaxLiab = p(['475', '478'], false)
  const totalNonCurrLiab: Pair = {
    n:   ltBorrowings.n + deferredTaxLiab.n,
    nm1: ltBorrowings.nm1 + deferredTaxLiab.nm1,
  }
  const tradePayables   = p(['40', '401'], false)
  const otherPayables   = p(['42', '43', '44', '45', '46', '47', '48'], false)
  const totalCurrLiab: Pair = {
    n:   tradePayables.n + otherPayables.n,
    nm1: tradePayables.nm1 + otherPayables.nm1,
  }
  const totalEquityLiab: Pair = {
    n:   totalEquity.n + totalNonCurrLiab.n + totalCurrLiab.n,
    nm1: totalEquity.nm1 + totalNonCurrLiab.nm1 + totalCurrLiab.nm1,
  }

  // Cash flow (simplified indirect method)
  const operatingCF: Pair = { n: profitForYear.n + depreciation.n, nm1: profitForYear.nm1 + depreciation.nm1 }
  const investingCF: Pair = { n: -(totalNonCurrAssets.n - totalNonCurrAssets.nm1), nm1: 0 }
  const financingCF: Pair = { n: ltBorrowings.n - ltBorrowings.nm1, nm1: 0 }
  const netCash: Pair     = { n: operatingCF.n + investingCF.n + financingCF.n, nm1: 0 }

  return {
    statementOfFinancialPosition: {
      assets: {
        ppe,
        intangibleAssets:              intangibles,
        investments,
        deferredTaxAssets:             deferredTax,
        totalNonCurrentAssets:         totalNonCurrAssets,
        inventories,
        tradeAndOtherReceivables:      tradReceivables,
        otherCurrentAssets:            otherReceivables,
        cashAndEquivalents:            cashEquiv,
        totalCurrentAssets:            totalCurrAssets,
        totalAssets,
      },
      equityAndLiabilities: {
        shareCapital,
        retainedEarnings,
        otherEquity,
        totalEquity,
        borrowingsLongTerm:            ltBorrowings,
        deferredTaxLiabilities:        deferredTaxLiab,
        totalNonCurrentLiabilities:    totalNonCurrLiab,
        tradeAndOtherPayables:         tradePayables,
        otherCurrentLiabilities:       otherPayables,
        totalCurrentLiabilities:       totalCurrLiab,
        totalEquityAndLiabilities:     totalEquityLiab,
      },
    },
    statementOfProfitOrLoss: {
      revenue,
      otherIncome,
      costOfSales,
      distributionSellingExpenses:     distSelling,
      administrativeExpenses:          admin,
      financeCharges,
      depreciationAmortisation:        depreciation,
      incomeTaxExpense:                incomeTax,
      totalExpenses,
      profitForYear,
    },
    statementOfCashFlows: {
      operatingActivities:             operatingCF,
      investingActivities:             investingCF,
      financingActivities:             financingCF,
      netIncreaseInCash:               netCash,
      openingCash:                     { n: cashEquiv.nm1, nm1: 0 },
      closingCash:                     cashEquiv,
    },
    statementOfChangesInEquity: {
      openingEquity:  { n: totalEquity.nm1, nm1: 0 },
      profitForYear,
      dividendsPaid:  { n: 0, nm1: 0 },
      otherChanges:   { n: 0, nm1: 0 },
      closingEquity:  totalEquity,
    },
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function getFinancialStatements(companyId: string, fiscalYearId: string) {
  const [company, fiscalYear] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { accountingZone: true },
    }),
    prisma.fiscalYear.findUnique({
      where: { id: fiscalYearId },
      select: { id: true, year: true, status: true, companyId: true },
    }),
  ])

  if (!company) throw new AppError('Soci\xe9t\xe9 introuvable', 404, 'NOT_FOUND')
  if (!fiscalYear || fiscalYear.companyId !== companyId)
    throw new AppError('Exercice introuvable', 404, 'NOT_FOUND')

  const zone = company.accountingZone as Zone

  const prevFY = await prisma.fiscalYear.findFirst({
    where: { companyId, year: fiscalYear.year - 1 },
    select: { id: true },
  })

  const [nMap, nm1Map, entryCount] = await Promise.all([
    aggregateAccounts(companyId, fiscalYearId),
    prevFY ? aggregateAccounts(companyId, prevFY.id) : Promise.resolve(new Map<string, { debit: number; credit: number }>()),
    prisma.journalEntry.count({ where: { companyId, fiscalYearId } }),
  ])

  const statements =
    zone === 'FRANCE' ? buildFrance(nMap, nm1Map) :
    zone === 'OHADA'  ? buildOhada(nMap, nm1Map)  :
    buildIfrs(nMap, nm1Map)

  return {
    zone,
    year:        fiscalYear.year,
    prevYear:    fiscalYear.year - 1,
    status:      fiscalYear.status,
    entryCount,
    hasPrevYear: prevFY !== null,
    ...statements,
  }
}
