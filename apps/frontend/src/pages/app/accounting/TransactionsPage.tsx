import { useState, useMemo, useEffect, useRef } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { formatDate } from '@/shared/utils/date'
import { accountingApi } from '@/services/accountingApi'

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'banque' | 'caisse' | 'mobile-money'
type TxStatus   = 'a_traiter' | 'traite'
type PieceType  = 'facture' | 'recu' | 'bon_commande' | 'virement' | 'contrat' | 'autre'

interface PieceJustificative {
  id:      string
  nom:     string
  type:    PieceType
  addedAt: string
}

interface Contrepartie {
  accountCode:  string
  accountLabel: string
  libelle:      string
  addedAt:      string
}

interface Transaction {
  id:                     string
  ref:                    string   // ex: BQ-2026-042401
  date:                   string
  libelle:                string
  montant:                number
  sourceType:             SourceType
  sourceName:             string
  agence:                 string
  // Infos comptables
  journalCode:            string   // 'BQ' | 'CAI' | 'OD'
  journalLabel:           string
  accountTresorerie:      string   // ex: '521100'
  accountTresorerieLabel: string
  // Workflow
  status:                 TxStatus
  contrepartie?:          Contrepartie
  // Documents
  pieces:                 PieceJustificative[]
}

// ── Mapping compte/journal par source ─────────────────────────────────────────

const ACCOUNT_MAP: Record<string, { code: string; label: string; journalCode: string; journalLabel: string }> = {
  'BICEC — Compte courant entreprise': { code: '521100', label: 'Banque BICEC — Compte courant',      journalCode: 'BQ',  journalLabel: 'Journal de Banque'          },
  'UBA Cameroun — Compte épargne':     { code: '521200', label: 'Banque UBA — Compte épargne',         journalCode: 'BQ',  journalLabel: 'Journal de Banque'          },
  'Ecobank — Compte devises (EUR)':    { code: '521300', label: 'Ecobank — Compte devises (EUR)',       journalCode: 'BQ',  journalLabel: 'Journal de Banque'          },
  'Caisse principale':                 { code: '571000', label: 'Caisse principale (siège)',             journalCode: 'CAI', journalLabel: 'Journal de Caisse'          },
  'Petite caisse':                     { code: '571100', label: 'Petite caisse (siège)',                 journalCode: 'CAI', journalLabel: 'Journal de Caisse'          },
  'MTN Mobile Money':                  { code: '517100', label: 'Disponibilités MTN Mobile Money',      journalCode: 'OD',  journalLabel: 'Journal Opérations Diverses' },
  'Orange Money':                      { code: '517200', label: 'Disponibilités Orange Money',           journalCode: 'OD',  journalLabel: 'Journal Opérations Diverses' },
}

function accountInfo(sourceName: string) {
  return ACCOUNT_MAP[sourceName] ?? { code: '512000', label: sourceName, journalCode: 'BQ', journalLabel: 'Journal de Banque' }
}

// ── Plan comptable OHADA (contreparties fréquentes) ───────────────────────────

