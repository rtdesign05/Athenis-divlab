import { api } from '@/lib/api'

const d = <T>(r: { data: { data: T } }) => r.data.data

// ── Types ──────────────────────────────────────────────────────────────────────

export type StockMethod = 'CMUP' | 'FIFO'

export type MouvType =
  | 'ENTREE_ACHAT' | 'ENTREE_RETOUR' | 'ENTREE_INVENTAIRE'
  | 'SORTIE_VENTE' | 'SORTIE_CASSE'  | 'SORTIE_INVENTAIRE'
  | 'TRANSFERT'    | 'AJUSTEMENT'

export interface StockFamily {
  id: string
  code: string
  nom: string
  description?: string
  articlesCount: number
  valeurStock: number
  createdAt: string
  updatedAt: string
}

export interface Article {
  id: string
  reference: string
  designation: string
  familleId?: string
  famille?: { id: string; code: string; nom: string }
  agenceId?: string | null
  agence?: { id: string; nom: string } | null
  unite: string
  prixAchat: number
  prixVente: number
  tvaAchat: number
  tvaVente: number
  stockActuel: number
  stockMin: number
  stockMax?: number
  valeurCmup: number
  methodeValuation: StockMethod
  isActive: boolean
  description?: string
  codeBarres?: string
  fournisseur?: string
  delaiAppro?: number
  emplacement?: string
  compteAchat?: string
  compteVente?: string
  createdAt: string
  updatedAt: string
}

export interface ArticleFiche extends Article {
  mouvements: StockMouvement[]
  valeurActuelle: number
}

export interface StockMouvement {
  id: string
  articleId: string
  article?: { id: string; reference: string; designation: string; unite: string }
  type: MouvType
  quantite: number
  prixUnitaire: number
  prixTotal: number
  stockAvant: number
  stockApres: number
  cmupAvant: number
  cmupApres: number
  reference?: string
  description?: string
  createdAt: string
}

export interface ValorisationLigne {
  id: string
  reference: string
  designation: string
  famille?: { code: string; nom: string }
  unite: string
  stockActuel: number
  valeurCmup: number
  methodeValuation: StockMethod
  valeurStock: number
}

export interface Valorisation {
  lignes: ValorisationLigne[]
  totalValeur: number
}

export interface Alerte {
  id: string
  reference: string
  designation: string
  famille?: { code: string; nom: string }
  unite: string
  fournisseur?: string
  delaiAppro?: number
  stockActuel: number
  stockMin: number
  isRupture: boolean
}

export interface TableauDeBord {
  articlesActifs: number
  alertesCount: number
  mouvementsMois: number
  valeurTotale: number
  top5Articles: ValorisationLigne[]
}

export interface Paginated<T> { items: T[]; total: number; page: number; limit: number; pages: number }

// ── API ────────────────────────────────────────────────────────────────────────

export const stocksApi = {
  // Dashboard
  tableauDeBord: () =>
    api.get<{ data: TableauDeBord }>('/stocks/tableau-de-bord').then(d),

  // Familles
  listFamilies: () =>
    api.get<{ data: StockFamily[] }>('/stocks/families').then(d),
  createFamily: (dto: { code: string; nom: string; description?: string }) =>
    api.post<{ data: StockFamily }>('/stocks/families', dto).then(d),
  updateFamily: (id: string, dto: Partial<{ code: string; nom: string; description: string }>) =>
    api.put<{ data: StockFamily }>(`/stocks/families/${id}`, dto).then(d),
  deleteFamily: (id: string) =>
    api.delete(`/stocks/families/${id}`),

  // Articles
  listArticles: (params?: { familleId?: string; search?: string; alerte?: boolean; isActive?: boolean; page?: number; limit?: number }) =>
    api.get<{ data: Paginated<Article> }>('/stocks/articles', { params }).then(d),
  getFiche: (id: string) =>
    api.get<{ data: ArticleFiche }>(`/stocks/articles/${id}/fiche`).then(d),
  createArticle: (dto: {
    designation: string; reference?: string; familleId?: string; agenceId?: string | null; unite?: string;
    prixAchat: number; prixVente: number; tvaAchat?: number; tvaVente?: number;
    stockInitial?: number; stockMin?: number; stockMax?: number;
    methodeValuation?: StockMethod; description?: string; codeBarres?: string;
    fournisseur?: string; delaiAppro?: number; emplacement?: string;
    compteAchat?: string; compteVente?: string;
  }) => api.post<{ data: Article }>('/stocks/articles', dto).then(d),
  updateArticle: (id: string, dto: Partial<{
    designation: string; reference?: string; familleId?: string; agenceId?: string | null; unite?: string;
    prixAchat: number; prixVente: number; tvaAchat?: number; tvaVente?: number;
    stockInitial?: number; stockMin?: number; stockMax?: number;
    methodeValuation?: StockMethod; description?: string; codeBarres?: string;
    fournisseur?: string; delaiAppro?: number; emplacement?: string;
    compteAchat?: string; compteVente?: string;
  }>) =>
    api.put<{ data: Article }>(`/stocks/articles/${id}`, dto).then(d),
  deleteArticle: (id: string) =>
    api.delete(`/stocks/articles/${id}`),

  // Mouvements
  listMouvements: (params?: { articleId?: string; type?: MouvType; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) =>
    api.get<{ data: Paginated<StockMouvement> }>('/stocks/mouvements', { params }).then(d),
  createMouvement: (dto: {
    articleId: string; type: MouvType; quantite: number; prixUnitaire: number;
    date?: string; reference?: string; description?: string;
  }) => api.post<{ data: StockMouvement }>('/stocks/mouvements', dto).then(d),

  // Valorisation & alertes
  valorisation: () =>
    api.get<{ data: Valorisation }>('/stocks/valorisation').then(d),
  alertes: () =>
    api.get<{ data: Alerte[] }>('/stocks/alertes').then(d),
}
