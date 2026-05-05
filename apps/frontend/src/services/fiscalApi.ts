import { api } from '@/lib/api'

const d = <T>(r: { data: { data: T } }) => r.data.data

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaxDeclStatus = 'PENDING' | 'DECLARED' | 'PAID' | 'LATE' | 'EXEMPTED'
export type TaxType       = 'TVA' | 'IS' | 'IS_ACOMPTE' | 'PATENTE' | 'RAS' | 'CNPS' | 'FDFP' | 'DSF'
export type TaxRegime     = 'IGS' | 'REEL_NORMAL' | 'REEL_SIMPLIFIE' | 'FORFAIT_BIENNAL' | 'MICRO_ENTREPRISE' | 'LIBERATOIRE'
export type VatRegime     = 'MENSUEL' | 'TRIMESTRIEL' | 'NON_ASSUJETTI'
export type IgsPayment    = 'ANNUEL' | 'TRIMESTRIEL'

export interface TaxConfig {
  id:                 string | null
  companyId:          string
  country:            string
  taxRegime:          TaxRegime | null
  vatRegime:          VatRegime | null
  centerImpots:       string | null
  niu:                string | null
  rccm:               string | null
  codeActivite:       string | null
  cnpsRate:           number
  isAssujetti:        boolean
  isFirstYear:        boolean
  firstYearCA:        number | null
  professionLiberale: boolean
  igsClass:           number | null
  igsAmount:          number | null
  igsPaymentMode:     IgsPayment | null
  igsAdherentCga:     boolean
  regimeHistory:      Record<string, string> | null
  regimeChangeAlert:  boolean
}

export interface IgsBaremeRow {
  classe:      number
  caMin:       number
  caMax:       number
  montantBase: number
  montantCga:  number
  year:        number
}

export interface IgsDeclaration {
  year:          number
  caN1:          number
  igsClass:      number | null
  igsAmount:     number
  igsAmountCga:  number
  adherentCga:   boolean
  paymentMode:   IgsPayment
  status:        TaxDeclStatus
  dueDate:       string
  trimestres:    Array<{ num: number; label: string; dueDate: string; amount: number }>
  bareme:        IgsBaremeRow[]
  niu:           string | null
  centerImpots:  string | null
  regimeHistory: Record<string, string>
}

export interface RegimeDetectionResult {
  currentRegime:     string
  nextRegime:        string
  hasChanged:        boolean
  changeReason:      string
  caActuel:          number
  caThreshold:       number
  professionLiberale: boolean
  igsClass?:         number
  igsAmount?:        number
  igsAmountCga?:     number
  newObligations:    string[]
  warnings:          string[]
  regimeHistory:     Record<string, string>
}

export interface VisibleModules {
  tabs:   Array<{ key: string; label: string; to: string }>
  regime: string
}

export interface FiscalDashboard {
  country: string
  kpis: {
    tvaAPayer:          number | null
    tvaDueDate:         string | null
    isPrevisionnel:     number
    isYear:             number
    patente:            number | null
    patenteStatus:      TaxDeclStatus | null
    nextDeadlineDays:   number | null
    nextDeadlineLabel:  string | null
  }
  alerts: Array<{ level: 'error' | 'warning' | 'ok'; message: string; type: TaxType; period: string }>
  monthlyChart: Array<{ month: number; tva: number; is: number; patente: number; ras: number }>
}

export interface TVALine { reference?: string; label: string; baseHT: number; taux: number; tva: number }

export interface TVADeclaration {
  period:           string
  year:             number
  month:            number
  start:            string
  end:              string
  dueDate:          string
  status:           TaxDeclStatus
  collectee:        TVALine[]
  totalCollectee:   number
  deductible:       TVALine[]
  totalDeductible:  number
  tvaNette:         number
  creditReporte:    number
  tvaExigible:      number
  country:          string
  vatRate:          number
}