const COMPTES_OHADA = [
  // Classe 1
  { code: '101000', label: 'Capital social' },
  { code: '161000', label: 'Emprunts auprès des établissements de crédit' },
  { code: '162000', label: 'Dettes de location-financement' },
  // Classe 4 — Tiers
  { code: '401000', label: 'Fournisseurs' },
  { code: '401100', label: 'Fournisseurs — achats de marchandises' },
  { code: '401200', label: 'Fournisseurs — charges et services' },
  { code: '404000', label: 'Fournisseurs d\'immobilisations' },
  { code: '408000', label: 'Fournisseurs — factures non parvenues' },
  { code: '411000', label: 'Clients' },
  { code: '411100', label: 'Clients — ventes ordinaires' },
  { code: '411200', label: 'Clients — prestations de services' },
  { code: '419000', label: 'Avances et acomptes reçus sur commandes' },
  { code: '421000', label: 'Personnel — rémunérations dues' },
  { code: '422000', label: 'Personnel — avances et acomptes' },
  { code: '431000', label: 'Organismes sociaux (CNPS)' },
  { code: '441000', label: 'État — impôts et taxes à payer' },
  { code: '441100', label: 'TVA collectée' },
  { code: '441200', label: 'TVA sur importations' },
  { code: '444000', label: 'État — IS à payer' },
  { code: '445100', label: 'TVA déductible sur achats' },
  { code: '447000', label: 'Patente et autres impôts locaux' },
  { code: '451000', label: 'Groupe — opérations intra-groupe' },
  { code: '467000', label: 'Créditeurs divers' },
  { code: '471000', label: 'Comptes d\'attente — débiteurs' },
  { code: '472000', label: 'Comptes d\'attente — créditeurs' },
  // Classe 5 — Trésorerie
  { code: '517100', label: 'Disponibilités MTN Mobile Money' },
  { code: '517200', label: 'Disponibilités Orange Money' },
  { code: '521100', label: 'Banque BICEC — Compte courant' },
  { code: '521200', label: 'Banque UBA — Compte épargne' },
  { code: '521300', label: 'Ecobank — Compte devises (EUR)' },
  { code: '571000', label: 'Caisse principale (siège)' },
  { code: '571100', label: 'Petite caisse (siège)' },
  // Classe 6 — Charges
  { code: '601000', label: 'Achats de marchandises' },
  { code: '602000', label: 'Achats de matières premières' },
  { code: '604000', label: 'Achats de fournitures consommables' },
  { code: '605100', label: 'Eau, énergie, télécommunications' },
  { code: '612000', label: 'Locations et charges locatives' },
  { code: '613000', label: 'Contrats de crédit-bail' },
  { code: '614000', label: 'Charges d\'entretien et réparations' },
  { code: '615000', label: 'Primes d\'assurances' },
  { code: '621000', label: 'Personnel intérimaire et honoraires' },
  { code: '623000', label: 'Publicité, publications, relations publiques' },
  { code: '624000', label: 'Transports de biens et transports collectifs' },
  { code: '625000', label: 'Déplacements, missions et réceptions' },
  { code: '626000', label: 'Frais postaux et de télécommunications' },
  { code: '627000', label: 'Services bancaires et charges assimilées' },
  { code: '628000', label: 'Divers services extérieurs' },
  { code: '631000', label: 'Impôts, taxes et droits assimilés (directs)' },
  { code: '632000', label: 'Droits d\'enregistrement et de timbre' },
  { code: '641000', label: 'Salaires et appointements' },
  { code: '642000', label: 'Cotisations sociales employeur (CNPS)' },
  { code: '643000', label: 'Primes et gratifications' },
  { code: '661000', label: 'Charges d\'intérêts — emprunts' },
  { code: '671000', label: 'Pertes sur créances irrécouvrables' },
  { code: '673000', label: 'Charges nettes sur cessions d\'immobilisations' },
  { code: '681000', label: 'Dotations aux amortissements' },
  // Classe 7 — Produits
  { code: '701000', label: 'Ventes de marchandises' },
  { code: '702000', label: 'Ventes de produits finis' },
  { code: '706000', label: 'Prestations de services' },
  { code: '707000', label: 'Rabais, remises, ristournes accordés (−)' },
  { code: '711000', label: 'Variations de stocks' },
  { code: '721000', label: 'Production immobilisée' },
  { code: '731000', label: 'Subventions d\'exploitation reçues' },
  { code: '761000', label: 'Revenus des participations' },
  { code: '762000', label: 'Revenus des placements' },
  { code: '771000', label: 'Intérêts et produits assimilés' },
  { code: '773000', label: 'Subventions d\'équipement accordées' },
  { code: '791000', label: 'Reprises sur amortissements' },
]

// ── Données consolidées ───────────────────────────────────────────────────────

function mkTx(
  id: string, date: string, libelle: string, montant: number,
  sourceType: SourceType, sourceName: string, agence: string,
  status: TxStatus,
  pieces: PieceJustificative[],
  contrepartie?: Contrepartie,
): Transaction {
  const acc = accountInfo(sourceName)
  const datePart = date.replace(/-/g, '').slice(2)
  const ref = `${acc.journalCode}-${date.slice(0, 4)}-${datePart}`
  return { id, ref, date, libelle, montant, sourceType, sourceName, agence,
    journalCode: acc.journalCode, journalLabel: acc.journalLabel,
    accountTresorerie: acc.code, accountTresorerieLabel: acc.label,
    status, ...(contrepartie !== undefined ? { contrepartie } : {}), pieces }
}

