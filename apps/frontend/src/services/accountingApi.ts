import { api } from '@/lib/api'

export interface Bilan {
  actif: { immobilisations: string; creances: string; tresorerie: string; total: string }
  passif: { capitaux: string; dettes: string; total: string }
  year: number
}

export interface CompteResultat {
  produits: { caTotal: string; autresProduits: string; total: string }
  charges: {
    achatsMarchandises: string
    servicesExterieurs: string
    chargesPersonnel: string
    impots: string
    dotations: string
    autresCharges: string
    total: string
  }
  resultatNet: string
  year: number
}

export interface GrandLivreEntry {
  date: string
  libelle: string
  debit: string
  credit: string
  compte: string
}

export interface BalanceEntry {
  compte: string
  libelle: string
  totalDebit: string
  totalCredit: string
  solde: string
}

export interface TvaTrimestrielle {
  year: number
  quarters: {
    quarter: number
    tvaCollectee: string
    tvaDeductible: string
    tvaNette: string
  }[]
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const accountingApi = {
  bilan:          (year?: number) => api.get<{ data: Bilan }>('/accounting/bilan', { params: year ? { year } : undefined }).then(d),
  compteResultat: (year?: number) => api.get<{ data: CompteResultat }>('/accounting/compte-resultat', { params: year ? { year } : undefined }).then(d),
  grandLivre:     ()              => api.get<{ data: GrandLivreEntry[] }>('/accounting/grand-livre').then(d),
  balance:        ()              => api.get<{ data: BalanceEntry[] }>('/accounting/balance').then(d),
  tva:            (year?: number) => api.get<{ data: TvaTrimestrielle }>('/accounting/tva', { params: year ? { year } : undefined }).then(d),
}
