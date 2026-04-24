import { useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'

interface Article {
  ref: string
  nom: string
  categorie: string
  stock: number
  seuil: number
  unite: string
  prixUnitaire: number
}

const ARTICLES: Article[] = [
  { ref: 'ART-001', nom: 'Papier A4 (rame)',          categorie: 'Fournitures', stock: 42,  seuil: 10, unite: 'rame',  prixUnitaire: 3_200  },
  { ref: 'ART-002', nom: 'Stylos bille (boîte 50)',   categorie: 'Fournitures', stock: 3,   seuil: 5,  unite: 'boîte', prixUnitaire: 5_500  },
  { ref: 'ART-003', nom: 'Cartouches imprimante HP',  categorie: 'Informatique', stock: 8,  seuil: 4,  unite: 'unité', prixUnitaire: 16_400 },
  { ref: 'ART-004', nom: 'Cahiers reliure spirale',   categorie: 'Fournitures', stock: 0,   seuil: 5,  unite: 'unité', prixUnitaire: 2_100  },
  { ref: 'ART-005', nom: 'Clés USB 32 Go',            categorie: 'Informatique', stock: 15, seuil: 5,  unite: 'unité', prixUnitaire: 6_500  },
  { ref: 'ART-006', nom: 'Café moulu (kg)',            categorie: 'Divers',       stock: 2,  seuil: 3,  unite: 'kg',    prixUnitaire: 7_800  },
]

const CAT_COLOR: Record<string, string> = {
  Fournitures:  'bg-blue-100 text-blue-700',
  Informatique: 'bg-purple-100 text-purple-700',
  Divers:       'bg-gray-100 text-gray-600',
}

function statut(stock: number, seuil: number) {
  if (stock === 0)         return { label: 'Rupture',   cls: 'bg-red-100 text-red-700' }
  if (stock <= seuil)      return { label: 'Bas',       cls: 'bg-amber-100 text-amber-700' }
  return                          { label: 'OK',         cls: 'bg-green-100 text-green-700' }
}

export function StockPage() {
  const { fmt } = useCurrency()
  const [search, setSearch] = useState('')
  const [cat, setCat]       = useState('Tous')

  const cats    = ['Tous', ...new Set(ARTICLES.map((a) => a.categorie))]
  const ruptures = ARTICLES.filter((a) => a.stock <= a.seuil).length
  const valeurTotale = ARTICLES.reduce((s, a) => s + a.stock * a.prixUnitaire, 0)

  const visible = ARTICLES.filter(
    (a) =>
      (cat === 'Tous' || a.categorie === cat) &&
      (!search || `${a.ref} ${a.nom}`.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Stock</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion des articles et niveaux de stock</p>
        </div>
        <button className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
          + Ajouter un article
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Articles en stock</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">{ARTICLES.length}</p>
        </div>
        <div className={`rounded-xl border p-5 ${ruptures > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
          <p className={`text-xs font-medium ${ruptures > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Alertes stock bas</p>
          <p className={`mt-1.5 text-3xl font-bold ${ruptures > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{ruptures}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Valeur totale</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{fmt(valeurTotale)}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Rechercher un article…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <div className="flex gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                cat === c
                  ? 'bg-forest-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Référence</th>
              <th className="px-5 py-3">Article</th>
              <th className="px-5 py-3">Catégorie</th>
              <th className="px-5 py-3 text-right">Stock</th>
              <th className="px-5 py-3 text-right">Seuil alerte</th>
              <th className="px-5 py-3 text-right">Prix unit.</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                  Aucun article trouvé
                </td>
              </tr>
            ) : (
              visible.map((a) => {
                const s = statut(a.stock, a.seuil)
                return (
                  <tr key={a.ref} className={`hover:bg-gray-50/50 ${a.stock === 0 ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{a.ref}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{a.nom}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_COLOR[a.categorie] ?? 'bg-gray-100 text-gray-600'}`}>
                        {a.categorie}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-semibold ${a.stock === 0 ? 'text-red-600' : a.stock <= a.seuil ? 'text-amber-600' : 'text-gray-900'}`}>
                        {a.stock}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">{a.unite}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">{a.seuil}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{fmt(a.prixUnitaire)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
