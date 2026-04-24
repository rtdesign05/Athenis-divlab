export function LegalDashboard() {
  const contrats = [
    { titre: 'Contrat cadre ACME Corp',       statut: 'Signé',     expire: '31/12/2026', risque: 'low' },
    { titre: 'Accord de confidentialité TechX', statut: 'Signé',   expire: '01/09/2026', risque: 'medium' },
    { titre: 'CGV B2B v2.1',                  statut: 'En révision', expire: null,       risque: 'low' },
    { titre: 'Bail commercial bureaux',        statut: 'Signé',     expire: '31/03/2027', risque: 'low' },
  ]

  const alertes = [
    { type: 'warning', msg: 'NDA TechX expire dans 4 mois' },
    { type: 'info',    msg: 'Registre des traitements RGPD à mettre à jour avant le 30 mai' },
    { type: 'success', msg: 'Audit conformité Q1 validé' },
  ]

  const ALERT_STYLE: Record<string, string> = {
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info:    'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-green-200 bg-green-50 text-green-800',
  }
  const ALERT_ICON: Record<string, string> = { warning: '⚠', info: 'ℹ', success: '✓' }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Juridique</h1>
        <p className="mt-1 text-sm text-gray-500">Contrats actifs et alertes de conformité</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Contrats actifs</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">4</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-medium text-amber-600">Échéances proches</p>
          <p className="mt-1.5 text-3xl font-bold text-amber-700">1</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Score conformité</p>
          <p className="mt-1.5 text-3xl font-bold text-green-600">82%</p>
        </div>
      </div>

      <div className="space-y-2">
        {alertes.map((a, i) => (
          <div key={i} className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-sm ${ALERT_STYLE[a.type]}`}>
            <span>{ALERT_ICON[a.type]}</span>
            <span>{a.msg}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Contrats en cours</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {contrats.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.titre}</p>
                {c.expire && <p className="text-xs text-gray-400">Expire le {c.expire}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                c.statut === 'Signé' ? 'bg-green-100 text-green-700'
                  : c.statut === 'En révision' ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {c.statut}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
