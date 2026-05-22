import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { settingsApi, type CompanySettings } from '@/services/settingsApi'
import { useAuth } from '@/features/auth/useAuth'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { AtheisId } from '@/shared/components/ui/AtheisId'

// ── Logo : helpers localStorage ────────────────────────────────────────────────

const LOGO_KEY = 'athenis:company-logo'
const LOGO_MAX_BYTES = 500_000 // 500 KB après encodage base64 (~370 KB original)

function loadLogo(): string | null {
  return localStorage.getItem(LOGO_KEY)
}

function saveLogo(dataUrl: string): void {
  localStorage.setItem(LOGO_KEY, dataUrl)
  // Notifie les autres onglets / composants
  window.dispatchEvent(new StorageEvent('storage', { key: LOGO_KEY, newValue: dataUrl }))
}

function clearLogo(): void {
  localStorage.removeItem(LOGO_KEY)
  window.dispatchEvent(new StorageEvent('storage', { key: LOGO_KEY, newValue: null }))
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

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

const LEGAL_FORMS = ['SARL', 'SA', 'SAS', 'SNC', 'GIE', 'EI', 'EURL', 'SCP', 'Coopérative', 'Autre'] as const
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
  const { refreshCompany } = useCompanySettings()
  const [form, setForm]       = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── Logo ────────────────────────────────────────────────────────────────
  const [logo,      setLogo]      = useState<string | null>(loadLogo)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setLogoError('Veuillez sélectionner un fichier image (PNG, JPG, SVG…).')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError(`Fichier trop volumineux (${Math.round(file.size / 1024)} KB). Maximum : 500 KB.`)
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      saveLogo(dataUrl)
      setLogo(dataUrl)
    } catch {
      setLogoError('Impossible de lire le fichier.')
    }
    // Reset input to allow re-uploading the same file
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleLogoRemove() {
    clearLogo()
    setLogo(null)
    setLogoError(null)
  }

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
      // Propage les modifications (devise, pays, locale, etc.) à tous les
      // modules qui consomment useCompanySettings — sans nécessiter un reload.
      void refreshCompany()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      // Extraire le vrai message d'erreur de la réponse API si possible
      const apiErr = err as {
        response?: { data?: { error?: string; message?: string; details?: Record<string, string[]> } }
        message?: string
      }
      const data = apiErr?.response?.data
      let msg = data?.error ?? data?.message ?? apiErr?.message ?? 'Une erreur est survenue lors de la sauvegarde.'
      // Si l'API renvoie des erreurs par champ, les inclure dans le message
      if (data?.details && typeof data.details === 'object') {
        const fieldErrors = Object.entries(data.details)
          .map(([field, errs]) => `${field} : ${Array.isArray(errs) ? errs.join(', ') : String(errs)}`)
          .join(' · ')
        if (fieldErrors) msg = `${msg} (${fieldErrors})`
      }
      setError(msg)
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
          <div className="flex items-start gap-3">
            {logo ? (
              <div className="relative h-24 w-48 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center group">
                <img src={logo} alt="Logo de l'entreprise" className="max-h-full max-w-full object-contain p-2" />
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  className="absolute top-1 right-1 rounded-md bg-white/95 border border-gray-200 p-1 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                  title="Supprimer le logo"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h12a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM5 7a1 1 0 011 1v7a2 2 0 002 2h4a2 2 0 002-2V8a1 1 0 112 0v7a4 4 0 01-4 4H8a4 4 0 01-4-4V8a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-48 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400 hover:border-forest-300 hover:bg-forest-50/40 hover:text-forest-600 transition-colors select-none"
              >
                <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Cliquez pour uploader
              </button>
            )}

            <div className="flex flex-col gap-2 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {logo && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors self-start"
                >
                  📁 Changer le logo
                </button>
              )}
              <p className="text-[11px] text-gray-400">
                Formats acceptés : PNG, JPG, SVG, WebP — 500 KB max.<br />
                {logo
                  ? '✓ Apparaîtra automatiquement sur vos factures de vente.'
                  : '💡 Sera affiché en en-tête des factures de vente.'}
              </p>
              {logoError && <p className="text-[11px] text-red-600">{logoError}</p>}
            </div>
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

          <Field label="RCCM / SIREN">
            <input
              type="text"
              value={form.siren}
              onChange={set('siren')}
              className={INPUT_CLS}
              placeholder="ex: RC/DLA/2024/B/1234"
            />
          </Field>

          <Field label="NIU / SIRET">
            <input
              type="text"
              value={form.siret}
              onChange={set('siret')}
              className={INPUT_CLS}
              placeholder="ex: M123456789"
            />
          </Field>

          <Field label="Code NAF / Secteur">
            <input
              type="text"
              value={form.naf}
              onChange={set('naf')}
              className={INPUT_CLS}
              placeholder="ex: 6201Z"
            />
          </Field>

          <Field label="N° Contribuable TVA">
            <input
              type="text"
              value={form.vatNumber}
              onChange={set('vatNumber')}
              className={INPUT_CLS}
              placeholder="ex: P012345678901A"
            />
          </Field>

          <Field label="Capital social">
            <input
              type="number"
              value={form.capital}
              onChange={set('capital')}
              className={INPUT_CLS}
              placeholder="ex: 1 000 000"
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
              placeholder="+237 6 XX XX XX XX"
            />
          </Field>

          <Field label="Email de contact">
            <input
              type="email"
              value={form.contactEmail}
              onChange={set('contactEmail')}
              className={INPUT_CLS}
              placeholder="contact@entreprise.cm"
            />
          </Field>

          <Field label="Site web">
            <input
              type="url"
              value={form.website}
              onChange={set('website')}
              className={INPUT_CLS}
              placeholder="https://entreprise.cm"
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

      {/* ── SECTION 5 : Lien vers Factures de ventes ── */}
      <Link
        to="/app/settings/factures-ventes"
        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 hover:border-forest-300 hover:bg-forest-50/40 transition-colors group"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-800 group-hover:text-forest-900">
            🧾 Paramétrage des factures de ventes
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Choisir un modèle, configurer la numérotation (FV, devis, avoirs, BL, BC), gérer
            l'affichage et les coordonnées bancaires.
          </p>
        </div>
        <span className="text-gray-400 group-hover:text-forest-700 text-lg">→</span>
      </Link>

      {/* ── SECTION 6 : Lien vers Agences ── */}
      <Link
        to="/app/settings/agences"
        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 hover:border-forest-300 hover:bg-forest-50/40 transition-colors group"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-800 group-hover:text-forest-900">
            🏢 Agences &amp; Succursales
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Gérez vos agences, succursales et points de vente depuis l'onglet dédié.
          </p>
        </div>
        <span className="text-gray-400 group-hover:text-forest-700 text-lg">→</span>
      </Link>

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
