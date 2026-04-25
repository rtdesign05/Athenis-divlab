import { useState, useEffect } from 'react'
import { settingsApi, type CompanySettings } from '@/services/settingsApi'
import { useAuth } from '@/features/auth/useAuth'
import { AtheisId } from '@/shared/components/ui/AtheisId'

// ── helpers ───────────────────────────────────────────────────────────────────

function toStr(v: string | null | undefined): string {
  return v ?? ''
}

function toNum(v: number | null | undefined): string {
  return v !== null && v !== undefined ? String(v) : ''
}

// ── sub-components ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  children: React.ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">{title}</h2>
      {children}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  legalForm: string
  siren: string
  siret: string
  naf: string
  vatNumber: string
  capital: string
  address: string
  postalCode: string
  city: string
  phone: string
  contactEmail: string
  website: string
  primaryColor: string
  secondaryColor: string
  font: string
  invoiceMentions: string
  paymentTerms: string
  lateInterestRate: string
  discountRate: string
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500'
const SELECT_CLS = INPUT_CLS

const LEGAL_FORMS = ['SAS', 'SARL', 'SA', 'SNC', 'EI', 'EURL', 'SCP', 'Autre'] as const
const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New'] as const

function settingsToForm(s: CompanySettings): FormState {
  return {
    name:             toStr(s.name),
    legalForm:        toStr(s.legalForm),
    siren:            toStr(s.siren),
    siret:            toStr(s.siret),
    naf:              toStr(s.naf),
    vatNumber:        toStr(s.vatNumber),
    capital:          toNum(s.capital),
    address:          toStr(s.address),
    postalCode:       toStr(s.postalCode),
    city:             toStr(s.city),
    phone:            toStr(s.phone),
    contactEmail:     toStr(s.contactEmail),
    website:          toStr(s.website),
    primaryColor:     toStr(s.primaryColor) || '#1a3a2a',
    secondaryColor:   toStr(s.secondaryColor) || '#4a7c59',
    font:             toStr(s.font),
    invoiceMentions:  toStr(s.invoiceMentions),
    paymentTerms:     toNum(s.paymentTerms),
    lateInterestRate: toNum(s.lateInterestRate),
    discountRate:     toNum(s.discountRate),
  }
}