export interface DSFData {
  year: number; dueDate: string; status: string; isLate: boolean
  identification: {
    raisonSociale: string; niu: string; rccm: string; activite: string; codeActivite: string
    regimeFiscal: string; centreImpots: string; exercice: string
    adresse: string; ville: string; telephone: string; email: string; formeJuridique: string; capital: number
  }
  compteResultat: {
    caVentes: number; caPrestations: number; autresProduits: number; totalProduits: number
    achats: number; transports: number; servicesExt: number; impotsTaxes: number
    chargesPersonnel: number; dotationsAmort: number; chargesFinancieres: number
    isSurExercice: number; totalCharges: number; resultatNet: number
  }
  bilan: {
    actifImmoNet: number; actifCirculant: number; tresorerie: number; totalActif: number
    capitauxPropres: number; dettesFinancieres: number; dettesCirculantes: number; totalPassif: number
  }
  passageResultatFiscal: {
    resultatNetComptable: number; amendes: number; chargesPersonnelles: number
    provisionsNonConformes: number; depensesSomptuaires: number; totalReintegrations: number
    produitsNonImposables: number; deficitsReportes: number; resultatFiscalNet: number
  }
  calcIS: { baseImposable: number; tauxIS: number; isTheorique: number; isMinimum: number; isPayer: number; acomptesVerses: number; soldeAPayer: number }
  effectifs: { effectifMoyen: number; hommes: number; femmes: number; masseSalarialebrute: number; irppRetenu: number; cnpsPatronal: number; fdfpVerse: number }
  immobilisations: { valeurBruteDebut: number; acquisitions: number; cessions: number; valeurBruteFin: number; amortsCumDebut: number; dotationsExercice: number; amortsCumFin: number; valeurNette: number }
  tvaRecap: { caTotalImposable: number; tvaCollecteeTotale: number; tvaDeductibleTotale: number; tvaNetteVersee: number; creditsReportes: number }
  // legacy
  resultats: { caHT: number; chargesDeductibles: number; resultatFiscalBrut: number; deficitsReportables: number; resultatFiscalNet: number }
  masseSalariale: { effectifMoyen: number; masseSalarialebrute: number; cnpsPatronal: number; fdfp: number; totalChargesSociales: number }
  autresImpots: { tvaNette: number; patente: number; centimesAdditionnels: number; ras: number }
}

export interface ISData {
  year: number; currentMonth: number
  caAnnuel: number; chargesAnnuelles: number; resultatAnnuel: number
  isCalculeAnnuel: number; isMinimumAnnuel: number; isEstimeAnnuel: number
  caMonthly: number; isAcompteMensuel: number; tauxAcompte: number; cumulsAcomptes: number
  prevYearIS: number
  acomptes: Array<{ number: number; amount: number; dueDate: string; paidAt: string | null; status: TaxDeclStatus }>
  reintegrations: { amendes: number; chargesPersonnelles: number; provisions: number; total: number }
  // legacy
  caQ1: number; chargesQ1: number; resultatQ1: number; isPrevisionnelQ1: number; isMinimumQ1: number
}

export interface PatenteData {
  year: number; caN1: number; categorie: string; tauxProportionnel: number
  droitFixe: number; droitProportionnel: number
  centimes: number; total: number; totalRounded: number
  dueDate: string; status: TaxDeclStatus; paidAt: string | null; reference: string | null
}

export interface RASData {
  year: number
  types: Array<{ type: string; taux: number; applicabilite: string }>
  declarations: Array<{ id: string; month: number | null; period: string; baseAmount: number; taxAmount: number; status: TaxDeclStatus; reference: string | null; paidAt: string | null }>
  cumulVerse: number
}

export interface CNPSEmployee {
  nom: string; poste: string; salaireBrut: number; cnpsPatronal: number; cnpsSalarial: number
}

export interface CNPSData {
  year: number; month: number; period: string; dueDate: string
  immatriculation: string
  employees: CNPSEmployee[]
  totals: { masseSalariale: number; cnpsPatronal: number; cnpsSalarial: number; fdfpPatronal: number; fdfpSalarial: number; total: number }
  status: TaxDeclStatus
  tauxPatronal: number; tauxSalarial: number; tauxFdfpPatronal: number; tauxFdfpSalarial: number
}

export interface CalendrierEvent {
  date: string; dueDate: string; label: string; type: string
  month?: number; quarter?: number
  status: 'done' | 'urgent' | 'pending' | 'late'
  declaredAt: string | null
}

export interface LiasseDoc {
  id: string; label: string; available: boolean; required: boolean; source: string
}

