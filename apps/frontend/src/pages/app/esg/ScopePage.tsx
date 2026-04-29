import { useState } from 'react'
import { useUpsertEsg } from '@/hooks/useEsg'
import type { UpsertEsgDto } from '@/services/esgApi'

const ELEC_FACTOR = 0.0000571 // tCO2e/kWh — réseau France

function numField(
  label: string, value: number | undefined,
  onChange: (v: number | undefined) => void,
  hint?: string,
) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input
        type="number" min={0} step="any"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </div>
  )
}

export function ScopePage() {
  const upsert = useUpsertEsg()
  const [year, setYear] = useState(new Date().getFullYear())
  const [saved, setSaved] = useState(false)

  const [s1, setS1] = useState<{ naturalGas?: number; fuelOil?: number; vehicles?: number; process?: number }>({})
  const [s2kwh, setS2kwh] = useState<number | undefined>()
  const [s3, setS3] = useState<{ businessTravel?: number; freight?: number; waste?: number; purchasedGoods?: number }>({})
  const [env, setEnv] = useState<{ energyKwh?: number; wasteKg?: number; renewableRatio?: number }>({})
  const [social, setSocial] = useState<{ genderPayGap?: number; trainingHours?: number; absenteeismRate?: number; workplaceAccidents?: number }>({})
  const [gov, setGov] = useState<{ boardFemaleRatio?: number; hasEthicsCode?: boolean; hasAnticorruption?: boolean }>({})

  // Compute totals
  const co2s1 = ((s1.naturalGas ?? 0) * 0.205) + ((s1.fuelOil ?? 0) * 0.00271) + ((s1.vehicles ?? 0) * 0.00244) + (s1.process ?? 0)
  const co2s2 = (s2kwh ?? 0) * ELEC_FACTOR
  const co2s3 = ((s3.businessTravel ?? 0) * 0.000255) + ((s3.freight ?? 0) * 0.000062) + ((s3.waste ?? 0) * 0.00000449) + ((s3.purchasedGoods ?? 0) * 0.30)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const dto: UpsertEsgDto = {
      year,
      ...(Object.keys(s1).length ? { scope1Details: s1 } : {}),
      ...(s2kwh !== undefined ? { scope2Kwh: s2kwh } : {}),
      ...(Object.keys(s3).length ? { scope3Details: s3 } : {}),
      ...env,
      ...social,
      ...gov,
    }
    await upsert.mutateAsync(dto)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saisie — Scopes 1 / 2 / 3</h1>
          <p className="text-sm text-gray-500">Calcul automatique des émissions GHG (facteurs ADEME 2024)</p>
        </div>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={year} onChange={e => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Scope 1 */}
        <div className="rounded-xl border border-green-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Scope 1 — Émissions directes</h2>
              <p className="text-xs text-gray-500">Combustion sur site, véhicules, process industriels</p>
            </div>
            <div className="rounded-lg bg-red-50 px-3 py-1.5 text-right">
              <p className="text-xs text-red-600">Total calculé</p>
              <p className="text-lg font-bold text-red-700">{co2s1.toFixed(3)} tCO2e</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {numField('Gaz naturel (MWh PCI)', s1.naturalGas, v => setS1(x => ({ ...x, ...(v !== undefined ? { naturalGas: v } : {}) })), `× 0.205 = ${((s1.naturalGas ?? 0) * 0.205).toFixed(3)} tCO2e`)}
            {numField('Fioul (litres)', s1.fuelOil,      v => setS1(x => ({ ...x, ...(v !== undefined ? { fuelOil: v } : {}) })),   `× 0.00271 = ${((s1.fuelOil ?? 0) * 0.00271).toFixed(3)} tCO2e`)}
            {numField('Carburant véhicules (L)', s1.vehicles, v => setS1(x => ({ ...x, ...(v !== undefined ? { vehicles: v } : {}) })), `× 0.00244 = ${((s1.vehicles ?? 0) * 0.00244).toFixed(3)} tCO2e`)}
            {numField('Émissions process directes (tCO2e)', s1.process, v => setS1(x => ({ ...x, ...(v !== undefined ? { process: v } : {}) })))}
          </div>
        </div>

        {/* Scope 2 */}
        <div className="rounded-xl border border-orange-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Scope 2 — Électricité achetée</h2>
              <p className="text-xs text-gray-500">Facteur réseau France RTE 2024 : 57.1 gCO2e/kWh</p>
            </div>
            <div className="rounded-lg bg-orange-50 px-3 py-1.5 text-right">
              <p className="text-xs text-orange-600">Total calculé</p>
              <p className="text-lg font-bold text-orange-700">{co2s2.toFixed(3)} tCO2e</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {numField('Consommation électricité (kWh)', s2kwh, setS2kwh, s2kwh ? `× 0.0000571 = ${(s2kwh * ELEC_FACTOR).toFixed(3)} tCO2e` : undefined)}
          </div>
        </div>

        {/* Scope 3 */}
        <div className="rounded-xl border border-yellow-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Scope 3 — Émissions indirectes</h2>
              <p className="text-xs text-gray-500">Chaîne de valeur : déplacements, achats, déchets, fret</p>
            </div>
            <div className="rounded-lg bg-yellow-50 px-3 py-1.5 text-right">
              <p className="text-xs text-yellow-600">Total calculé</p>
              <p className="text-lg font-bold text-yellow-700">{co2s3.toFixed(3)} tCO2e</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {numField('Déplacements pro (km)', s3.businessTravel, v => setS3(x => ({ ...x, ...(v !== undefined ? { businessTravel: v } : {}) })), s3.businessTravel ? `× 0.000255 = ${((s3.businessTravel ?? 0) * 0.000255).toFixed(3)} tCO2e` : undefined)}
            {numField('Fret routier (tonne·km)', s3.freight, v => setS3(x => ({ ...x, ...(v !== undefined ? { freight: v } : {}) })), s3.freight ? `× 0.000062 = ${((s3.freight ?? 0) * 0.000062).toFixed(3)} tCO2e` : undefined)}
            {numField('Déchets (kg)', s3.waste, v => setS3(x => ({ ...x, ...(v !== undefined ? { waste: v } : {}) })), s3.waste ? `× 0.00000449 = ${((s3.waste ?? 0) * 0.00000449).toFixed(3)} tCO2e` : undefined)}
            {numField('Achats (k€)', s3.purchasedGoods, v => setS3(x => ({ ...x, ...(v !== undefined ? { purchasedGoods: v } : {}) })), s3.purchasedGoods ? `× 0.30 = ${((s3.purchasedGoods ?? 0) * 0.30).toFixed(3)} tCO2e` : undefined)}
          </div>
        </div>

        {/* CO2 summary */}
        <div className="rounded-xl border-2 border-gray-300 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Total émissions GHG calculées</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: 'Scope 1', value: co2s1, color: 'text-red-600' },
              { label: 'Scope 2', value: co2s2, color: 'text-orange-600' },
              { label: 'Scope 3', value: co2s3, color: 'text-yellow-600' },
              { label: 'TOTAL',   value: co2s1 + co2s2 + co2s3, color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className={`text-xl font-bold ${color}`}>{value.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{label} (tCO2e)</p>
              </div>
            ))}
          </div>
        </div>

        {/* Social & Governance */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-blue-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Indicateurs sociaux (S)</h2>
            <div className="space-y-3">
              {numField('Écart salarial H/F (%)', social.genderPayGap, v => setSocial(x => ({ ...x, ...(v !== undefined ? { genderPayGap: v } : {}) })))}
              {numField('Formation (h/salarié/an)', social.trainingHours, v => setSocial(x => ({ ...x, ...(v !== undefined ? { trainingHours: v } : {}) })))}
              {numField('Taux absentéisme (%)', social.absenteeismRate, v => setSocial(x => ({ ...x, ...(v !== undefined ? { absenteeismRate: v } : {}) })))}
              {numField('Accidents du travail', social.workplaceAccidents, v => setSocial(x => ({ ...x, ...(v !== undefined ? { workplaceAccidents: Math.round(v) } : {}) })))}
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Gouvernance (G)</h2>
            <div className="space-y-3">
              {numField('Femmes au CA (%)', gov.boardFemaleRatio, v => setGov(x => ({ ...x, ...(v !== undefined ? { boardFemaleRatio: v } : {}) })))}
              {numField('Énergie renouvelable (%)', env.renewableRatio, v => setEnv(x => ({ ...x, ...(v !== undefined ? { renewableRatio: v } : {}) })))}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ethics" className="accent-purple-600"
                  checked={gov.hasEthicsCode ?? false}
                  onChange={e => setGov(x => ({ ...x, hasEthicsCode: e.target.checked }))} />
                <label htmlFor="ethics" className="text-sm text-gray-700">Code d'éthique formalisé</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="anticorr" className="accent-purple-600"
                  checked={gov.hasAnticorruption ?? false}
                  onChange={e => setGov(x => ({ ...x, hasAnticorruption: e.target.checked }))} />
                <label htmlFor="anticorr" className="text-sm text-gray-700">Politique anticorruption</label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && <p className="text-sm text-green-600 font-medium">✓ Données sauvegardées</p>}
          <button type="submit" disabled={upsert.isPending}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {upsert.isPending ? 'Sauvegarde…' : 'Sauvegarder & calculer le score'}
          </button>
        </div>
      </form>
    </div>
  )
}