export function EntreprisePage() {
  const { user } = useAuth()
  const [form, setForm]       = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const data = await settingsApi.getCompany()
      setForm(settingsToForm(data))
    } catch {
      setError('Impossible de charger les paramètres de l\'entreprise.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)
    }
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const body: Partial<CompanySettings> = {
        name:             form.name,
        legalForm:        form.legalForm || null,
        siren:            form.siren || null,
        siret:            form.siret || null,
        naf:              form.naf || null,
        vatNumber:        form.vatNumber || null,
        capital:          form.capital !== '' ? Number(form.capital) : null,
        address:          form.address || null,
        postalCode:       form.postalCode || null,
        city:             form.city || null,
        phone:            form.phone || null,
        contactEmail:     form.contactEmail || null,
        website:          form.website || null,
        primaryColor:     form.primaryColor || null,
        secondaryColor:   form.secondaryColor || null,
        font:             form.font || null,
        invoiceMentions:  form.invoiceMentions || null,
        paymentTerms:     form.paymentTerms !== '' ? Number(form.paymentTerms) : null,
        lateInterestRate: form.lateInterestRate !== '' ? Number(form.lateInterestRate) : null,
        discountRate:     form.discountRate !== '' ? Number(form.discountRate) : null,
      }
      const updated = await settingsApi.updateCompany(body)
      setForm(settingsToForm(updated))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Une erreur est survenue lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-500 border-t-transparent" />
      </div>
    )
  }

  if (error && !form) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
        {error}
        <button onClick={loadData} className="ml-2 underline">Réessayer</button>
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Athenis identity header */}
      {user?.atheisNumber && (
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-4">
          <AtheisId number={user.atheisNumber} size="md" />
          <p className="mt-0.5 text-2xl font-semibold text-gray-900">{form?.name || '…'}</p>
          <p className="mt-1 text-sm text-gray-400">
            Membre depuis le {new Date(user.iat ? user.iat * 1000 : Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            {user.plan && ` · ${user.plan}`}
          </p>
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold text-gray-900">Entreprise</h1>
        <p className="mt-1 text-sm text-gray-500">
          Informations légales et apparence de votre entreprise
        </p>
      </div>

      {/* ── SECTION 1 : Identité ── */}
      <Section title="Identité">
        {/* Logo */}
        <Field label="Logo">
          <div className="flex h-24 w-48 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400 hover:border-gray-300 hover:bg-gray-100 transition-colors select-none">
            Cliquez pour uploader
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom de l'entreprise">
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              className={INPUT_CLS}
              placeholder="Ma Société SAS"
            />
          </Field>

          <Field label="Forme juridique">
            <select value={form.legalForm} onChange={set('legalForm')} className={SELECT_CLS}>
              <option value="">— Sélectionner —</option>
              {LEGAL_FORMS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>

          <Field label="SIREN">
            <input
              type="text"
              value={form.siren}
              onChange={set('siren')}
              className={INPUT_CLS}
              placeholder="123 456 789"
              maxLength={9}
            />
          </Field>

          <Field label="SIRET">
            <input
              type="text"
              value={form.siret}
              onChange={set('siret')}
              className={INPUT_CLS}
              placeholder="123 456 789 00012"
              maxLength={14}
            />
          </Field>

          <Field label="Code NAF / APE">
            <input
              type="text"
              value={form.naf}
              onChange={set('naf')}
              className={INPUT_CLS}
              placeholder="6201Z"
            />
          </Field>

          <Field label="N° TVA intracommunautaire">
            <input
              type="text"
              value={form.vatNumber}
              onChange={set('vatNumber')}
              className={INPUT_CLS}
              placeholder="FR 12 345678901"
            />
          </Field>

          <Field label="Capital social (€)">
            <input
              type="number"
              value={form.capital}
              onChange={set('capital')}
              className={INPUT_CLS}
              placeholder="10000"
              min={0}
            />
          </Field>
        </div>
      </Section>

      {/* ── SECTION 2 : Coordonnées ── */}
      <Section title="Coordonnées">
        <Field label="Adresse">
          <input
            type="text"
            value={form.address}
            onChange={set('address')}
            className={INPUT_CLS}
            placeholder="1 rue de la Paix"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Code postal">
            <input
              type="text"
              value={form.postalCode}
              onChange={set('postalCode')}
              className={INPUT_CLS}
              placeholder="75001"
            />
          </Field>

          <Field label="Ville">
            <input
              type="text"
              value={form.city}
              onChange={set('city')}
              className={INPUT_CLS}
              placeholder="Paris"
            />
          </Field>

          <Field label="Téléphone">
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              className={INPUT_CLS}
              placeholder="+33 1 23 45 67 89"
            />
          </Field>

          <Field label="Email de contact">
            <input
              type="email"
              value={form.contactEmail}
              onChange={set('contactEmail')}
              className={INPUT_CLS}
              placeholder="contact@masociete.fr"
            />
          </Field>

          <Field label="Site web">
            <input
              type="url"
              value={form.website}
              onChange={set('website')}
              className={INPUT_CLS}
              placeholder="https://masociete.fr"
            />
          </Field>
        </div>
      </Section>

      {/* ── SECTION 3 : Apparence ── */}
      <Section title="Apparence">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Couleur principale">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={set('primaryColor')}
                className="h-8 w-12 cursor-pointer rounded border border-gray-200 p-0.5"
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={set('primaryColor')}
                className={INPUT_CLS}
                placeholder="#1a3a2a"
                maxLength={7}
              />
            </div>
          </Field>

          <Field label="Couleur secondaire">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={set('secondaryColor')}
                className="h-8 w-12 cursor-pointer rounded border border-gray-200 p-0.5"
              />
              <input
                type="text"
                value={form.secondaryColor}
                onChange={set('secondaryColor')}
                className={INPUT_CLS}
                placeholder="#4a7c59"
                maxLength={7}
              />
            </div>
          </Field>

          <Field label="Police de caractères">
            <select value={form.font} onChange={set('font')} className={SELECT_CLS}>
              <option value="">— Par défaut —</option>
              {FONTS.map(f => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* ── SECTION 4 : Mentions légales ── */}
      <Section title="Mentions légales &amp; conditions">
        <Field label="Mentions légales sur les factures">
          <textarea
            value={form.invoiceMentions}
            onChange={set('invoiceMentions')}
            rows={4}
            className={`${INPUT_CLS} resize-none`}
            placeholder="TVA non applicable, art. 293 B du CGI…"
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Délai de paiement (jours)">
            <input
              type="number"
              value={form.paymentTerms}
              onChange={set('paymentTerms')}
              className={INPUT_CLS}
              placeholder="30"
              min={0}
            />
          </Field>

          <Field label="Taux d'intérêts de retard (%)">
            <input
              type="number"
              value={form.lateInterestRate}
              onChange={set('lateInterestRate')}
              className={INPUT_CLS}
              placeholder="3.00"
              step={0.01}
              min={0}
            />
          </Field>

          <Field label="Taux d'escompte (%)">
            <input
              type="number"
              value={form.discountRate}
              onChange={set('discountRate')}
              className={INPUT_CLS}
              placeholder="2.00"
              step={0.01}
              min={0}
            />
          </Field>
        </div>
      </Section>

      {/* ── Footer : messages + save ── */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm">
          {error && (
            <span className="text-red-600">{error}</span>
          )}
          {success && (
            <span className="text-green-600">Paramètres sauvegardés avec succès.</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-forest-900 px-5 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
