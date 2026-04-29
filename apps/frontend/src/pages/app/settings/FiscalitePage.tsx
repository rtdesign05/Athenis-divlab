import { useState, useEffect } from 'react'
import { useTaxConfig, useUpdateTaxConfig } from '@/hooks/useFiscal'
import { useRegimeDetection, useIgsBareme, useConfirmRegime } from '@/hooks/useFiscalRegime'
import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/services/settingsApi'
import type { TaxRegime, VatRegime, IgsPayment } from '@/services/fiscalApi'

const CENTRES_IMPOTS = [
  'CDI Douala Wouri', 'CDI Douala Bonanjo', 'CDI Yaoundé Centre',
  'CDI Bafoussam', 'CDI Garoua', 'DGE (grandes entreprises)',
]

const REGIME_LABELS: Record<string, string> = {
  IGS:              'IGS (Impôt Général Synthétique)',
  REEL_NORMAL:      'Réel Normal',
  REEL_SIMPLIFIE:   'Réel Simplifié',
  FORFAIT_BIENNAL:  'Forfait biennial',
  MICRO_ENTREPRISE: 'Micro-entreprise',
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4 border-b border-gray-100 pb-3">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function FieldRow({ label, children, info }: { label: string; children: React.ReactNode; info?: string }) {
  return (
    <div className="flex items-start gap-4 border-b border-gray-50 py-3 last:border-0">
      <div className="w-56 shrink-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {info && <p className="mt-0.5 text-xs text-gray-400">{info}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ReadonlyTag({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-900">{value}</span>
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">fixe</span>
    </div>
  )
}

// ── Section 0 — État du régime ────────────────────────────────────────────────

