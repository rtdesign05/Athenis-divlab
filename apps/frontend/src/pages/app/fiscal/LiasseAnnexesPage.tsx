import { useState } from 'react'
import { useLiasse } from '@/hooks/useFiscal'
import { NavLink } from 'react-router-dom'

const YEARS = [2024, 2025, 2026]

const ANNEXES = [
  { id: 'A1', title: 'État A1 — Immobilisations', desc: 'Liste et valeurs brutes des immobilisations corporelles et incorporelles', link: '/app/accounting/immobilisations', source: 'comptabilite' },
  { id: 'A2', title: 'État A2 — Amortissements', desc: 'Tableau des dotations aux amortissements et valeurs nettes comptables', link: '/app/accounting/immobilisations/amortissements', source: 'comptabilite' },
  { id: 'B',  title: 'État B — Provisions',      desc: "Provisions pour risques et charges — mouvements de l'exercice", link: null, source: 'fiscal' },
  { id: 'C',  title: 'État C — Déductions',      desc: 'Charges déductibles exceptionnelles et exonérations d\'impôt', link: null, source: 'fiscal' },
  { id: 'D',  title: "État D — Crédits d'impôt", desc: "Crédits d'impôt imputables sur l'IS de l'exercice", link: null, source: 'fiscal' },
  { id: 'E',  title: 'Récap TVA annuelle',        desc: "Récapitulatif des déclarations TVA de l'exercice", link: '/app/fiscal/tva/historique', source: 'fiscal' },
  { id: 'F',  title: 'État salaires & charges',  desc: "Masse salariale, CNPS patronal, FDFP de l'exercice", link: '/app/hr/paie', source: 'rh' },
]

const SOURCE_COLOR: Record<string, string> = {
  comptabilite: 'text-blue-600 bg-blue-50 border-blue-200',
  fiscal:       'text-green-700 bg-green-50 border-green-200',
  rh:           'text-purple-600 bg-purple-50 border-purple-200',
}

const SOURCE_LABEL: Record<string, string> = {
  comptabilite: 'Comptabilité',
  fiscal:       'Fiscalité',
  rh:           'Module RH',
}

export function LiasseAnnexesPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: liasse } = useLiasse(year)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tableaux annexes</h1>
          <p className="mt-0.5 text-sm text-gray-500">Documents annexes à joindre à la DSF — Art. R.225-105-1 CGI</p>
        </div>
        <div className="flex gap-2">
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${y === year ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {liasse && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Avancement liasse fiscale {year}</p>
            <span className="text-sm font-bold text-[#006633]">{liasse.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-[#006633] transition-all" style={{ width: `${liasse.progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">{liasse.done}/{liasse.total} documents disponibles</p>
        </div>
      )}

      {/* Annexes grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {ANNEXES.map(ann => {
          const liasseDoc = liasse?.documents.find(d => d.id === ann.id.toLowerCase() || d.label.includes(ann.id.split('—')[1]?.trim() ?? ''))
          const available = liasseDoc?.available ?? ann.source === 'fiscal'
          return (
            <div key={ann.id} className={`rounded-xl border p-4 ${available ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-gray-900">{ann.id}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_COLOR[ann.source] ?? ''}`}>
                      {SOURCE_LABEL[ann.source] ?? ann.source}
                    </span>
                    {liasseDoc?.required && (
                      <span className="text-[10px] text-red-500 font-medium">Obligatoire</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{ann.title.split('—')[1]?.trim() ?? ann.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{ann.desc}</p>
                </div>
                {available ? (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Disponible</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">A compléter</span>
                )}
              </div>
              {ann.link && (
                <NavLink to={ann.link}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#006633] hover:underline">
                  Accéder au module →
                </NavLink>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-[#006633]/20 bg-[#E8F5E9] p-4 text-sm text-[#006633]">
        <p className="font-semibold">Constitution de la liasse fiscale</p>
        <p className="mt-1 text-xs text-[#006633]/80">Les documents marqués "Disponible" sont générés automatiquement depuis les modules Comptabilité, RH et Fiscalité. Pour les documents manquants, saisissez les données dans les modules correspondants.</p>
      </div>
    </div>
  )
}
