import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PLAN_INFO } from '@athenis/shared-types'
import type { RegisterRequest, AccountType, Plan } from '@athenis/shared-types'

type Step = 1 | 2 | 3 | 4
type CompanySize = 'TPE' | 'PME' | 'ETI' | 'GE'

interface FormState {
  accountType: AccountType | null
  email: string
  password: string
  firstName: string
  lastName: string
  // company
  companyName: string
  siren: string
  secteur: string
  taille: CompanySize
  plan: Plan
  // cabinet
  cabinetName: string
  siret: string
}

const ACCOUNT_TYPES: { type: AccountType; label: string; desc: string; icon: string }[] = [
  { type: 'PERSONAL', label: 'Personne physique', desc: 'Budget personnel, épargne, revenus', icon: '👤' },
  { type: 'COMPANY', label: 'PME / Entreprise', desc: 'Gestion financière d\'entreprise', icon: '🏢' },
  { type: 'CABINET', label: 'Cabinet comptable', desc: 'Gestion multi-clients', icon: '⚖️' },
]

export function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>({
    accountType: null,
    email: '', password: '',
    firstName: '', lastName: '',
    companyName: '', siren: '', secteur: '', taille: 'PME', plan: 'FREE',
    cabinetName: '', siret: '',
  })

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function selectType(type: AccountType) {
    set('accountType', type)
    setStep(2)
  }

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

  async function submit() {
    setLoading(true)
    setError('')
    try {
      let dto: RegisterRequest
      const base = {
        email: form.email,
        password: form.password,
        ...(form.firstName ? { firstName: form.firstName } : {}),
        ...(form.lastName ? { lastName: form.lastName } : {}),
      }
      if (form.accountType === 'PERSONAL') {
        dto = { ...base, accountType: 'PERSONAL' }
      } else if (form.accountType === 'COMPANY') {
        dto = { ...base, accountType: 'COMPANY', companyName: form.companyName, taille: form.taille, plan: form.plan, ...(form.siren ? { siren: form.siren } : {}), ...(form.secteur ? { secteur: form.secteur } : {}) }
      } else {
        dto = { ...base, accountType: 'CABINET', cabinetName: form.cabinetName, ...(form.siret ? { siret: form.siret } : {}) }
      }
      await register(dto)
      const redirect = form.accountType === 'PERSONAL' ? '/personal/dashboard' : form.accountType === 'COMPANY' ? '/app/dashboard' : '/cabinet/dashboard'
      navigate(redirect)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Une erreur est survenue')
      setStep(form.accountType === 'COMPANY' ? 3 : 2)
    } finally {
      setLoading(false)
    }
  }

  // Step 4 triggers submission
  if (step === 4 && !loading && !error) {
    void submit()
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-1">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-forest-900' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {/* Step 1 — Choose account type */}
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

      {/* Step 2 — Base info + type-specific */}
      {step === 2 && (
        <div className="space-y-4">
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
          <h2 className="text-lg font-semibold text-gray-900">
            {form.accountType === 'PERSONAL' && 'Vos informations'}
            {form.accountType === 'COMPANY' && 'Votre entreprise'}
            {form.accountType === 'CABINET' && 'Votre cabinet'}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Prénom</label><input className="input mt-1" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
            <div><label className="label">Nom</label><input className="input mt-1" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
          </div>
          <div><label className="label">Email *</label><input type="email" required className="input mt-1" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><label className="label">Mot de passe *</label><input type="password" required className="input mt-1" placeholder="Min. 8 car., 1 majuscule, 1 chiffre" value={form.password} onChange={(e) => set('password', e.target.value)} /></div>

          {form.accountType === 'COMPANY' && (
            <>
              <div><label className="label">Raison sociale *</label><input required className="input mt-1" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">SIREN</label><input className="input mt-1" maxLength={9} placeholder="123456789" value={form.siren} onChange={(e) => set('siren', e.target.value)} /></div>
                <div>
                  <label className="label">Taille</label>
                  <select className="input mt-1" value={form.taille} onChange={(e) => set('taille', e.target.value as CompanySize)}>
                    <option value="TPE">TPE</option>
                    <option value="PME">PME</option>
                    <option value="ETI">ETI</option>
                    <option value="GE">GE</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Secteur d'activité</label><input className="input mt-1" placeholder="Ex: Commerce, Services…" value={form.secteur} onChange={(e) => set('secteur', e.target.value)} /></div>
            </>
          )}

          {form.accountType === 'CABINET' && (
            <>
              <div><label className="label">Nom du cabinet *</label><input required className="input mt-1" value={form.cabinetName} onChange={(e) => set('cabinetName', e.target.value)} /></div>
              <div><label className="label">SIRET</label><input className="input mt-1" maxLength={14} placeholder="12345678900012" value={form.siret} onChange={(e) => set('siret', e.target.value)} /></div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={nextStep} className="btn-primary w-full">
            {form.accountType === 'COMPANY' ? 'Choisir mon forfait →' : 'Créer mon compte'}
          </button>
        </div>
      )}

      {/* Step 3 — Plan selection (company only) */}
      {step === 3 && form.accountType === 'COMPANY' && (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
          <h2 className="text-lg font-semibold text-gray-900">Choisissez votre forfait</h2>
          <div className="space-y-3">
            {PLAN_INFO.map((info) => (
              <button
                key={info.plan}
                onClick={() => set('plan', info.plan)}
                className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                  form.plan === info.plan
                    ? 'border-forest-600 bg-forest-50'
                    : 'border-gray-200 bg-white hover:border-forest-300'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{info.label}</p>
                    <span className="text-sm font-bold text-forest-700">
                      {info.price === 0 ? 'Gratuit' : `${info.price}€/mois`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{info.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {info.modules.map((m) => (
                      <span key={m} className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-medium text-forest-800 capitalize">
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1.5 text-xs text-gray-400">
                    {info.limits.maxUsers ? `${info.limits.maxUsers} utilisateur${info.limits.maxUsers > 1 ? 's' : ''} max` : 'Utilisateurs illimités'}
                    {info.limits.maxInvoicesPerMonth ? ` · ${info.limits.maxInvoicesPerMonth} factures/mois` : ''}
                  </div>
                </div>
                {form.plan === info.plan && <span className="mt-0.5 text-forest-700">✓</span>}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={nextStep} className="btn-primary w-full">
            Créer mon compte
          </button>
        </div>
      )}

      {/* Step 4 — Loading */}
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
              <button onClick={() => setStep(form.accountType === 'COMPANY' ? 3 : 2)} className="btn-secondary">
                Réessayer
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
