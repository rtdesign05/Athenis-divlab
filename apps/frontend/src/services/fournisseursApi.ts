import { api } from '@/lib/api'

export type FournisseurCategorieApi =
  'MATIERES_PREMIERES' | 'SERVICES' | 'EQUIPEMENT' | 'LOGISTIQUE' | 'INFORMATIQUE' | 'AUTRE'

export interface ApiFournisseur {
  id:             string
  agenceId:       string | null
  agence:         { id: string; nom: string } | null
  nom:            string
  categorie:      FournisseurCategorieApi
  email:          string | null
  telephone:      string | null
  adresse:        string | null
  notes:          string | null
  accountingCode: string | null
  isActive:       boolean
  createdAt:      string
  updatedAt:      string
}

export interface CreateFournisseurPayload {
  nom:             string
  categorie?:      FournisseurCategorieApi
  email?:          string
  telephone?:      string
  adresse?:        string
  notes?:          string
  accountingCode?: string
  agenceId?:       string | null
}

export type UpdateFournisseurPayload = Partial<CreateFournisseurPayload>

const d = <T>(r: { data: { data: T } }) => r.data.data

export const fournisseursApi = {
  list:   () => api.get<{ data: ApiFournisseur[] }>('/fournisseurs').then(d),
  create: (p: CreateFournisseurPayload) =>
            api.post<{ data: ApiFournisseur }>('/fournisseurs', p).then(d),
  update: (id: string, p: UpdateFournisseurPayload) =>
            api.patch<{ data: ApiFournisseur }>(`/fournisseurs/${id}`, p).then(d),
  remove: (id: string) => api.delete(`/fournisseurs/${id}`),
}