export interface LiasseData {
  year: number; documents: LiasseDoc[]; done: number; total: number; progress: number
}

export interface CompanyInfo {
  nom: string; pays: string; niu: string; rccm: string
  centerImpots: string; codeActivite: string
  adresse: string; ville: string; telephone: string; email: string
}

export interface ISHistoryRow {
  year: number
  resultatFiscal: number | null
  isPayer: number | null
  acomptesVerses: number
  solde: number | null
  status: TaxDeclStatus | null
  declaredAt: string | null
}

export interface DSFHistoryRow {
  anneeExercice: number
  anneeDépôt: number
  dateDepot: string | null
  status: TaxDeclStatus | null
  echéance: string
}

export interface RASSuggestion {
  beneficiaire: string; type: string; base: number; taux: number; retenue: number; source: string
}

export interface RASSuggestionsData {
  month: number; year: number
  suggestions: RASSuggestion[]
  total: number
}

// ── API ───────────────────────────────────────────────────────────────────────

export const fiscalApi = {
  dashboard:  (year: number) =>
    api.get<{ data: FiscalDashboard }>(`/fiscal/dashboard?year=${year}`).then(d),

  tva:        (year: number, month: number) =>
    api.get<{ data: TVADeclaration }>(`/fiscal/tva?year=${year}&month=${month}`).then(d),

  tvaHistory: (year: number) =>
    api.get<{ data: unknown[] }>(`/fiscal/tva/history?year=${year}`).then(d),

  declareTVA: (year: number, month: number) =>
    api.post<{ data: unknown }>(`/fiscal/tva/${year}/${month}/declare`).then(d),

  dsf:        (year: number) =>
    api.get<{ data: DSFData }>(`/fiscal/dsf?year=${year}`).then(d),

  is:         (year: number) =>
    api.get<{ data: ISData }>(`/fiscal/is?year=${year}`).then(d),

  patente:    (year: number) =>
    api.get<{ data: PatenteData }>(`/fiscal/patente?year=${year}`).then(d),

  ras:        (year: number) =>
    api.get<{ data: RASData }>(`/fiscal/ras?year=${year}`).then(d),

  cnps:       (year: number, month: number) =>
    api.get<{ data: CNPSData }>(`/fiscal/cnps?year=${year}&month=${month}`).then(d),

  calendrier: (year: number) =>
    api.get<{ data: CalendrierEvent[] }>(`/fiscal/calendrier?year=${year}`).then(d),

  liasse:     (year: number) =>
    api.get<{ data: LiasseData }>(`/fiscal/liasse?year=${year}`).then(d),

  getConfig:  () =>
    api.get<{ data: TaxConfig }>('/fiscal/config').then(d),

  updateConfig: (body: Partial<TaxConfig>) =>
    api.put<{ data: TaxConfig }>('/fiscal/config', body).then(d),

  igs: (year: number) =>
    api.get<{ data: IgsDeclaration }>(`/fiscal/igs?year=${year}`).then(d),

  regimeDetection: (year: number) =>
    api.get<{ data: RegimeDetectionResult }>(`/fiscal/regime-detection?year=${year}`).then(d),

  confirmRegime: (body: { year: number; regime: string; igsClass?: number; paymentMode?: string; adherentCga?: boolean }) =>
    api.post<{ data: unknown }>('/fiscal/regime-confirm', body).then(d),

  igsBareme: () =>
    api.get<{ data: IgsBaremeRow[] }>('/fiscal/igs-bareme').then(d),

  visibleModules: () =>
    api.get<{ data: VisibleModules }>('/fiscal/visible-modules').then(d),

  companyInfo: () =>
    api.get<{ data: CompanyInfo }>('/fiscal/company-info').then(d),

  isHistory: () =>
    api.get<{ data: ISHistoryRow[] }>('/fiscal/is/history').then(d),

  dsfHistory: () =>
    api.get<{ data: DSFHistoryRow[] }>('/fiscal/dsf/history').then(d),

  rasSuggestions: (year: number, month: number) =>
    api.get<{ data: RASSuggestionsData }>(`/fiscal/ras/suggestions?year=${year}&month=${month}`).then(d),
}