const INIT_TRANSACTIONS: Transaction[] = [
  // ── Banque BICEC ─────────────────────────────────────────────────────────────
  mkTx('b-o1',  '2026-04-24', 'Virement reçu — ACME Corp (FAC-0041)',   8_400_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'traite',
    [{ id:'pj-b1-1', nom:'FAC-0041_ACME_CORP.pdf',      type:'facture',  addedAt:'2026-04-24T09:00:00Z' }],
    { accountCode:'411100', accountLabel:'Clients — ventes ordinaires', libelle:'Règlement FAC-0041 ACME Corp', addedAt:'2026-04-24T10:30:00Z' }),

  mkTx('b-o2',  '2026-04-22', 'Prélèvement loyer bureaux avril',        -3_200_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'traite',
    [{ id:'pj-b2-1', nom:'BAIL_COMMERCIAL_2026.pdf',    type:'contrat',  addedAt:'2026-04-01T08:00:00Z' },
     { id:'pj-b2-2', nom:'QUITTANCE_LOYER_AVR26.pdf',   type:'recu',     addedAt:'2026-04-22T08:15:00Z' }],
    { accountCode:'612000', accountLabel:'Locations et charges locatives', libelle:'Loyer bureaux — avril 2026', addedAt:'2026-04-22T09:00:00Z' }),

  mkTx('b-o3',  '2026-04-20', 'Virement reçu — TechX Sarl (FAC-0038)',  6_100_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'traite',
    [{ id:'pj-b3-1', nom:'FAC-0038_TECHX.pdf',          type:'facture',  addedAt:'2026-04-20T14:00:00Z' }],
    { accountCode:'411200', accountLabel:'Clients — prestations de services', libelle:'Règlement FAC-0038 TechX Sarl', addedAt:'2026-04-20T15:00:00Z' }),

  mkTx('b-o4',  '2026-04-18', 'Charges sociales CNPS mars',             -2_850_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'a_traiter',
    [{ id:'pj-b4-1', nom:'BORDEREAU_CNPS_MARS2026.pdf', type:'autre',    addedAt:'2026-04-18T07:30:00Z' }]),

  mkTx('b-o5',  '2026-04-15', 'Frais bancaires avril',                     -25_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'a_traiter',
    [{ id:'pj-b5-1', nom:'RELEVE_FRAIS_BICEC_AVR26.pdf',type:'recu',     addedAt:'2026-04-15T08:00:00Z' }]),

  // ── Banque UBA ────────────────────────────────────────────────────────────────
  mkTx('b-o6',  '2026-04-01', 'Intérêts trimestriels Q1 2026',             142_000, 'banque', 'UBA Cameroun — Compte épargne', 'Siège', 'traite',
    [{ id:'pj-b6-1', nom:'AVIS_INTERETS_Q1_UBA.pdf',    type:'recu',     addedAt:'2026-04-01T10:00:00Z' }],
    { accountCode:'771000', accountLabel:'Intérêts et produits assimilés', libelle:'Intérêts Q1 2026 — UBA Épargne', addedAt:'2026-04-01T11:00:00Z' }),

  mkTx('b-o7',  '2026-03-15', 'Virement depuis compte BICEC',            5_000_000, 'banque', 'UBA Cameroun — Compte épargne', 'Siège', 'traite',
    [{ id:'pj-b7-1', nom:'ORDRE_VIREMENT_BICEC_UBA.pdf',type:'virement', addedAt:'2026-03-15T09:00:00Z' }],
    { accountCode:'521100', accountLabel:'Banque BICEC — Compte courant', libelle:'Virement interne BICEC → UBA', addedAt:'2026-03-15T09:30:00Z' }),

  mkTx('b-o8',  '2026-01-01', 'Intérêts trimestriels Q4 2025',             138_500, 'banque', 'UBA Cameroun — Compte épargne', 'Siège', 'a_traiter',
    [{ id:'pj-b8-1', nom:'AVIS_INTERETS_Q4_2025_UBA.pdf',type:'recu',   addedAt:'2026-01-01T09:00:00Z' }]),

  // ── Banque Ecobank ────────────────────────────────────────────────────────────
  mkTx('b-o9',  '2026-04-19', 'Encaissement export — Groupe Delta',      3_200_000, 'banque', 'Ecobank — Compte devises (EUR)', 'Siège', 'traite',
    [{ id:'pj-b9-1', nom:'CONTRAT_EXPORT_DELTA.pdf',    type:'contrat',  addedAt:'2026-04-10T08:00:00Z' },
     { id:'pj-b9-2', nom:'FACTURE_EXPORT_GRP_DELTA.pdf',type:'facture',  addedAt:'2026-04-15T14:00:00Z' }],
    { accountCode:'411100', accountLabel:'Clients — ventes ordinaires', libelle:'Export Groupe Delta — avr. 2026', addedAt:'2026-04-19T10:00:00Z' }),

  mkTx('b-o10', '2026-04-10', 'Règlement fournisseur Import Express',    -1_950_000, 'banque', 'Ecobank — Compte devises (EUR)', 'Siège', 'a_traiter',
    [{ id:'pj-b10-1', nom:'FACT_IMPORT_EXPRESS_0312.pdf',type:'facture', addedAt:'2026-04-10T08:30:00Z' }]),

  mkTx('b-o11', '2026-04-05', 'Commission change EUR/XAF',                  -18_000, 'banque', 'Ecobank — Compte devises (EUR)', 'Siège', 'a_traiter',
    [{ id:'pj-b11-1', nom:'AVIS_COMMISSION_CHANGE.pdf', type:'recu',     addedAt:'2026-04-05T09:15:00Z' }]),

  // ── Caisse principale ─────────────────────────────────────────────────────────
  mkTx('c-op1', '2026-04-25', 'Achat fournitures de bureau',                -45_000, 'caisse', 'Caisse principale', 'Siège', 'a_traiter',
    [{ id:'pj-c1-1', nom:'TICKET_CAISSE_FOURNITURES.pdf',type:'recu',    addedAt:'2026-04-25T10:00:00Z' }]),

  mkTx('c-op2', '2026-04-25', 'Versement espèces client Diop',              380_000, 'caisse', 'Caisse principale', 'Siège', 'traite',
    [{ id:'pj-c2-1', nom:'RECU_CLIENT_DIOP_250426.pdf', type:'recu',     addedAt:'2026-04-25T11:30:00Z' }],
    { accountCode:'411100', accountLabel:'Clients — ventes ordinaires', libelle:'Versement espèces — M. Diop', addedAt:'2026-04-25T12:00:00Z' }),

  mkTx('c-op3', '2026-04-24', 'Frais de déplacement commercial',            -85_000, 'caisse', 'Caisse principale', 'Siège', 'a_traiter',
    [{ id:'pj-c3-1', nom:'NOTES_FRAIS_COMMERCIAL_24AVR.pdf',type:'autre',addedAt:'2026-04-24T18:00:00Z' }]),

  mkTx('c-op4', '2026-04-24', 'Alimentation caisse (virement BICEC)',       500_000, 'caisse', 'Caisse principale', 'Siège', 'traite',
    [{ id:'pj-c4-1', nom:'ORDRE_ALIMENTATION_CAISSE.pdf',type:'virement',addedAt:'2026-04-24T08:00:00Z' }],
    { accountCode:'521100', accountLabel:'Banque BICEC — Compte courant', libelle:'Alimentation caisse — 24/04/2026', addedAt:'2026-04-24T08:30:00Z' }),

  mkTx('c-op5', '2026-04-23', 'Paiement prestataire nettoyage',             -75_000, 'caisse', 'Caisse principale', 'Siège', 'a_traiter',
    [{ id:'pj-c5-1', nom:'FACT_NETTOYAGE_AVRIL2026.pdf',type:'facture',  addedAt:'2026-04-23T09:00:00Z' }]),

  mkTx('c-op6', '2026-04-23', 'Encaissement vente comptoir',                210_000, 'caisse', 'Caisse principale', 'Siège', 'traite',
    [{ id:'pj-c6-1', nom:'TICKET_Z_CAISSE_230426.pdf',  type:'recu',     addedAt:'2026-04-23T18:00:00Z' }],
    { accountCode:'701000', accountLabel:'Ventes de marchandises', libelle:'Ventes comptoir — 23/04/2026', addedAt:'2026-04-23T18:30:00Z' }),

  // ── Petite caisse ─────────────────────────────────────────────────────────────
  mkTx('c-op7', '2026-04-25', 'Café et collations réunion',                  -15_000, 'caisse', 'Petite caisse', 'Siège', 'a_traiter',
    [{ id:'pj-c7-1', nom:'TICKET_CAFE_250426.pdf',       type:'recu',    addedAt:'2026-04-25T14:00:00Z' }]),

  mkTx('c-op8', '2026-04-24', 'Alimentation petite caisse',                 100_000, 'caisse', 'Petite caisse', 'Siège', 'traite',
    [{ id:'pj-c8-1', nom:'BON_ALIMENTATION_PETITE_CAISSE.pdf',type:'virement',addedAt:'2026-04-24T08:00:00Z' }],
    { accountCode:'571000', accountLabel:'Caisse principale (siège)', libelle:'Alimentation petite caisse — 24/04', addedAt:'2026-04-24T08:15:00Z' }),

  mkTx('c-op9', '2026-04-23', 'Timbres et envoi courrier',                    -8_500, 'caisse', 'Petite caisse', 'Siège', 'a_traiter',
    [{ id:'pj-c9-1', nom:'RECU_POSTE_230426.pdf',        type:'recu',    addedAt:'2026-04-23T11:00:00Z' }]),

  // ── MTN Mobile Money ──────────────────────────────────────────────────────────
  mkTx('m-op1', '2026-04-25', 'Paiement reçu — Fournisseur Ebobolo',     1_200_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'traite',
    [{ id:'pj-m1-1', nom:'FACTURE_EBOBOLO_0045.pdf',    type:'facture',  addedAt:'2026-04-25T09:30:00Z' }],
    { accountCode:'411200', accountLabel:'Clients — prestations de services', libelle:'Règlement Ebobolo SARL — avr. 2026', addedAt:'2026-04-25T10:00:00Z' }),

  mkTx('m-op2', '2026-04-25', 'Retrait agence MTN Akwa',                   -500_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'a_traiter',
    [{ id:'pj-m2-1', nom:'RECU_RETRAIT_MTN_250426.pdf', type:'recu',     addedAt:'2026-04-25T14:30:00Z' }]),

  mkTx('m-op3', '2026-04-24', 'Paiement reçu — Client Ayissi P.',           380_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'traite',
    [{ id:'pj-m3-1', nom:'RECU_AYISSI_240426.pdf',      type:'recu',     addedAt:'2026-04-24T16:00:00Z' }],
    { accountCode:'411100', accountLabel:'Clients — ventes ordinaires', libelle:'Paiement M. Ayissi P. — 24/04', addedAt:'2026-04-24T16:30:00Z' }),

  mkTx('m-op4', '2026-04-24', 'Transfert vers compte BICEC',              -1_000_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'a_traiter',
    [{ id:'pj-m4-1', nom:'ORDRE_TRANSFERT_MTN_BICEC.pdf',type:'virement',addedAt:'2026-04-24T09:00:00Z' }]),

  mkTx('m-op5', '2026-04-23', 'Paiement facture eau et électricité',         -98_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'a_traiter',
    [{ id:'pj-m5-1', nom:'FACTURE_AES_SONEL_AVR26.pdf', type:'facture',  addedAt:'2026-04-23T08:00:00Z' }]),

  // ── Orange Money ─────────────────────────────────────────────────────────────
  mkTx('m-op6', '2026-04-25', 'Encaissement client Fouda L.',               650_000, 'mobile-money', 'Orange Money', 'Siège', 'traite',
    [{ id:'pj-m6-1', nom:'RECU_FOUDA_250426.pdf',       type:'recu',     addedAt:'2026-04-25T10:00:00Z' }],
    { accountCode:'411200', accountLabel:'Clients — prestations de services', libelle:'Règlement M. Fouda L. — 25/04', addedAt:'2026-04-25T10:30:00Z' }),

  mkTx('m-op7', '2026-04-24', 'Paiement prestataire design',                -180_000, 'mobile-money', 'Orange Money', 'Siège', 'a_traiter',
    [{ id:'pj-m7-1', nom:'FACT_DESIGN_STUDIO_PIXEL.pdf',type:'facture',  addedAt:'2026-04-24T08:00:00Z' }]),

  mkTx('m-op8', '2026-04-22', 'Encaissement vente directe',                  320_000, 'mobile-money', 'Orange Money', 'Siège', 'a_traiter',
    [{ id:'pj-m8-1', nom:'BON_VENTE_DIRECTE_220426.pdf',type:'recu',     addedAt:'2026-04-22T17:00:00Z' }]),
]

