import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PLAN_INFO, ALL_COUNTRIES, getCountryConfig, getAllPlansPricing } from '@athenis/shared-types'
import type { RegisterRequest, AccountType, Plan, CountryListItem } from '@athenis/shared-types'

type Step = 1 | 2 | 3 | 4
type CompanySize = 'TPE' | 'PME' | 'ETI' | 'GE'

interface FormState {
  accountType: AccountType | null
  email: string
  password: string
  firstName: string
  lastName: string
  country: string
  // company
  companyName: string
  siren: string
  niu: string
  secteur: string
  taille: CompanySize
  plan: Plan
  // cabinet
  cabinetName: string
  siret: string
}

const ACCOUNT_TYPES: { type: AccountType; label: string; desc: string; icon: string }[] = [
  { type: 'PERSONAL', label: 'Personne physique', desc: 'Budget personnel, épargne, revenus', icon: '👤' },
  { type: 'COMPANY',  label: 'PME / Entreprise',  desc: "Gestion financière d'entreprise",   icon: '🏢' },
  { type: 'CABINET',  label: 'Cabinet comptable',  desc: 'Gestion multi-clients',              icon: '⚖️' },
]

// ── Country selector ──────────────────────────────────────────────────────────

function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref      = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const filtered: CountryListItem[] = search
    ? ALL_COUNTRIES.filter(
        (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : (ALL_COUNTRIES as unknown as CountryListItem[])

  const selected = ALL_COUNTRIES.find((c) => c.code === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input mt-1 flex w-full items-center gap-2 text-left"
      >
        <span className="text-lg leading-none">{selected?.flag ?? '🌍'}</span>
        <span className="flex-1 truncate">{selected?.name ?? 'Sélectionner un pays'}</span>
        <span className="text-xs text-gray-400">{open ? '▲' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher un pays…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">Aucun pays trouvé</li>
            ) : filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); setSearch('') }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                    c.code === value ? 'bg-forest-50 text-forest-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Country / currency badge ──────────────────────────────────────────────────

function CountryBadge({ countryCode, showFull }: { countryCode: string; showFull?: boolean }) {
  const cfg = getCountryConfig(countryCode)
  if (showFull) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 text-sm space-y-1.5">
        <p className="font-semibold text-gray-900">{cfg.flag} {cfg.name}</p>
        <p className="text-gray-600">
          Devise : <span className="font-medium text-gray-800">{cfg.currency} ({cfg.currencySymbol})</span>
        </p>
        <p className="text-gray-600">
          Plan comptable : <span className="font-medium text-gray-800">{cfg.accountingPlan}</span>
        </p>
        <p className="text-gray-600">
          Normes : <span className="font-medium text-gray-800">{cfg.accountingNorms}</span>
        </p>
      </div>
    )
  }
  // Compact inline badge
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
      <span className="text-base">{cfg.flag}</span>
      <span className="text-gray-700">{cfg.name}</span>
      <span className="ml-auto font-medium text-gray-900">{cfg.currencySymbol} {cfg.currencyCode}</span>
    </div>
  )
}

// ── Main Register component ───────────────────────────────────────────────────

