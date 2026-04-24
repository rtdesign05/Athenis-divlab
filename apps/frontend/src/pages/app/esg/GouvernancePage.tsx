const INDICATEURS = [
  { label: '% femmes au conseil d\'administration', valeur: 33, unite: '%', objectif: 40, esrs: 'ESRS G1' },
  { label: 'Administrateurs indépendants',          valeur: 50, unite: '%', objectif: 50, esrs: 'ESRS G1' },
  { label: 'Code de conduite éthique publié',      valeur: 1,  unite: 'oui/non', objectif: 1, esrs: 'ESRS G1' },
  { label: 'Formations anti-corruption réalisées', valeur: 85, unite: '%',  objectif: 100, esrs: 'ESRS G1' },
  { label: 'Incidents éthiques signalés (N)',       valeur: 0,  unite: 'cas', objectif: 0, esrs: 'ESRS G1' },
  { label: 'Délai paiement fournisseurs',           valeur: 38, unite: 'jours', objectif: 45, esrs: 'ESRS G1' },
]

const CA_MEMBRES = [
  { nom: 'Marie Leclerc',   role: 'Présidente',           independant: true,  femme: true  },
  { nom: 'Jean Dupont',     role: 'DG',                   independant: false, femme: false },
  { nom: 'Claire Moreau',   role: 'Administratrice',      independant: true,  femme: true  },
  { nom: 'Antoine Bernard', role: 'Administrateur',       independant: false, femme: false },
  { nom: 'Sophie Blanc',    role: 'Administratrice indép.', independant: true, femme: true },
  { nom: 'Marc Legrand',    role: 'Administrateur indép.', independant: true,  femme: false },
]

export function GouvernancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Gouvernance</h1>
        <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS G1 — composition et éthique</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Femmes au CA</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">33%</p>
          <p className="text-xs text-amber-600 mt-1">Objectif : 40%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Indépendants</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">50%</p>
          <p className="text-xs text-green-600 mt-1">✓ Objectif atteint</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-xs font-medium text-green-600">Incidents éthiques</p>
          <p className="mt-1.5 text-3xl font-bold text-green-700">0</p>
          <p className="text-xs text-green-600 mt-1">✓ Aucun cette année</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Composition du conseil d'administration</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Membre</th>
              <th className="px-5 py-3">Rôle</th>
              <th className="px-5 py-3">Indépendant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {CA_MEMBRES.map((m, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{m.nom}</span>
                    {m.femme && <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-medium text-pink-600">F</span>}
                  </div>
                </td>
                <td className="px-5 py-2.5 text-gray-600">{m.role}</td>
                <td className="px-5 py-2.5">
                  {m.independant
                    ? <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">✓ Oui</span>
                    : <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Non</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Indicateurs ESRS G1</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {INDICATEURS.map((ind, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <p className="text-sm text-gray-700">{ind.label}</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">{ind.valeur} {ind.unite !== 'oui/non' ? ind.unite : (ind.valeur ? 'Oui' : 'Non')}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ind.valeur >= ind.objectif ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {ind.valeur >= ind.objectif ? '✓' : '○'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