// ── Métadonnées visuelles par source ──────────────────────────────────────────

const SOURCE_META: Record<SourceType, { label: string; icon: string; bg: string }> = {
  'banque':       { label: 'Banque',        icon: '🏦', bg: 'bg-blue-50 text-blue-700 ring-blue-200'      },
  'caisse':       { label: 'Caisse',        icon: '💵', bg: 'bg-amber-50 text-amber-700 ring-amber-200'   },
  'mobile-money': { label: 'Mobile Money', icon: '📱', bg: 'bg-purple-50 text-purple-700 ring-purple-200' },
}

const PIECE_TYPE_LABELS: Record<PieceType, string> = {
  facture:      'Facture', recu: 'Reçu', bon_commande: 'Bon de commande',
  virement:     'Ordre de virement', contrat: 'Contrat', autre: 'Autre',
}

const PIECE_TYPE_ICONS: Record<PieceType, string> = {
  facture:'🧾', recu:'📜', bon_commande:'📋', virement:'💸', contrat:'📑', autre:'📎',
}

type SortKey = 'date' | 'montant' | 'sourceName' | 'status'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300 text-[10px]">↕</span>
  return <span className="ml-1 text-green-600 text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Badge statut ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TxStatus }) {
  if (status === 'traite') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-inset ring-green-200">
        <span className="text-[8px]">●</span> Traité
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
      <span className="text-[8px]">○</span> À traiter
    </span>
  )
}

