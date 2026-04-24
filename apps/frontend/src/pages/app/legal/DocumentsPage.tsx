import { useState } from 'react'

const DOCS = [
  { nom: 'Statuts constitutifs',         cat: 'Société',        date: '12/03/2019', taille: '245 Ko' },
  { nom: 'PV AG ordinaire 2024',          cat: 'Société',        date: '28/06/2024', taille: '89 Ko'  },
  { nom: 'PV AG ordinaire 2025',          cat: 'Société',        date: '30/06/2025', taille: '92 Ko'  },
  { nom: 'CGV B2B v2.1',                  cat: 'Contrats',       date: '15/01/2026', taille: '124 Ko' },
  { nom: 'Politique de confidentialité',  cat: 'RGPD',           date: '01/05/2025', taille: '78 Ko'  },
  { nom: 'Registre des traitements',      cat: 'RGPD',           date: '10/04/2026', taille: '156 Ko' },
  { nom: 'DUERP 2024',                    cat: 'Droit du travail', date: '20/11/2024', taille: '210 Ko' },
  { nom: 'Accord télétravail',            cat: 'Droit du travail', date: '01/09/2024', taille: '67 Ko'  },
]

const CAT_COLOR: Record<string, string> = {
  'Société': 'bg-forest-100 text-forest-700',
  'Contrats': 'bg-blue-100 text-blue-700',
  'RGPD': 'bg-purple-100 text-purple-700',
  'Droit du travail': 'bg-amber-100 text-amber-700',
}

export function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Tous')

  const cats = ['Tous', ...new Set(DOCS.map((d) => d.cat))]
  const visible = DOCS.filter(
    (d) =>
      (cat === 'Tous' || d.cat === cat) &&
      (!search || d.nom.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Documents légaux</h1>
          <p className="mt-1 text-sm text-gray-500">Archivage et gestion des documents juridiques</p>
        </div>
        <button className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
          + Ajouter
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Rechercher…"
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

      <div className="grid grid-cols-1 gap-2">
        {visible.map((d, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-2xl">📄</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{d.nom}</p>
                <p className="text-xs text-gray-400">Ajouté le {d.date} · {d.taille}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_COLOR[d.cat] ?? 'bg-gray-100 text-gray-600'}`}>
                {d.cat}
              </span>
              <button className="text-xs text-gray-400 hover:text-forest-700 transition-colors">⬇ Télécharger</button>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Aucun document trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}
