// Checklist standard de conformité — tous les items démarrent en "pending" pour
// les nouveaux utilisateurs (à eux de cocher au fur et à mesure de leur mise en
// conformité). Les statuts seront persistés via l'API quand elle sera prête.
const ITEMS = [
  { cat: 'Droit du travail',    label: 'Affichage obligatoire employeur',        statut: 'pending' },
  { cat: 'Droit du travail',    label: 'Registre unique du personnel à jour',    statut: 'pending' },
  { cat: 'Droit du travail',    label: 'Accords d\'entreprise déposés',          statut: 'pending' },
  { cat: 'Droit du travail',    label: 'DUERP mis à jour (< 12 mois)',           statut: 'pending' },
  { cat: 'Fiscal',              label: 'Déclarations TVA déposées',              statut: 'pending' },
  { cat: 'Fiscal',              label: 'Liasse fiscale N-1 déposée',             statut: 'pending' },
  { cat: 'Fiscal',              label: 'Acomptes IS payés',                      statut: 'pending' },
  { cat: 'RGPD',                label: 'Registre des traitements tenu',          statut: 'pending' },
  { cat: 'RGPD',                label: 'DPO désigné et notifié à la CNIL',       statut: 'pending' },
  { cat: 'RGPD',                label: 'Politique de confidentialité publiée',   statut: 'pending' },
  { cat: 'Société',             label: 'PV d\'AG annuelle rédigé',               statut: 'pending' },
  { cat: 'Société',             label: 'Comptes annuels déposés au greffe',      statut: 'pending' },
]

const STATUT: Record<string, { label: string; cls: string; icon: string }> = {
  ok:      { label: 'Conforme',   cls: 'bg-green-100 text-green-700',  icon: '✓' },
  pending: { label: 'À traiter',  cls: 'bg-amber-100 text-amber-700',  icon: '○' },
  late:    { label: 'En retard',  cls: 'bg-red-100 text-red-600',      icon: '✕' },
}

export function ConformitePage() {
  const cats = [...new Set(ITEMS.map((i) => i.cat))]
  const ok   = ITEMS.filter((i) => i.statut === 'ok').length
  const pct  = Math.round((ok / ITEMS.length) * 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Conformité</h1>
        <p className="mt-1 text-sm text-gray-500">Obligations légales et réglementaires</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Score de conformité global</p>
          <span className={`text-lg font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-forest-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="text-green-600 font-bold">✓</span> {ITEMS.filter(i => i.statut === 'ok').length} conformes</span>
          <span className="flex items-center gap-1"><span className="text-amber-600 font-bold">○</span> {ITEMS.filter(i => i.statut === 'pending').length} à traiter</span>
          <span className="flex items-center gap-1"><span className="text-red-600 font-bold">✕</span> {ITEMS.filter(i => i.statut === 'late').length} en retard</span>
        </div>
      </div>

      {cats.map((cat) => (
        <div key={cat} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">{cat}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {ITEMS.filter((i) => i.cat === cat).map((item, idx) => {
              const s = STATUT[item.statut]
              if (!s) return null
              return (
                <div key={idx} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm text-gray-700">{item.label}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                    {s.icon} {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
