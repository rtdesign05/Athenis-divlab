import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PersonalRevenu {
  id: string
  libelle: string
  montant: number
  categorie: string
  date: string
  recurrent: boolean
  createdAt: string
}

export interface PersonalDepense {
  id: string
  libelle: string
  montant: number
  categorie: string
  date: string
  recurrent: boolean
  createdAt: string
}

export interface PersonalCompte {
  id: string
  nom: string
  type: string
  solde: number
  createdAt: string
}

export interface PersonalObjectif {
  id: string
  nom: string
  montantCible: number
  montantActuel: number
  dateEcheance: string | null
  createdAt: string
}

export interface PersonalTransaction extends PersonalRevenu {
  type: 'REVENU' | 'DEPENSE'
}

export interface PersonalDashboard {
  revenusMois: number
  depensesMois: number
  soldeTotalComptes: number
  tauxEpargne: number
  comptes: PersonalCompte[]
  objectifs: PersonalObjectif[]
  transactionsRecentes: PersonalTransaction[]
}

// ── Catégories ────────────────────────────────────────────────────────────────

export const CATEGORIES_DEPENSES = [
  { value: 'LOGEMENT',      label: 'Logement',        emoji: '🏠' },
  { value: 'TRANSPORT',     label: 'Transport',       emoji: '🚗' },
  { value: 'ALIMENTATION',  label: 'Alimentation',    emoji: '🛒' },
  { value: 'SANTE',         label: 'Santé',           emoji: '💊' },
  { value: 'LOISIRS',       label: 'Loisirs',         emoji: '🎭' },
  { value: 'EDUCATION',     label: 'Éducation',       emoji: '📚' },
  { value: 'VETEMENTS',     label: 'Vêtements',       emoji: '👕' },
  { value: 'ABONNEMENTS',   label: 'Abonnements',     emoji: '📱' },
  { value: 'AUTRES',        label: 'Autres',          emoji: '📦' },
] as const

export const CATEGORIES_REVENUS = [
  { value: 'SALAIRE',        label: 'Salaire',         emoji: '💼' },
  { value: 'FREELANCE',      label: 'Freelance',       emoji: '💻' },
  { value: 'INVESTISSEMENTS',label: 'Investissements', emoji: '📈' },
  { value: 'LOYERS',         label: 'Loyers',          emoji: '🏘️' },
  { value: 'PRESTATIONS',    label: 'Prestations',     emoji: '🤝' },
  { value: 'AUTRES',         label: 'Autres',          emoji: '📦' },
] as const

export const TYPES_COMPTES = [
  { value: 'COURANT',   label: 'Compte courant' },
  { value: 'EPARGNE',   label: 'Livret épargne' },
  { value: 'CREDIT',    label: 'Carte crédit' },
  { value: 'ESPECES',   label: 'Espèces' },
  { value: 'AUTRE',     label: 'Autre' },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

const d = <T>(r: { data: { data: T } }) => r.data.data

// ── API ───────────────────────────────────────────────────────────────────────

export const personalApi = {
  // Dashboard
  dashboard: () =>
    api.get<{ data: PersonalDashboard }>('/personal/dashboard').then(d),

  // Revenus
  revenus: {
    list: (params?: { mois?: number; annee?: number; categorie?: string }) =>
      api.get<{ data: PersonalRevenu[] }>('/personal/revenus', { params }).then(d),
    create: (body: Omit<PersonalRevenu, 'id' | 'createdAt'>) =>
      api.post<{ data: PersonalRevenu }>('/personal/revenus', body).then(d),
    update: (id: string, body: Partial<Omit<PersonalRevenu, 'id' | 'createdAt'>>) =>
      api.put(`/personal/revenus/${id}`, body),
    remove: (id: string) =>
      api.delete(`/personal/revenus/${id}`),
  },

  // Dépenses
  depenses: {
    list: (params?: { mois?: number; annee?: number; categorie?: string }) =>
      api.get<{ data: PersonalDepense[] }>('/personal/depenses', { params }).then(d),
    create: (body: Omit<PersonalDepense, 'id' | 'createdAt'>) =>
      api.post<{ data: PersonalDepense }>('/personal/depenses', body).then(d),
    update: (id: string, body: Partial<Omit<PersonalDepense, 'id' | 'createdAt'>>) =>
      api.put(`/personal/depenses/${id}`, body),
    remove: (id: string) =>
      api.delete(`/personal/depenses/${id}`),
  },

  // Objectifs
  objectifs: {
    list: () =>
      api.get<{ data: PersonalObjectif[] }>('/personal/objectifs').then(d),
    create: (body: { nom: string; montantCible: number; dateEcheance?: string }) =>
      api.post<{ data: PersonalObjectif }>('/personal/objectifs', body).then(d),
    update: (id: string, body: Partial<PersonalObjectif>) =>
      api.put(`/personal/objectifs/${id}`, body),
    remove: (id: string) =>
      api.delete(`/personal/objectifs/${id}`),
  },

  // Comptes
  comptes: {
    list: () =>
      api.get<{ data: PersonalCompte[] }>('/personal/comptes').then(d),
    create: (body: { nom: string; type: string; solde?: number }) =>
      api.post<{ data: PersonalCompte }>('/personal/comptes', body).then(d),
    update: (id: string, body: Partial<PersonalCompte>) =>
      api.put(`/personal/comptes/${id}`, body),
    remove: (id: string) =>
      api.delete(`/personal/comptes/${id}`),
  },
}