export function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { register } = useAuth()

  const presetType = searchParams.get('type') as AccountType | null
  const [step, setStep]     = useState<Step>(presetType ? 2 : 1)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [error])

  const [form, setForm] = useState<FormState>({
    accountType: presetType,
    email: '', password: '',
    firstName: '', lastName: '',
    country: 'CM',
    companyName: '', siren: '', niu: '', secteur: '', taille: 'PME', plan: 'FREE',
    cabinetName: '', siret: '',
  })

  // IP-based country detection
  const countryTouched = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { country_code?: string }) => {
        const code = data.country_code?.toUpperCase()
        if (code && !countryTouched.current && ALL_COUNTRIES.some((c) => c.code === code)) {
          setForm((f) => ({ ...f, country: code }))
        }
      })
      .catch(() => { /* keep default */ })
    return () => controller.abort()
  }, [])

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function changeCountry(code: string) {
    countryTouched.current = true
    set('country', code)
  }

  function selectType(type: AccountType) { set('accountType', type); setStep(2) }

  function nextStep() {
    setError('')
    if (step === 2) {
      if (!form.email || !form.password) { setError('Email et mot de passe requis'); return }
      if (form.accountType === 'COMPANY') { setStep(3); return }
      setStep(4)
    } else if (step === 3) {
      setStep(4)
    }
  }

  // Guard against double-submit: React StrictMode renders twice in dev, and
  // the finally { setLoading(false) } could re-trigger a render-body call before
  // navigate() unmounts the component in production.
  const submitCalledRef = useRef(false)

  useEffect(() => {
    if (step === 4) {
      if (!submitCalledRef.current) {
        submitCalledRef.current = true
        void submit()
      }
    } else {
      // Reset guard so the user can retry after being sent back to step 2/3
      submitCalledRef.current = false
    }
    // submit is recreated each render; we intentionally only re-run when step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function submit() {
    setLoading(true); setError('')
    try {
      let dto: RegisterRequest
      const base = {
        email: form.email, password: form.password,
        ...(form.firstName ? { firstName: form.firstName } : {}),
        ...(form.lastName  ? { lastName:  form.lastName  } : {}),
      }
      if (form.accountType === 'PERSONAL') {
        dto = { ...base, accountType: 'PERSONAL', country: form.country }
      } else if (form.accountType === 'COMPANY') {
        dto = {
          ...base,
          accountType: 'COMPANY',
          companyName: form.companyName,
          taille: form.taille,
          plan: form.plan,
          country: form.country,
          ...(form.siren   ? { siren:   form.siren   } : {}),
          ...(form.niu     ? { niu:     form.niu     } : {}),
          ...(form.secteur ? { secteur: form.secteur } : {}),
        }
      } else {
        dto = {
          ...base,
          accountType: 'CABINET',
          cabinetName: form.cabinetName,
          country: form.country,
          ...(form.siret ? { siret: form.siret } : {}),
          ...(form.niu   ? { niu:   form.niu   } : {}),
        }
      }
      const { requiresEmailVerification } = await register(dto)
      if (requiresEmailVerification) {
        navigate(`/auth/verify-email?pending=1&email=${encodeURIComponent(form.email)}`)
      } else {
        const redirect = form.accountType === 'PERSONAL' ? '/personal/dashboard'
          : form.accountType === 'COMPANY' ? '/app/dashboard'
          : '/cabinet/dashboard'
        navigate(redirect)
      }
    } catch (e: unknown) {
      const axiosErr = e as { response?: { status?: number; data?: { error?: string } } }
      const status = axiosErr?.response?.status
      const msg    = axiosErr?.response?.data?.error
      setError(msg ?? 'Une erreur est survenue')
      if (status === 409) {
        setStep(2)
      } else {
        setStep(form.accountType === 'COMPANY' ? 3 : 2)
      }
    } finally {
      setLoading(false)
    }
  }

  // Derived
  const isCompany = form.accountType === 'COMPANY'
  const isCabinet = form.accountType === 'CABINET'
  const showNiu   = form.country === 'CM' && (isCompany || isCabinet)
  const showSiren = isCompany && form.country === 'FR'

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
    <div ref={cardRef} className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
    <div className="space-y-6">

      {/* Progress */}
      <div className="flex gap-1">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-forest-900' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* ── Step 1 — Choose account type ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-center text-lg font-semibold text-gray-900">Quel type de compte ?</h2>
          <div className="space-y-3">
            {ACCOUNT_TYPES.map((at) => (
              <button
                key={at.type}
                onClick={() => selectType(at.type)}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-forest-600 hover:shadow-card-md"
              >
                <span className="text-3xl">{at.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{at.label}</p>
                  <p className="text-sm text-gray-500">{at.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/auth/login" className="font-medium text-forest-700 hover:text-forest-900">Se connecter</Link>
          </p>
        </div>
      )}

      {/* ── Step 2 — Info + country (all types) ──────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
          <h2 className="text-lg font-semibold text-gray-900">
            {form.accountType === 'PERSONAL' && 'Vos informations'}
            {isCompany && 'Votre entreprise'}
            {isCabinet && 'Votre cabinet'}
          </h2>

          {/* Identité */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Prénom</label><input className="input mt-1" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
            <div><label className="label">Nom</label><input className="input mt-1" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" required className="input mt-1" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Mot de passe *</label>
            <input type="password" required className="input mt-1" placeholder="Min. 8 car., 1 majuscule, 1 chiffre" value={form.password} onChange={(e) => set('password', e.target.value)} />
          </div>

          {/* Company-specific fields */}
          {isCompany && (
            <>
              <div>
                <label className="label">Raison sociale *</label>
                <input required className="input mt-1" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Taille</label>
                  <select className="input mt-1" value={form.taille} onChange={(e) => set('taille', e.target.value as CompanySize)}>
                    <option value="TPE">TPE (&lt; 10 sal.)</option>
                    <option value="PME">PME (10–250)</option>
                    <option value="ETI">ETI (250–5000)</option>
                    <option value="GE">GE (&gt; 5000)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Secteur</label>
                  <input className="input mt-1" placeholder="Commerce, Services…" value={form.secteur} onChange={(e) => set('secteur', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Cabinet-specific fields */}
          {isCabinet && (
            <div>
              <label className="label">Nom du cabinet *</label>
              <input required className="input mt-1" value={form.cabinetName} onChange={(e) => set('cabinetName', e.target.value)} />
            </div>
          )}

          {/* ── Country — shown for ALL account types ───────────────────────── */}
          <div>
            <label className="label">Pays *</label>
            <CountrySelect value={form.country} onChange={changeCountry} />
          </div>

          {/* Currency / accounting info badge */}
          {form.country && (
            <CountryBadge countryCode={form.country} showFull={isCompany} />
          )}

          {/* SIREN — France companies only */}
          {showSiren && (
            <div>
              <label className="label">SIREN</label>
              <input className="input mt-1" maxLength={9} placeholder="123 456 789" value={form.siren} onChange={(e) => set('siren', e.target.value.replace(/\D/g, ''))} />
            </div>
          )}

          {/* SIRET — France cabinets only */}
          {isCabinet && form.country === 'FR' && (
            <div>
              <label className="label">SIRET</label>
              <input className="input mt-1" maxLength={14} placeholder="12345678900012" value={form.siret} onChange={(e) => set('siret', e.target.value.replace(/\D/g, ''))} />
            </div>
          )}

          {/* NIU — Cameroon companies & cabinets */}
          {showNiu && (
            <div>
              <label className="label">NIU <span className="text-gray-400 font-normal">(Numéro d'Identification Unique)</span></label>
              <input
                className="input mt-1 uppercase"
                placeholder="Ex : M111111111111A"
                value={form.niu}
                onChange={(e) => set('niu', e.target.value.toUpperCase())}
              />
              <p className="mt-1 text-xs text-gray-400">Délivré par la DGI — Cameroun. Champ optionnel, vous pourrez l'ajouter plus tard.</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <button onClick={nextStep} className="btn-primary w-full">
            {isCompany ? 'Choisir mon forfait →' : 'Créer mon compte'}
          </button>
        </div>
      )}

      {/* ── Step 3 — Plan selection (company only) ────────────────────────────── */}
      {step === 3 && isCompany && (() => {
        // Tarifs adaptés au pays sélectionné en step 2
        const cfg     = getCountryConfig(form.country)
        const pricing = getAllPlansPricing(cfg.currencyCode, cfg.locale, cfg.currencySymbol)
        return (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Choisissez votre forfait</h2>
            <p className="mt-1 text-xs text-gray-500">
              Prix affichés en <strong className="text-gray-700">{cfg.currency}</strong> ({cfg.currencySymbol}) — adaptés à {cfg.name}.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {PLAN_INFO.map((info) => {
              const price = pricing[info.plan]
              return (
              <button
                key={info.plan}
                onClick={() => set('plan', info.plan)}
                className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                  form.plan === info.plan ? 'border-forest-600 bg-forest-50' : 'border-gray-200 bg-white hover:border-forest-300'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{info.label}</p>
                    <span className="text-sm font-bold text-forest-700">
                      {price.amount === 0 ? 'Gratuit' : `${price.formatted}/mois`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{info.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {info.modules.map((m) => (
                      <span key={m} className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-medium text-forest-800 capitalize">{m}</span>
                    ))}
                  </div>
                  <div className="mt-1.5 text-xs text-gray-400">
                    {info.limits.maxUsers ? `${info.limits.maxUsers} utilisateur${info.limits.maxUsers > 1 ? 's' : ''} max` : 'Utilisateurs illimités'}
                    {info.limits.maxInvoicesPerMonth ? ` · ${info.limits.maxInvoicesPerMonth} factures/mois` : ''}
                    {price.amount > 0 && <> · ou {price.yearlyFormatted}/an (2 mois offerts)</>}
                  </div>
                </div>
                {form.plan === info.plan && <span className="mt-0.5 text-forest-700">✓</span>}
              </button>
              )
            })}
          </div>

          <button onClick={nextStep} className="btn-primary w-full">Créer mon compte</button>
        </div>
        )
      })()}

      {/* ── Step 4 — Loading/submitting ───────────────────────────────────────── */}
      {step === 4 && (
        <div className="flex flex-col items-center gap-4 py-8">
          {loading ? (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
              <p className="text-sm text-gray-500">Création de votre compte…</p>
            </>
          ) : error ? (
            <>
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={() => setStep(isCompany ? 3 : 2)} className="btn-secondary">Réessayer</button>
            </>
          ) : null}
        </div>
      )}

    </div>
    </div>
    </div>
  )
}
