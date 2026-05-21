import { api } from '@/lib/api'

// ── Types (façade française pour le frontend) ────────────────────────────────
//
// Le backend (Prisma + Zod DTOs) utilise des noms anglais : label / amount /
// category / type / recurrent. Le frontend reste en français pour cohérence
// avec le reste de l'app. Les helpers `mapXxxIn / mapXxxOut` traduisent.

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

// ── Translation helpers ──────────────────────────────────────────────────────

type BackendRevenu  = { id: string; label: string; amount: string | number; type: string; date: string; recurrent: boolean; createdAt: string }
type BackendDepense = { id: string; label: string; amount: string | number; category: string; date: string; createdAt: string }
type BackendObjectif = { id: string; name: string; targetAmount: string | number; currentAmount: string | number; targetDate: string | null; createdAt: string }
type BackendCompte  = { id: string; nom: string; type: string; balance: string | number; createdAt: string }

const toNumber = (v: string | number): number => typeof v === 'number' ? v : Number(v) || 0

const mapRevenuIn = (b: BackendRevenu): PersonalRevenu => ({
  id:        b.id,
  libelle:   b.label,
  montant:   toNumber(b.amount),
  categorie: b.type,
  date:      b.date,
  recurrent: b.recurrent ?? false,
  createdAt: b.createdAt,
})

const mapDepenseIn = (b: BackendDepense & { recurrent?: boolean }): PersonalDepense => ({
  id:        b.id,
  libelle:   b.label,
  montant:   toNumber(b.amount),
  categorie: b.category,
  date:      b.date,
  recurrent: b.recurrent ?? false,
  createdAt: b.createdAt,
})

const mapObjectifIn = (b: BackendObjectif): PersonalObjectif => ({
  id:            b.id,
  nom:           b.name,
  montantCible:  toNumber(b.targetAmount),
  montantActuel: toNumber(b.currentAmount),
  dateEcheance:  b.targetDate,
  createdAt:     b.createdAt,
})

const mapCompteIn = (b: BackendCompte): PersonalCompte => ({
  id:        b.id,
  nom:       b.nom,
  type:      b.type,
  solde:     toNumber(b.balance),
  createdAt: b.createdAt,
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const d = <T>(r: { data: { data: T } }): T => r.data.data

// ── API ───────────────────────────────────────────────────────────────────────

type CreateRevenuFR  = Omit<PersonalRevenu, 'id' | 'createdAt'>
type CreateDepenseFR = Omit<PersonalDepense, 'id' | 'createdAt'>

export const personalApi = {
  // Dashboard (backend renvoie déjà en français — voir personal.service.getDashboard)
  dashboard: () =>
    api.get<{ data: PersonalDashboard }>('/personal/dashboard').then(d),

  // Revenus ───────────────────────────────────────────────────────────────────
  revenus: {
    list: (params?: { mois?: number; annee?: number; categorie?: string }) =>
      api.get<{ data: BackendRevenu[] }>('/personal/revenus', { params })
        .then(d)
        .then((arr) => arr.map(mapRevenuIn)),
    create: (body: CreateRevenuFR): Promise<PersonalRevenu> =>
      api.post<{ data: BackendRevenu }>('/personal/revenus', {
        label:     body.libelle,
        amount:    body.montant,
        type:      body.categorie,
        date:      body.date,
        recurrent: body.recurrent,
      }).then(d).then(mapRevenuIn),
    update: (id: string, body: Partial<CreateRevenuFR>) =>
      api.put(`/personal/revenus/${id}`, {
        ...(body.libelle   !== undefined ? { label:     body.libelle }   : {}),
        ...(body.montant   !== undefined ? { amount:    body.montant }   : {}),
        ...(body.categorie !== undefined ? { type:      body.categorie } : {}),
        ...(body.date      !== undefined ? { date:      body.date }      : {}),
        ...(body.recurrent !== undefined ? { recurrent: body.recurrent } : {}),
      }),
    remove: (id: string) =>
      api.delete(`/personal/revenus/${id}`),
  },

  // Dépenses ──────────────────────────────────────────────────────────────────
  depenses: {
    list: (params?: { mois?: number; annee?: number; categorie?: string }) =>
      api.get<{ data: BackendDepense[] }>('/personal/depenses', { params })
        .then(d)
        .then((arr) => arr.map(mapDepenseIn)),
    create: (body: CreateDepenseFR): Promise<PersonalDepense> =>
      api.post<{ data: BackendDepense }>('/personal/depenses', {
        label:    body.libelle,
        amount:   body.montant,
        category: body.categorie,
        date:     body.date,
        // recurrent envoyé même si le backend ne l'utilise pas (DTO l'accepte en optional)
        recurrent: body.recurrent,
      }).then(d).then(mapDepenseIn),
    update: (id: string, body: Partial<CreateDepenseFR>) =>
      api.put(`/personal/depenses/${id}`, {
        ...(body.libelle   !== undefined ? { label:    body.libelle }   : {}),
        ...(body.montant   !== undefined ? { amount:   body.montant }   : {}),
        ...(body.categorie !== undefined ? { category: body.categorie } : {}),
        ...(body.date      !== undefined ? { date:     body.date }      : {}),
        ...(body.recurrent !== undefined ? { recurrent: body.recurrent } : {}),
      }),
    remove: (id: string) =>
      api.delete(`/personal/depenses/${id}`),
  },

  // Objectifs ─────────────────────────────────────────────────────────────────
  objectifs: {
    list: () =>
      api.get<{ data: BackendObjectif[] }>('/personal/objectifs')
        .then(d)
        .then((arr) => arr.map(mapObjectifIn)),
    create: (body: { nom: string; montantCible: number; dateEcheance?: string }) =>
      api.post<{ data: BackendObjectif }>('/personal/objectifs', {
        label:        body.nom,
        targetAmount: body.montantCible,
        ...(body.dateEcheance ? { targetDate: body.dateEcheance } : {}),
      }).then(d).then(mapObjectifIn),
    update: (id: string, body: Partial<PersonalObjectif>) =>
      api.put(`/personal/objectifs/${id}`, {
        ...(body.nom           !== undefined ? { label:        body.nom }           : {}),
        ...(body.montantCible  !== undefined ? { targetAmount: body.montantCible }  : {}),
        ...(body.montantActuel !== undefined ? { currentAmount: body.montantActuel } : {}),
        ...(body.dateEcheance  !== undefined ? { targetDate:   body.dateEcheance }  : {}),
      }),
    remove: (id: string) =>
      api.delete(`/personal/objectifs/${id}`),
  },

  // Comptes ───────────────────────────────────────────────────────────────────
  comptes: {
    list: () =>
      api.get<{ data: BackendCompte[] }>('/personal/comptes')
        .then(d)
        .then((arr) => arr.map(mapCompteIn)),
    create: (body: { nom: string; type: string; solde?: number }) =>
      api.post<{ data: BackendCompte }>('/personal/comptes', {
        nom:     body.nom,
        type:    body.type,
        balance: body.solde ?? 0,
      }).then(d).then(mapCompteIn),
    update: (id: string, body: Partial<PersonalCompte>) =>
      api.put(`/personal/comptes/${id}`, {
        ...(body.nom   !== undefined ? { nom:     body.nom }   : {}),
        ...(body.type  !== undefined ? { type:    body.type }  : {}),
        ...(body.solde !== undefined ? { balance: body.solde } : {}),
      }),
    remove: (id: string) =>
      api.delete(`/personal/comptes/${id}`),
  },
}