// ── Modal : ajouter une contrepartie ─────────────────────────────────────────

interface ContrePartieModalProps {
  tx:            Transaction
  fiscalYearId:  string | null
  onClose:       () => void
  onValidate:    (txId: string, contrepartie: Contrepartie, newPieces: PieceJustificative[]) => void
}

function ContrePartieModal({ tx, fiscalYearId, onClose, onValidate }: ContrePartieModalProps) {
  const { fmt } = useCurrency()
  const [accountQuery,     setAccountQuery]     = useState('')
  const [selectedAccount,  setSelectedAccount]  = useState<typeof COMPTES_OHADA[0] | null>(null)
  const [libelle,          setLibelle]          = useState(tx.libelle)
  const [showDropdown,     setShowDropdown]      = useState(false)
  const [newPieces,        setNewPieces]         = useState<PieceJustificative[]>([])
  const [saving,           setSaving]            = useState(false)
  const [error,            setError]             = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredAccounts = useMemo(() => {
    const q = accountQuery.trim().toLowerCase()
    if (!q) return COMPTES_OHADA.filter(c => ['4', '6', '7'].includes(c.code.charAt(0))).slice(0, 12)
    return COMPTES_OHADA.filter(c =>
      c.code.startsWith(q) || c.label.toLowerCase().includes(q)
    ).slice(0, 15)
  }, [accountQuery])

  function handleSelectAccount(account: typeof COMPTES_OHADA[0]) {
    setSelectedAccount(account)
    setAccountQuery(`${account.code} — ${account.label}`)
    setShowDropdown(false)
  }

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const added: PieceJustificative[] = files.map(f => ({
      id:      `pj-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nom:     f.name,
      type:    'autre' as PieceType,
      addedAt: new Date().toISOString(),
    }))
    setNewPieces(prev => [...prev, ...added])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleValidate() {
    if (!selectedAccount) { setError('Veuillez sélectionner un compte de contrepartie.'); return }
    setSaving(true)
    setError(null)

    try {
      // Double écriture comptable
      if (fiscalYearId) {
        const isEncaissement = tx.montant > 0
        const amount = Math.abs(tx.montant)
        await accountingApi.createJournalEntryBatch({
          fiscalYearId,
          date:      tx.date,
          journal:   tx.journalCode,
          reference: tx.ref,
          lines: isEncaissement ? [
            { compte: tx.accountTresorerie,   libelle, debit: amount, credit: 0      },
            { compte: selectedAccount.code,   libelle, debit: 0,      credit: amount },
          ] : [
            { compte: selectedAccount.code,   libelle, debit: amount, credit: 0      },
            { compte: tx.accountTresorerie,   libelle, debit: 0,      credit: amount },
          ],
        })
      }

      const contrepartie: Contrepartie = {
        accountCode:  selectedAccount.code,
        accountLabel: selectedAccount.label,
        libelle,
        addedAt: new Date().toISOString(),
      }
      onValidate(tx.id, contrepartie, newPieces)
    } catch {
      setError('Erreur lors de la création de l\'écriture comptable. Vérifiez l\'exercice fiscal ouvert.')
    } finally {
      setSaving(false)
    }
  }

  const isEncaissement = tx.montant > 0
  const amount = Math.abs(tx.montant)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Validation de la transaction</h2>
            <p className="text-xs text-gray-500 mt-0.5">{tx.ref} · {tx.journalLabel}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Résumé transaction ── */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <p className="text-gray-400 mb-0.5">Date</p>
                <p className="font-medium text-gray-800">{formatDate(tx.date)}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Montant</p>
                <p className={`font-bold tabular-nums ${tx.montant >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {tx.montant >= 0 ? '+' : '−'}{fmt(amount)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 mb-0.5">Libellé</p>
                <p className="font-medium text-gray-800">{tx.libelle}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Compte trésorerie</p>
                <p className="font-mono text-gray-700">{tx.accountTresorerie} — {tx.accountTresorerieLabel}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Source</p>
                <p className="text-gray-700">{tx.sourceName}</p>
              </div>
            </div>
          </div>

          {/* ── Pièces justificatives existantes ── */}
          {tx.pieces.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Pièces justificatives attachées ({tx.pieces.length})
              </p>
              <div className="space-y-1.5">
                {tx.pieces.map(pj => (
                  <div key={pj.id} className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    <span className="text-sm">{PIECE_TYPE_ICONS[pj.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{pj.nom}</p>
                      <p className="text-[10px] text-gray-400">{PIECE_TYPE_LABELS[pj.type]} · {new Date(pj.addedAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <button className="text-xs text-blue-600 hover:underline shrink-0">Voir</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Ajout de pièces supplémentaires ── */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-2">Ajouter des pièces justificatives</p>
            {newPieces.length > 0 && (
              <div className="space-y-1 mb-2">
                {newPieces.map(pj => (
                  <div key={pj.id} className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5">
                    <span className="text-sm">📎</span>
                    <p className="text-xs text-blue-800 flex-1 truncate">{pj.nom}</p>
                    <button onClick={() => setNewPieces(p => p.filter(x => x.id !== pj.id))} className="text-blue-400 hover:text-blue-600 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAdd} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-gray-200 px-4 py-3 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors text-center"
            >
              📎 Glisser-déposer ou cliquer pour attacher (PDF, image, Excel…)
            </button>
          </div>

          {/* ── Contrepartie comptable ── */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">
              Écriture comptable à générer
            </p>

            {/* Prévisualisation de l'écriture */}
            <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Compte</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Libellé</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Débit</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isEncaissement ? (
                    <>
                      <tr>
                        <td className="px-3 py-2 font-mono text-gray-700">{tx.accountTresorerie}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[140px]">{tx.accountTresorerieLabel}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(amount)}</td>
                        <td className="px-3 py-2 text-right text-gray-400">—</td>
                      </tr>
                      <tr className={selectedAccount ? '' : 'opacity-40'}>
                        <td className="px-3 py-2 font-mono text-gray-700">{selectedAccount?.code ?? '??????'}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[140px]">{selectedAccount?.label ?? 'Compte à sélectionner'}</td>
                        <td className="px-3 py-2 text-right text-gray-400">—</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">{fmt(amount)}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className={selectedAccount ? '' : 'opacity-40'}>
                        <td className="px-3 py-2 font-mono text-gray-700">{selectedAccount?.code ?? '??????'}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[140px]">{selectedAccount?.label ?? 'Compte à sélectionner'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(amount)}</td>
                        <td className="px-3 py-2 text-right text-gray-400">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-gray-700">{tx.accountTresorerie}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[140px]">{tx.accountTresorerieLabel}</td>
                        <td className="px-3 py-2 text-right text-gray-400">—</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">{fmt(amount)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Sélecteur compte contrepartie */}
            <div className="space-y-3">
              <div ref={dropdownRef} className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Compte de contrepartie *</label>
                <input
                  value={accountQuery}
                  onChange={e => { setAccountQuery(e.target.value); setSelectedAccount(null); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Rechercher par numéro ou intitulé (ex: 411, clients…)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                />
                {showDropdown && filteredAccounts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {filteredAccounts.map(account => (
                      <button
                        key={account.code}
                        onMouseDown={() => handleSelectAccount(account)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <span className="font-mono text-gray-500 shrink-0">{account.code}</span>
                        <span className="text-gray-700 truncate">{account.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Libellé de l'écriture</label>
                <input
                  value={libelle}
                  onChange={e => setLibelle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                />
              </div>
            </div>

            {!fiscalYearId && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                ⚠️ Aucun exercice fiscal ouvert détecté. L'écriture sera enregistrée localement uniquement.
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-white">
          <div className="text-xs text-red-600">{error}</div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleValidate}
              disabled={saving || !selectedAccount}
              className="rounded-lg bg-forest-900 px-5 py-2 text-xs font-semibold text-white hover:bg-forest-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving
                ? <><span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" /> Enregistrement…</>
                : '✓ Valider et reverser au journal'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal : détail d'une transaction traitée ──────────────────────────────────

function TxDetailModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { fmt } = useCurrency()
  const isEncaissement = tx.montant > 0
  const amount = Math.abs(tx.montant)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Détail de la transaction</h2>
            <StatusBadge status="traite" />
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {/* Infos générales */}
          <div className="px-6 py-4 bg-gray-50/50">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div><p className="text-gray-400 mb-0.5">Référence</p><p className="font-mono font-medium text-gray-800">{tx.ref}</p></div>
              <div><p className="text-gray-400 mb-0.5">Date</p><p className="font-medium text-gray-800">{formatDate(tx.date)}</p></div>
              <div className="col-span-2"><p className="text-gray-400 mb-0.5">Libellé</p><p className="font-medium text-gray-800">{tx.libelle}</p></div>
              <div>
                <p className="text-gray-400 mb-0.5">Montant</p>
                <p className={`font-bold tabular-nums ${tx.montant >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {tx.montant >= 0 ? '+' : '−'}{fmt(amount)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Journal</p>
                <p className="font-medium text-gray-800">{tx.journalCode} — {tx.journalLabel}</p>
              </div>
            </div>
          </div>

          {/* Écriture comptable */}
          {tx.contrepartie && (
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">Écriture comptable générée</p>
              <div className="rounded-lg border border-gray-200 overflow-hidden mb-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Compte</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Libellé</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Débit</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Crédit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isEncaissement ? (
                      <>
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-700">{tx.accountTresorerie}</td>
                          <td className="px-3 py-2 text-gray-600 truncate">{tx.accountTresorerieLabel}</td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(amount)}</td>
                          <td className="px-3 py-2 text-right text-gray-400">—</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-700">{tx.contrepartie.accountCode}</td>
                          <td className="px-3 py-2 text-gray-600 truncate">{tx.contrepartie.accountLabel}</td>
                          <td className="px-3 py-2 text-right text-gray-400">—</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{fmt(amount)}</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-700">{tx.contrepartie.accountCode}</td>
                          <td className="px-3 py-2 text-gray-600 truncate">{tx.contrepartie.accountLabel}</td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(amount)}</td>
                          <td className="px-3 py-2 text-right text-gray-400">—</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-700">{tx.accountTresorerie}</td>
                          <td className="px-3 py-2 text-gray-600 truncate">{tx.accountTresorerieLabel}</td>
                          <td className="px-3 py-2 text-right text-gray-400">—</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{fmt(amount)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-400">
                Reversé au journal le {new Date(tx.contrepartie.addedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
              </p>
            </div>
          )}

          {/* Pièces justificatives */}
          {tx.pieces.length > 0 && (
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Pièces justificatives ({tx.pieces.length})</p>
              <div className="space-y-1.5">
                {tx.pieces.map(pj => (
                  <div key={pj.id} className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    <span className="text-sm">{PIECE_TYPE_ICONS[pj.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{pj.nom}</p>
                      <p className="text-[10px] text-gray-400">{PIECE_TYPE_LABELS[pj.type]} · {new Date(pj.addedAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <button className="text-xs text-blue-600 hover:underline shrink-0">Voir</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function TransactionsPage() {
  const { fmt } = useCurrency()

  // État des transactions (en local — sera remplacé par API treasury quand dispo)
  const [transactions, setTransactions] = useState<Transaction[]>(INIT_TRANSACTIONS)

  // Exercice fiscal ouvert
  const [fiscalYearId, setFiscalYearId] = useState<string | null>(null)
  useEffect(() => {
    accountingApi.listFiscalYears()
      .then(years => {
        const open = years.find(y => y.status === 'OPEN')
        if (open) setFiscalYearId(open.id)
      })
      .catch(() => {/* pas d'exercice ouvert — mode dégradé */})
  }, [])

  // Modal
  const [selectedTx,  setSelectedTx]  = useState<Transaction | null>(null)
  const [modalMode,   setModalMode]   = useState<'validate' | 'view'>('validate')

  function openModal(tx: Transaction) {
    setSelectedTx(tx)
    setModalMode(tx.status === 'a_traiter' ? 'validate' : 'view')
  }

  function handleValidate(txId: string, contrepartie: Contrepartie, newPieces: PieceJustificative[]) {
    setTransactions(prev => prev.map(tx =>
      tx.id === txId
        ? { ...tx, status: 'traite', contrepartie, pieces: [...tx.pieces, ...newPieces] }
        : tx
    ))
    setSelectedTx(null)
  }

  // Filtres
  const [search,       setSearch]      = useState('')
  const [typeFilter,   setTypeFilter]  = useState<SourceType | 'all'>('all')
  const [statusFilter, setStatusFilter]= useState<TxStatus | 'all'>('all')
  const [dateFrom,     setDateFrom]    = useState('')
  const [dateTo,       setDateTo]      = useState('')

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const rows = useMemo(() => {
    let list = transactions
    if (typeFilter !== 'all')   list = list.filter(t => t.sourceType === typeFilter)
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter)
    if (dateFrom) list = list.filter(t => t.date >= dateFrom)
    if (dateTo)   list = list.filter(t => t.date <= dateTo)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(t =>
        t.libelle.toLowerCase().includes(q) ||
        t.sourceName.toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q) ||
        t.accountTresorerie.includes(q),
      )
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      if      (sortKey === 'date')       cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'montant')    cmp = a.montant - b.montant
      else if (sortKey === 'sourceName') cmp = a.sourceName.localeCompare(b.sourceName)
      else if (sortKey === 'status')     cmp = a.status.localeCompare(b.status)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [transactions, typeFilter, statusFilter, dateFrom, dateTo, search, sortKey, sortDir])

  // Statistiques
  const stats = useMemo(() => {
    const totals: Record<SourceType, { credit: number; debit: number }> = {
      'banque': { credit: 0, debit: 0 }, 'caisse': { credit: 0, debit: 0 }, 'mobile-money': { credit: 0, debit: 0 },
    }
    let traite = 0, aTraiter = 0
    for (const t of transactions) {
      if (t.montant > 0) totals[t.sourceType].credit += t.montant
      else               totals[t.sourceType].debit  += Math.abs(t.montant)
      if (t.status === 'traite') traite++; else aTraiter++
    }
    const globalCredit = Object.values(totals).reduce((s, v) => s + v.credit, 0)
    const globalDebit  = Object.values(totals).reduce((s, v) => s + v.debit, 0)
    return { totals, globalCredit, globalDebit, globalNet: globalCredit - globalDebit, traite, aTraiter }
  }, [transactions])

  const hasFilters = typeFilter !== 'all' || statusFilter !== 'all' || search || dateFrom || dateTo

  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── Modals ── */}
      {selectedTx && modalMode === 'validate' && (
        <ContrePartieModal
          tx={selectedTx}
          fiscalYearId={fiscalYearId}
          onClose={() => setSelectedTx(null)}
          onValidate={handleValidate}
        />
      )}
      {selectedTx && modalMode === 'view' && (
        <TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}

      {/* ── En-tête ── */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Transactions de trésorerie</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Banques · Caisses · Mobile Money — cliquer sur une ligne pour ajouter la contrepartie comptable
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2.5 py-1 font-semibold">
            {stats.aTraiter} à traiter
          </span>
          <span className="rounded-full bg-green-50 text-green-700 ring-1 ring-green-200 px-2.5 py-1 font-semibold">
            {stats.traite} traité{stats.traite > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Cartes résumé ── */}
      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.entries(stats.totals) as [SourceType, { credit: number; debit: number }][]).map(([type, v]) => {
          const meta = SOURCE_META[type]
          const net  = v.credit - v.debit
          return (
            <div key={type} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span>{meta.icon}</span>
                <p className="text-xs font-medium text-gray-500">{meta.label}</p>
              </div>
              <p className={`text-lg font-bold tabular-nums ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {net >= 0 ? '+' : ''}{fmt(net)}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 tabular-nums">
                <span className="text-green-600">+{fmt(v.credit)}</span> / <span className="text-red-500">−{fmt(v.debit)}</span>
              </p>
            </div>
          )
        })}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1"><span>📊</span><p className="text-xs font-medium text-gray-500">Net global</p></div>
          <p className={`text-lg font-bold tabular-nums ${stats.globalNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {stats.globalNet >= 0 ? '+' : ''}{fmt(stats.globalNet)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 tabular-nums">
            <span className="text-green-600">+{fmt(stats.globalCredit)}</span> / <span className="text-red-500">−{fmt(stats.globalDebit)}</span>
          </p>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Référence, libellé, compte…"
            className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as SourceType | 'all')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
          <option value="all">Tous les types</option>
          <option value="banque">🏦 Banque</option>
          <option value="caisse">💵 Caisse</option>
          <option value="mobile-money">📱 Mobile Money</option>
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as TxStatus | 'all')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
          <option value="all">Tous les statuts</option>
          <option value="a_traiter">○ À traiter</option>
          <option value="traite">● Traité</option>
        </select>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Du</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Au</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
        </div>

        {hasFilters && (
          <button onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setSearch(''); setDateFrom(''); setDateTo('') }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Tableau ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-sm font-medium">Aucune transaction trouvée</p>
              <p className="text-xs mt-1">Modifiez les filtres pour élargir la recherche</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                <tr>
                  <th onClick={() => toggleSort('date')} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap">
                    Date <SortIcon active={sortKey === 'date'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Réf.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>
                  <th onClick={() => toggleSort('sourceName')} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none">
                    Compte <SortIcon active={sortKey === 'sourceName'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[200px]">Libellé</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">PJ</th>
                  <th onClick={() => toggleSort('status')} className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap">
                    Statut <SortIcon active={sortKey === 'status'} dir={sortDir} />
                  </th>
                  <th onClick={() => toggleSort('montant')} className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap">
                    Montant <SortIcon active={sortKey === 'montant'} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(tx => {
                  const meta = SOURCE_META[tx.sourceType]
                  const isATraiter = tx.status === 'a_traiter'
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => openModal(tx)}
                      className={`transition-colors cursor-pointer ${
                        isATraiter
                          ? 'hover:bg-amber-50/50'
                          : 'hover:bg-green-50/30'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap tabular-nums text-xs">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{tx.ref}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.bg}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[180px]">
                        <p className="text-xs text-gray-700 truncate" title={tx.sourceName}>{tx.sourceName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{tx.accountTresorerie}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs text-gray-800 truncate max-w-xs" title={tx.libelle}>{tx.libelle}</p>
                        {tx.contrepartie && (
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            ↔ {tx.contrepartie.accountCode} — {tx.contrepartie.accountLabel}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {tx.pieces.length > 0 ? (
                          <span className="text-xs text-blue-600 font-medium" title={tx.pieces.map(p => p.nom).join(', ')}>
                            📎 {tx.pieces.length}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap text-xs ${tx.montant >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.montant >= 0 ? '+' : '−'}{fmt(Math.abs(tx.montant))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={7} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total ({rows.length} ligne{rows.length > 1 ? 's' : ''})
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums whitespace-nowrap text-sm ${
                      rows.reduce((s, t) => s + t.montant, 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {(() => {
                        const net = rows.reduce((s, t) => s + t.montant, 0)
                        return `${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}`
                      })()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