function RegimeStatusSection({ config, caActuel }: {
  config: ReturnType<typeof useTaxConfig>['data']
  caActuel?: number
}) {
  if (!config) return null
  const regime = config.taxRegime ?? 'REEL_NORMAL'
  const history = config.regimeHistory ?? {}
  const years = Object.entries(history).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 4)

  const regimeColor = regime === 'IGS'
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-blue-50 border-blue-200 text-blue-800'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <SectionHeader title="Section 0 — État du régime fiscal actuel" />
      <div className={`rounded-lg border p-4 ${regimeColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">Régime actif</p>
            <p className="mt-0.5 text-lg font-bold">{REGIME_LABELS[regime] ?? regime}</p>
            {config.professionLiberale && (
              <p className="mt-0.5 text-xs opacity-70">Profession libérale — Réel Normal obligatoire</p>
            )}
          </div>
          <div className="text-right">
            {regime === 'IGS' && config.igsClass && (
              <>
                <p className="text-xs opacity-70">Classe IGS</p>
                <p className="text-2xl font-bold">{config.igsClass}</p>
              </>
            )}
            {regime !== 'IGS' && caActuel !== undefined && (
              <>
                <p className="text-xs opacity-70">CA N-1</p>
                <p className="text-sm font-semibold">{(caActuel / 1_000_000).toFixed(1)}M F CFA</p>
              </>
            )}
          </div>
        </div>
      </div>

      {years.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Historique des régimes</p>
          <div className="space-y-1">
            {years.map(([yr, reg]) => (
              <div key={yr} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                <span className="text-gray-600">Exercice {yr}</span>
                <span className="font-medium text-gray-900">{REGIME_LABELS[reg] ?? reg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section 1 — Premier exercice ──────────────────────────────────────────────

function FirstYearSection() {
  const year = new Date().getFullYear()
  const { bareme, getClassFromCA, calculateIgsAmount } = useIgsBareme()
  const confirmRegime = useConfirmRegime()

  const [caPrevu, setCaPrevu] = useState(0)
  const [profLib, setProfLib] = useState(false)
  const [selectedRegime, setSelectedRegime] = useState<string>('')
  const [paymentMode, setPaymentMode] = useState<IgsPayment>('ANNUEL')
  const [adherentCga, setAdherentCga] = useState(false)

  const igsRow         = getClassFromCA(caPrevu)
  const igsAmount      = calculateIgsAmount(caPrevu, adherentCga)
  const igsAmountTrim  = Math.round(igsAmount / 4)

  const suggestedRegime = profLib ? 'REEL_NORMAL'
    : caPrevu >= 50_000_000 ? 'REEL_NORMAL'
    : caPrevu >= 10_000_000 ? 'IGS'
    : caPrevu > 0 ? 'IGS'
    : ''

  const handleConfirm = () => {
    const reg = selectedRegime || suggestedRegime
    if (!reg) return
    confirmRegime.mutate({
      year,
      regime: reg,
      ...(reg === 'IGS' && igsRow ? { igsClass: igsRow.classe } : {}),
      ...(reg === 'IGS' ? { paymentMode, adherentCga } : {}),
    })
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <SectionHeader
        title="Section 1 — Configuration du régime fiscal — Premier exercice"
        sub="Sélectionnez votre régime en fonction de votre chiffre d'affaires prévisionnel. Ce choix sera automatiquement réévalué à chaque clôture d'exercice."
      />

      <FieldRow label="CA prévisionnel annuel" info="En F CFA">
        <input
          type="number"
          value={caPrevu || ''}
          onChange={e => setCaPrevu(Number(e.target.value))}
          placeholder="Ex : 8 500 000"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FieldRow>

      <FieldRow label="Profession libérale ?">
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={profLib} onChange={() => setProfLib(true)}
              className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">Oui (médecin, avocat, consultant…)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!profLib} onChange={() => setProfLib(false)}
              className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">Non</span>
          </label>
        </div>
      </FieldRow>

      {/* Régime recommandé */}
      {caPrevu > 0 && suggestedRegime && (
        <div className="mt-4 space-y-3">
          {/* IGS (< 50M et non profLib) */}
          {suggestedRegime === 'IGS' && !profLib && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-green-800">
                    {caPrevu >= 10_000_000 ? '⚡ Deux options disponibles' : '✅ Régime recommandé : IGS'}
                  </p>
                  {igsRow && (
                    <>
                      <p className="mt-1 text-sm text-green-700">
                        Classe IGS {igsRow.classe} (CA {(igsRow.caMin / 1_000_000).toFixed(1)}M – {(igsRow.caMax / 1_000_000).toFixed(1)}M)
                      </p>
                      <p className="text-sm text-green-700">
                        Montant IGS : <strong>{igsAmount.toLocaleString('fr-FR')} F CFA/an</strong>
                        {adherentCga && ' (réduction CGA 30%)'}
                      </p>
                      <p className="text-xs text-green-600">
                        ou {igsAmountTrim.toLocaleString('fr-FR')} F CFA/trimestre
                      </p>
                    </>
                  )}
                  <div className="mt-2 text-xs text-green-700">
                    <p className="font-medium">Libératoire de :</p>
                    <p>✓ Patente · ✓ TVA · ✓ IRPP BIC/BNC</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2 border-t border-green-200 pt-3">
                <label className="flex items-center gap-2 text-sm text-green-800 cursor-pointer">
                  <input type="checkbox" checked={adherentCga}
                    onChange={e => setAdherentCga(e.target.checked)}
                    className="h-4 w-4 rounded text-green-600" />
                  Adhérent CGA (Centre de Gestion Agréé) — réduction 30%
                </label>

                <div className="flex gap-4 text-sm text-green-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={paymentMode === 'ANNUEL'}
                      onChange={() => setPaymentMode('ANNUEL')} className="h-4 w-4 text-green-600" />
                    Annuel — avant le 30 avril
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={paymentMode === 'TRIMESTRIEL'}
                      onChange={() => setPaymentMode('TRIMESTRIEL')} className="h-4 w-4 text-green-600" />
                    Trimestriel — 4 versements de {igsAmountTrim.toLocaleString('fr-FR')} F CFA
                  </label>
                </div>
              </div>

              {caPrevu >= 10_000_000 && (
                <div className="mt-3 rounded-lg border border-green-300 bg-white p-3 text-sm text-gray-700">
                  <p className="font-medium text-gray-800">Option Réel Simplifié disponible</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    TVA non applicable · IS sur bénéfices réels · Patente applicable · Comptabilité OHADA minimale
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio"
                      checked={selectedRegime === 'REEL_SIMPLIFIE'}
                      onChange={() => setSelectedRegime(s => s === 'REEL_SIMPLIFIE' ? '' : 'REEL_SIMPLIFIE')}
                      className="h-4 w-4 text-blue-600" />
                    Opter pour le Réel Simplifié
                  </label>
                  <p className="mt-1 text-xs text-amber-600">
                    💡 Si votre CA risque de dépasser 50M, anticipez avec le Réel Normal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Réel Normal obligatoire */}
          {(suggestedRegime === 'REEL_NORMAL') && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-bold text-blue-900">
                {profLib ? '⚖️ Régime obligatoire : RÉEL NORMAL' : '🏛 Régime obligatoire : RÉEL NORMAL'}
              </p>
              <p className="mt-1 text-sm text-blue-800">
                {profLib
                  ? 'Les professions libérales sont assujetties au Réel Normal quelque soit leur CA, conformément au CGI Cameroun.'
                  : `Votre CA prévisionnel dépasse 50 000 000 F CFA → Régime Réel Normal obligatoire.`}
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <p className="font-medium">Obligations :</p>
                <p>✓ TVA mensuelle (19,25%) · ✓ IS mensuel (acompte 2,2% CA)</p>
                <p>✓ Patente annuelle · ✓ DSF annuelle · ✓ Comptabilité SYSCOHADA complète</p>
              </div>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={confirmRegime.isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {confirmRegime.isPending ? 'Enregistrement…' : 'Confirmer et enregistrer le régime'}
          </button>
          {confirmRegime.isSuccess && (
            <p className="text-center text-sm font-medium text-green-700">✅ Régime fiscal enregistré</p>
          )}
        </div>
      )}

      {/* Barème IGS résumé */}
      {bareme.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">Voir le barème IGS 2026 complet</summary>
          <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Classe</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">CA max</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">IGS</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Avec CGA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bareme.map(r => (
                  <tr key={r.classe} className={igsRow?.classe === r.classe ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-1.5 text-gray-700">Classe {r.classe}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{(r.caMax / 1_000_000).toFixed(1)}M</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{r.montantBase.toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-green-700">{r.montantCga.toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}

// ── Section 2 — Réévaluation automatique ─────────────────────────────────────

function RegimeRevaluationSection({ currentYear }: { currentYear: number }) {
  const { data: detection, isLoading } = useRegimeDetection(currentYear)
  const confirmRegime = useConfirmRegime()
  const { getClassFromCA } = useIgsBareme()

  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
  if (!detection) return null

  const nextIgsRow = detection.nextRegime === 'IGS' ? getClassFromCA(detection.caActuel) : null

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <SectionHeader
        title="Section 2 — Réévaluation automatique du régime"
        sub={`Analyse de l'exercice ${currentYear} → détermination du régime ${currentYear + 1}`}
      />

      {/* Résultat analyse */}
      <div className={`rounded-lg border p-4 ${detection.hasChanged
        ? 'border-amber-200 bg-amber-50'
        : 'border-green-200 bg-green-50'}`}>
        <div className="flex items-start gap-3">
          <span className="text-lg">{detection.hasChanged ? '⚠️' : '✅'}</span>
          <div className="flex-1">
            <p className={`text-sm font-bold ${detection.hasChanged ? 'text-amber-900' : 'text-green-900'}`}>
              {detection.hasChanged
                ? `CHANGEMENT DE RÉGIME DÉTECTÉ pour ${currentYear + 1}`
                : `Régime ${currentYear + 1} confirmé : ${REGIME_LABELS[detection.nextRegime] ?? detection.nextRegime}`}
            </p>
            <p className="mt-1 text-sm text-gray-700">{detection.changeReason}</p>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-gray-500">CA {currentYear}</span>
                <p className="font-semibold text-gray-900">{(detection.caActuel / 1_000_000).toFixed(1)}M F CFA</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Seuil Réel Normal</span>
                <p className="font-semibold text-gray-900">50M F CFA</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Régime {currentYear}</span>
                <p className="font-semibold text-gray-900">{REGIME_LABELS[detection.currentRegime] ?? detection.currentRegime}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Régime {currentYear + 1}</span>
                <p className={`font-bold ${detection.hasChanged ? 'text-amber-800' : 'text-green-800'}`}>
                  {REGIME_LABELS[detection.nextRegime] ?? detection.nextRegime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IGS maintenu → nouvelle classe */}
      {!detection.hasChanged && detection.nextRegime === 'IGS' && nextIgsRow && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm">
          <p className="font-semibold text-blue-900">Classe IGS {currentYear + 1} : Classe {nextIgsRow.classe}</p>
          <p className="text-blue-700">
            Montant : {nextIgsRow.montantBase.toLocaleString('fr-FR')} F CFA
            {detection.igsAmount !== nextIgsRow.montantBase &&
              ` (était : ${(detection.igsAmount ?? 0).toLocaleString('fr-FR')} F CFA)`}
          </p>
        </div>
      )}

      {/* Nouvelles obligations si changement */}
      {detection.hasChanged && detection.newObligations.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Nouvelles obligations dès le 01/01/{currentYear + 1} :</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {detection.newObligations.map((ob, i) => <li key={i}>✓ {ob}</li>)}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {detection.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {detection.warnings.map((w, i) => (
            <p key={i} className="text-xs text-gray-500">⚠️ {w}</p>
          ))}
        </div>
      )}

      {/* Option volontaire Réel (si IGS) */}
      {detection.currentRegime === 'IGS' && !detection.hasChanged && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-800">💡 Option disponible</p>
          <p className="mt-1 text-sm text-gray-600">
            Vous êtes en IGS. Vous pouvez opter volontairement pour le Réel Normal.
          </p>
          <p className="mt-1 text-xs text-amber-600">
            ⚠️ Cette option est irréversible tant que le CA reste ≥ 50M.
          </p>
          <div className="mt-2 flex gap-2">
            <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white">
              Rester en IGS
            </button>
            <button
              onClick={() => confirmRegime.mutate({ year: currentYear + 1, regime: 'REEL_NORMAL' })}
              disabled={confirmRegime.isPending}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Opter pour le Réel Normal →
            </button>
          </div>
        </div>
      )}

      {/* Confirmer si changement obligatoire */}
      {detection.hasChanged && (
        <button
          onClick={() => confirmRegime.mutate({ year: currentYear + 1, regime: detection.nextRegime })}
          disabled={confirmRegime.isPending}
          className="mt-3 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {confirmRegime.isPending ? 'Confirmation…' : `Confirmer le changement de régime pour ${currentYear + 1}`}
        </button>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────

export function FiscalitePage() {
  const { data: config, isLoading: configLoading } = useTaxConfig()
  const { data: company } = useQuery({
    queryKey: ['company-settings'],
    queryFn:  () => settingsApi.getCompany(),
    staleTime: 5 * 60_000,
  })
  const updateConfig = useUpdateTaxConfig()

  const [form, setForm] = useState({
    niu: '', rccm: '', centerImpots: '', codeActivite: '',
    taxRegime: 'REEL_NORMAL' as TaxRegime,
    vatRegime: 'MENSUEL' as VatRegime,
    cnpsRate: 17.2, isAssujetti: true,
    professionLiberale: false,
  })

  useEffect(() => {
    if (config) {
      setForm({
        niu:                config.niu ?? '',
        rccm:               config.rccm ?? '',
        centerImpots:       config.centerImpots ?? '',
        codeActivite:       config.codeActivite ?? '',
        taxRegime:          config.taxRegime ?? 'REEL_NORMAL',
        vatRegime:          config.vatRegime ?? 'MENSUEL',
        cnpsRate:           Number(config.cnpsRate) * 100,
        isAssujetti:        config.isAssujetti,
        professionLiberale: config.professionLiberale,
      })
    }
  }, [config])

  const isCameroon  = (company?.country ?? config?.country) === 'CM'
  const isFirstYear = config?.isFirstYear ?? true
  const currentYear = new Date().getFullYear()

  const handleSave = () => {
    updateConfig.mutate({
      niu: form.niu, rccm: form.rccm,
      centerImpots: form.centerImpots, codeActivite: form.codeActivite,
      taxRegime: form.taxRegime, vatRegime: form.vatRegime,
      cnpsRate: form.cnpsRate / 100,
      isAssujetti: form.isAssujetti,
      professionLiberale: form.professionLiberale,
    } as never)
  }

  if (configLoading) return <div className="h-96 animate-pulse rounded-xl bg-gray-100" />

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Fiscalité</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Configuration fiscale — {isCameroon ? 'Cameroun · DGI · SYSCOHADA' : 'France · DGFiP'}
        </p>
      </div>

      {/* Section 0 — État du régime actuel */}
      {isCameroon && <RegimeStatusSection config={config} />}

      {/* Section 1 — Premier exercice (si isFirstYear) */}
      {isCameroon && isFirstYear && <FirstYearSection />}

      {/* Section 2 — Réévaluation (à partir du 2ème exercice) */}
      {isCameroon && !isFirstYear && <RegimeRevaluationSection currentYear={currentYear} />}

      {/* Section — Identification fiscale */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <SectionHeader title="Identification fiscale" />

        <FieldRow label="NIU *" info="Numéro d'Identifiant Unique">
          <input type="text" value={form.niu}
            onChange={e => setForm(f => ({ ...f, niu: e.target.value }))}
            placeholder="M021512789456K"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FieldRow>
        <FieldRow label="RCCM *">
          <input type="text" value={form.rccm}
            onChange={e => setForm(f => ({ ...f, rccm: e.target.value }))}
            placeholder="RC/DLA/2020/B/1247"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FieldRow>
        {isCameroon && (
          <FieldRow label="Centre des impôts *">
            <select value={form.centerImpots}
              onChange={e => setForm(f => ({ ...f, centerImpots: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner…</option>
              {CENTRES_IMPOTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FieldRow>
        )}
        <FieldRow label="Code activité CEMAC">
          <input type="text" value={form.codeActivite}
            onChange={e => setForm(f => ({ ...f, codeActivite: e.target.value }))}
            placeholder="7020Z"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FieldRow>
        {isCameroon && (
          <FieldRow label="Profession libérale">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.professionLiberale}
                onChange={e => setForm(f => ({ ...f, professionLiberale: e.target.checked }))}
                className="h-4 w-4 rounded text-blue-600" />
              Oui (médecin, avocat, expert-comptable, consultant…) → Réel Normal obligatoire
            </label>
          </FieldRow>
        )}
      </div>

      {/* Section — Taux applicables */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <SectionHeader title="Taux légaux applicables" />
        <p className="mb-3 text-xs text-gray-400">Les taux légaux CGI 2026 sont non modifiables.</p>
        <FieldRow label="TVA standard"><ReadonlyTag value="19,25%" /></FieldRow>
        <FieldRow label="IS Réel Normal"><ReadonlyTag value="33%" /></FieldRow>
        <FieldRow label="IS minimum"><ReadonlyTag value="1% du CA HT" /></FieldRow>
        <FieldRow label="Acompte IS mensuel"><ReadonlyTag value="2,2% du CA HT mensuel" /></FieldRow>
        <FieldRow label="RAS prestataires"><ReadonlyTag value="5,5% (5% + 0,5% CAC)" /></FieldRow>
        <FieldRow label="CNPS patronal" info="Configurable">
          <div className="flex items-center gap-2">
            <input type="number" value={form.cnpsRate}
              onChange={e => setForm(f => ({ ...f, cnpsRate: Number(e.target.value) }))}
              step={0.1} min={0} max={100}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </FieldRow>
      </div>

      {/* Section — Seuils */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <SectionHeader title="Seuils de régime — CGI 2026" />
        <FieldRow label="Seuil IGS → Réel Normal"><ReadonlyTag value="50 000 000 F CFA" /></FieldRow>
        <FieldRow label="IGS Classe 10 (max)"><ReadonlyTag value="30M – 50M F CFA" /></FieldRow>
        <FieldRow label="Seuil assujettissement TVA"><ReadonlyTag value="50 000 000 F CFA" /></FieldRow>
        <FieldRow label="Pénalité IGS non-paiement"><ReadonlyTag value="50% + fermeture + 1 000 000 F CFA" /></FieldRow>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={updateConfig.isPending}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {updateConfig.isPending ? 'Sauvegarde…' : 'Sauvegarder la configuration'}
        </button>
      </div>

      {updateConfig.isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          ✅ Configuration fiscale sauvegardée
        </div>
      )}
    </div>
  )
}
