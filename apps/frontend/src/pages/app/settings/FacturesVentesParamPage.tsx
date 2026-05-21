/**
 * Paramétrage des factures de ventes
 *
 * Configuration centralisée :
 *   • Modèle de facture (4 templates au choix)
 *   • Numérotation par type de document (FV, DEV, AV, BL, BC)
 *   • Affichage des éléments (logo, QR, signature, watermark…)
 *   • Mentions et clauses légales
 *   • Coordonnées bancaires
 *
 * Stockage : localStorage (sera migré vers settingsApi quand le backend
 * exposera les champs invoiceTemplate / numberingConfig…).
 */

import { useState, useEffect, useRef } from 'react'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { Link } from 'react-router-dom'
import {
  type TemplateId,
  type DocType,
  type NumberingConfig,
  type DisplayOptions,
  type BankInfo,
  type InvoiceConfig,
  DEFAULT_INVOICE_CONFIG,
  loadInvoiceConfig,
  saveInvoiceConfig,
} from '@/lib/invoiceConfig'

// ── Aliases locaux (rétro-compatibilité interne) ──────────────────────────────

const DEFAULT_CONFIG = DEFAULT_INVOICE_CONFIG
const loadConfig     = loadInvoiceConfig
const saveConfig     = saveInvoiceConfig

// ── Labels / order ────────────────────────────────────────────────────────────

const DOC_LABELS: Record<DocType, { label: string; icon: string; color: string }> = {
  FV:  { label: 'Factures de vente',  icon: '🧾', color: 'border-green-300 bg-green-50'  },
  DEV: { label: 'Devis',              icon: '📋', color: 'border-blue-300 bg-blue-50'    },
  AV:  { label: 'Avoirs',             icon: '↩️', color: 'border-amber-300 bg-amber-50'  },
  BL:  { label: 'Bons de livraison',  icon: '🚚', color: 'border-indigo-300 bg-indigo-50'},
  BC:  { label: 'Bons de commande',   icon: '📝', color: 'border-purple-300 bg-purple-50'},
}

const DOC_ORDER: DocType[] = ['FV', 'DEV', 'AV', 'BL', 'BC']

/** Génère un exemple de numéro de document à partir de la config */
function previewNumber(n: NumberingConfig): string {
  const parts: string[] = [n.prefix]
  if (n.yearFormat === 'full')  parts.push(String(new Date().getFullYear()))
  if (n.yearFormat === 'short') parts.push(String(new Date().getFullYear()).slice(2))
  if (n.monthIn)                parts.push(String(new Date().getMonth() + 1).padStart(2, '0'))
  parts.push(String(n.startNumber).padStart(n.padding, '0'))
  return parts.join(n.separator)
}

// ── Composants de prévisualisation des modèles ────────────────────────────────

function TemplatePreview({ id, primary, logoUrl }: { id: TemplateId; primary: string; logoUrl: string | null }) {
  const fontSize = 4
  const styles = {
    classique: {
      bg: 'bg-white',
      headerBg: primary,
      titleColor: '#fff',
      accent: primary,
    },
    moderne: {
      bg: 'bg-white',
      headerBg: '#1f2937',
      titleColor: '#fff',
      accent: '#f59e0b',
    },
    minimaliste: {
      bg: 'bg-white',
      headerBg: 'transparent',
      titleColor: '#111',
      accent: '#111',
    },
    colore: {
      bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
      headerBg: '#7c3aed',
      titleColor: '#fff',
      accent: '#ec4899',
    },
  }[id]

  if (id === 'minimaliste') {
    return (
      <div className={`relative w-full h-full ${styles.bg} p-2`}>
        <div className="flex items-start justify-between border-b border-gray-900 pb-1 mb-1.5">
          <div>
            {logoUrl ? <img src={logoUrl} alt="" className="h-4 max-w-[40px] object-contain mb-0.5" /> :
              <div className="text-[5px] font-bold text-gray-900">ENTREPRISE</div>}
            <div className="text-[3px] text-gray-500">Adresse · NIU 12345</div>
          </div>
          <div className="text-right">
            <div className="text-[6px] font-bold text-gray-900">FACTURE</div>
            <div className="text-[3px] text-gray-600">FV-2026-0001</div>
          </div>
        </div>
        <div className="space-y-0.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between text-[3px] text-gray-700">
              <span>Ligne {i}</span>
              <span>—</span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 left-2 right-2 border-t border-gray-300 pt-1 flex justify-between text-[4px] font-bold text-gray-900">
          <span>TOTAL TTC</span><span>119 000</span>
        </div>
      </div>
    )
  }

  if (id === 'moderne') {
    return (
      <div className={`relative w-full h-full ${styles.bg} overflow-hidden`}>
        <div style={{ backgroundColor: styles.headerBg }} className="px-2 py-1.5 flex items-center justify-between">
          {logoUrl
            ? <img src={logoUrl} alt="" className="h-5 max-w-[40px] object-contain" />
            : <div className="text-[6px] font-bold" style={{ color: styles.titleColor }}>VOTRE LOGO</div>
          }
          <div className="text-right">
            <div className="text-[7px] font-bold" style={{ color: styles.titleColor }}>FACTURE</div>
            <div className="text-[3px]" style={{ color: '#cbd5e1' }}>FV-2026-0001</div>
          </div>
        </div>
        <div className="p-2 space-y-1">
          <div className="rounded border border-gray-200 p-1">
            <div className="text-[3px] text-gray-400">Client</div>
            <div className="text-[4px] font-bold text-gray-800">Aperçu client</div>
          </div>
          <div className="rounded p-1" style={{ backgroundColor: '#f3f4f6' }}>
            <div className="flex justify-between text-[3px] text-gray-700"><span>Prestation</span><span>100K</span></div>
            <div className="flex justify-between text-[3px] text-gray-700"><span>TVA</span><span>19K</span></div>
          </div>
          <div className="rounded px-2 py-1 flex justify-between" style={{ backgroundColor: styles.accent, color: '#fff' }}>
            <span className="text-[4px] font-bold">TOTAL</span>
            <span className="text-[4px] font-bold">119 000</span>
          </div>
        </div>
      </div>
    )
  }

  if (id === 'colore') {
    return (
      <div className={`relative w-full h-full ${styles.bg}`}>
        <div style={{ backgroundColor: styles.headerBg }} className="px-2 py-1.5 rounded-b-lg flex items-center justify-between">
          {logoUrl
            ? <img src={logoUrl} alt="" className="h-5 max-w-[40px] object-contain bg-white rounded p-0.5" />
            : <div className="text-[6px] font-bold" style={{ color: styles.titleColor }}>VOTRE LOGO</div>
          }
          <div className="text-right">
            <div className="text-[7px] font-bold" style={{ color: styles.titleColor }}>FACTURE</div>
            <div className="text-[3px]" style={{ color: '#e9d5ff' }}>FV-2026-0001</div>
          </div>
        </div>
        <div className="p-2 space-y-1">
          <div className="flex gap-1">
            <div className="flex-1 rounded-lg border-l-2 border-purple-400 bg-white p-1">
              <div className="text-[3px] text-gray-400">CLIENT</div>
              <div className="text-[4px] font-bold text-gray-800">ACME</div>
            </div>
            <div className="flex-1 rounded-lg border-l-2 border-pink-400 bg-white p-1">
              <div className="text-[3px] text-gray-400">DATE</div>
              <div className="text-[4px] font-bold text-gray-800">15/05/26</div>
            </div>
          </div>
          <div className="rounded-lg bg-white border border-pink-200 p-1">
            <div className="flex justify-between text-[3px]"><span>Prestation</span><span>100K</span></div>
            <div className="flex justify-between text-[3px]"><span>TVA</span><span>19K</span></div>
          </div>
          <div className="rounded-lg px-2 py-1 flex justify-between text-white" style={{ background: `linear-gradient(90deg, ${styles.headerBg}, ${styles.accent})` }}>
            <span className="text-[4px] font-bold">TOTAL</span>
            <span className="text-[4px] font-bold">119 000</span>
          </div>
        </div>
      </div>
    )
  }

  // classique (par défaut)
  return (
    <div className={`relative w-full h-full ${styles.bg} p-2`}>
      <div className="flex items-start justify-between mb-1.5">
        <div>
          {logoUrl
            ? <img src={logoUrl} alt="" className="h-5 max-w-[40px] object-contain mb-0.5" />
            : <div className="text-[5px] font-bold" style={{ color: styles.accent }}>VOTRE LOGO</div>
          }
          <div className="text-[3px] text-gray-600">Adresse de l'entreprise</div>
        </div>
        <div className="text-right">
          <span className="text-[5px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: styles.accent }}>
            FACTURE
          </span>
          <div className="text-[3px] text-gray-600 mt-0.5">FV-2026-0001</div>
        </div>
      </div>
      <div className="border-t pt-1 mb-1" style={{ borderColor: styles.accent }} />
      <div className="border border-gray-300">
        <div style={{ backgroundColor: styles.accent }} className="px-1 py-0.5 flex justify-between text-[3px] font-bold text-white">
          <span>Description</span><span>Montant</span>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="px-1 py-0.5 flex justify-between text-[3px] border-t border-gray-200">
            <span>Ligne {i}</span><span>—</span>
          </div>
        ))}
        <div style={{ backgroundColor: styles.accent }} className="px-1 py-0.5 flex justify-between text-[3px] font-bold text-white">
          <span>TOTAL TTC</span><span>119 000</span>
        </div>
      </div>
    </div>
  )
  void fontSize
}

// ── Page principale ───────────────────────────────────────────────────────────

export function FacturesVentesParamPage() {
  const { company } = useCompanySettings()
  const primaryColor = company?.primaryColor ?? '#1a3a2a'

  const [config, setConfig]   = useState<InvoiceConfig>(loadConfig)
  const [savedFlash, setFlash] = useState(false)
  const [section, setSection] = useState<'modeles' | 'numerotation' | 'affichage' | 'bank' | 'mentions'>('modeles')

  // Logo enregistré côté Entreprise (clé partagée)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  useEffect(() => {
    setLogoUrl(localStorage.getItem('athenis:company-logo'))
    const onStorage = () => setLogoUrl(localStorage.getItem('athenis:company-logo'))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function update<K extends keyof InvoiceConfig>(key: K, value: InvoiceConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  function updateDisplay<K extends keyof DisplayOptions>(key: K, value: DisplayOptions[K]) {
    setConfig(prev => ({ ...prev, display: { ...prev.display, [key]: value } }))
  }

  function updateBank<K extends keyof BankInfo>(key: K, value: BankInfo[K]) {
    setConfig(prev => ({ ...prev, bank: { ...prev.bank, [key]: value } }))
  }

  function updateNumbering<K extends keyof NumberingConfig>(doc: DocType, key: K, value: NumberingConfig[K]) {
    setConfig(prev => ({
      ...prev,
      numbering: { ...prev.numbering, [doc]: { ...prev.numbering[doc], [key]: value } },
    }))
  }

  function handleSave() {
    saveConfig(config)
    setFlash(true)
    setTimeout(() => setFlash(false), 2500)
  }

  function handleReset() {
    if (confirm('Réinitialiser toute la configuration des factures aux valeurs par défaut ?')) {
      setConfig(DEFAULT_CONFIG)
      saveConfig(DEFAULT_CONFIG)
    }
  }

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Paramétrage des factures de ventes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configurez l'apparence, la numérotation et les mentions de vos documents commerciaux.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedFlash && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium animate-fade-in">
              ✓ Configuration sauvegardée
            </span>
          )}
          <button
            onClick={handleReset}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            ↺ Réinitialiser
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-forest-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-forest-700 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {/* Bandeau : logo manquant */}
      {!logoUrl && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between gap-3">
          <span>
            <strong>💡 Aucun logo détecté.</strong> Ajoutez votre logo dans <Link to="/app/settings/entreprise" className="underline font-semibold">Paramètres → Entreprise</Link> pour qu'il apparaisse sur les factures.
          </span>
        </div>
      )}

      {/* Navigation des sections */}
      <div className="border-b border-gray-200 flex flex-wrap gap-1">
        {[
          { id: 'modeles' as const,      label: '🎨 Modèles' },
          { id: 'numerotation' as const, label: '🔢 Numérotation' },
          { id: 'affichage' as const,    label: '👁 Affichage' },
          { id: 'bank' as const,         label: '🏦 Coordonnées bancaires' },
          { id: 'mentions' as const,     label: '📝 Mentions & clauses' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              section === s.id ? 'border-forest-900 text-forest-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Section : Modèles ── */}
      {section === 'modeles' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Choisissez le modèle visuel appliqué à toutes vos factures de vente. La couleur principale est
            définie dans <Link to="/app/settings/entreprise" className="text-forest-700 hover:underline">Entreprise → Apparence</Link>.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(['classique', 'moderne', 'minimaliste', 'colore'] as TemplateId[]).map(t => {
              const labels = { classique: 'Classique', moderne: 'Moderne', minimaliste: 'Minimaliste', colore: 'Coloré' } as const
              const desc = {
                classique:   'Sobre et professionnel — vert forêt',
                moderne:     'Banner sombre — accents orangés',
                minimaliste: 'Noir & blanc — typographie épurée',
                colore:      'Dégradé violet/rose — moderne',
              } as const
              const selected = config.template === t
              return (
                <button
                  key={t}
                  onClick={() => update('template', t)}
                  className={`group rounded-xl border-2 overflow-hidden transition-all text-left ${
                    selected ? 'border-forest-700 shadow-md ring-2 ring-forest-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Miniature */}
                  <div className="h-40 bg-gray-50 border-b border-gray-100 overflow-hidden">
                    <TemplatePreview id={t} primary={primaryColor} logoUrl={logoUrl} />
                  </div>
                  {/* Légende */}
                  <div className="p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${selected ? 'text-forest-700' : 'text-gray-800'}`}>
                        {labels[t]}
                      </span>
                      {selected && <span className="text-[10px] rounded-full bg-forest-100 text-forest-700 px-2 py-0.5 font-bold">ACTIF</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{desc[t]}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Section : Numérotation ── */}
      {section === 'numerotation' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Définissez le format des numéros pour chaque type de document. Chaque type a son propre compteur indépendant.
          </p>

          <div className="space-y-3">
            {DOC_ORDER.map(doc => {
              const cfg = config.numbering[doc]
              const meta = DOC_LABELS[doc]
              return (
                <div key={doc} className={`rounded-xl border-2 ${meta.color} p-4`}>
                  {/* En-tête */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{meta.icon}</span>
                      <h3 className="text-sm font-bold text-gray-800">{meta.label}</h3>
                    </div>
                    <div className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 font-mono text-sm font-bold text-gray-800">
                      {previewNumber(cfg)}
                    </div>
                  </div>

                  {/* Champs */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Préfixe</label>
                      <input
                        type="text"
                        value={cfg.prefix}
                        onChange={e => updateNumbering(doc, 'prefix', e.target.value.toUpperCase().slice(0, 6))}
                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-forest-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Séparateur</label>
                      <select
                        value={cfg.separator}
                        onChange={e => updateNumbering(doc, 'separator', e.target.value)}
                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                      >
                        <option value="-">tiret (-)</option>
                        <option value="/">slash (/)</option>
                        <option value=".">point (.)</option>
                        <option value="_">underscore (_)</option>
                        <option value="">aucun</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Année</label>
                      <select
                        value={cfg.yearFormat}
                        onChange={e => updateNumbering(doc, 'yearFormat', e.target.value as NumberingConfig['yearFormat'])}
                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                      >
                        <option value="full">2026</option>
                        <option value="short">26</option>
                        <option value="none">Aucune</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Mois</label>
                      <label className="flex items-center gap-1.5 mt-1.5">
                        <input
                          type="checkbox"
                          checked={cfg.monthIn}
                          onChange={e => updateNumbering(doc, 'monthIn', e.target.checked)}
                          className="rounded text-forest-600 focus:ring-forest-500"
                        />
                        <span className="text-xs text-gray-600">Inclure</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Chiffres</label>
                      <input
                        type="number"
                        min={1} max={8}
                        value={cfg.padding}
                        onChange={e => updateNumbering(doc, 'padding', Math.max(1, Math.min(8, parseInt(e.target.value) || 4)))}
                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-forest-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Reset</label>
                      <select
                        value={cfg.reset}
                        onChange={e => updateNumbering(doc, 'reset', e.target.value as NumberingConfig['reset'])}
                        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                      >
                        <option value="yearly">Annuel</option>
                        <option value="monthly">Mensuel</option>
                        <option value="never">Jamais</option>
                      </select>
                    </div>
                  </div>

                  {/* Numéro de départ */}
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <label className="text-gray-500">Numéro de départ :</label>
                    <input
                      type="number"
                      min={1}
                      value={cfg.startNumber}
                      onChange={e => updateNumbering(doc, 'startNumber', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-forest-500"
                    />
                    <span className="text-gray-400">→ prochain numéro émis</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Section : Affichage ── */}
      {section === 'affichage' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Activez ou désactivez les éléments visibles sur vos factures de vente.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ToggleCard
              icon="🖼"
              label="Logo de l'entreprise"
              desc="Affiche le logo en en-tête (configuré dans Entreprise)"
              checked={config.display.showLogo}
              onChange={v => updateDisplay('showLogo', v)}
              warning={!logoUrl ? 'Aucun logo défini — l\'option est inactive' : null}
            />
            <ToggleCard
              icon="🆔"
              label="Numéro TVA / NIU"
              desc="Affiche le numéro de contribuable dans l'en-tête"
              checked={config.display.showVatNumber}
              onChange={v => updateDisplay('showVatNumber', v)}
            />
            <ToggleCard
              icon="📱"
              label="QR Code de vérification"
              desc="QR pour vérifier l'authenticité du document"
              checked={config.display.showQrCode}
              onChange={v => updateDisplay('showQrCode', v)}
            />
            <ToggleCard
              icon="✍️"
              label="Cadre signature"
              desc="Zone de signature manuscrite au bas du document"
              checked={config.display.showSignature}
              onChange={v => updateDisplay('showSignature', v)}
            />
            <ToggleCard
              icon="🏦"
              label="Coordonnées bancaires"
              desc="RIB / IBAN affiché pour faciliter le règlement"
              checked={config.display.showBankInfo}
              onChange={v => updateDisplay('showBankInfo', v)}
            />
            <ToggleCard
              icon="⚠️"
              label="Pénalités de retard"
              desc="Mention des intérêts de retard légaux"
              checked={config.display.showLatePenalty}
              onChange={v => updateDisplay('showLatePenalty', v)}
            />
            <ToggleCard
              icon="💸"
              label="Escompte"
              desc="Mention du taux d'escompte pour règlement anticipé"
              checked={config.display.showDiscount}
              onChange={v => updateDisplay('showDiscount', v)}
            />
            <div className={`rounded-xl border ${config.display.showWatermark ? 'border-forest-300 bg-forest-50' : 'border-gray-200 bg-white'} p-3`}>
              <ToggleCard
                inline
                icon="💧"
                label="Filigrane"
                desc="Texte en filigrane diagonal sur le document"
                checked={config.display.showWatermark}
                onChange={v => updateDisplay('showWatermark', v)}
              />
              {config.display.showWatermark && (
                <input
                  type="text"
                  value={config.display.watermarkText}
                  onChange={e => updateDisplay('watermarkText', e.target.value.toUpperCase().slice(0, 20))}
                  placeholder="DUPLICATA"
                  className="mt-3 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-mono uppercase tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Section : Coordonnées bancaires ── */}
      {section === 'bank' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Ces coordonnées seront affichées au bas des factures (si l'option est activée dans Affichage).
          </p>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Banque</label>
                <input
                  type="text"
                  value={config.bank.bankName}
                  onChange={e => updateBank('bankName', e.target.value)}
                  placeholder="ex : BICEC, UBA, Ecobank…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code BIC / SWIFT</label>
                <input
                  type="text"
                  value={config.bank.bic}
                  onChange={e => updateBank('bic', e.target.value.toUpperCase())}
                  placeholder="ex : BICECMCX"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">IBAN</label>
              <input
                type="text"
                value={config.bank.iban}
                onChange={e => updateBank('iban', e.target.value.toUpperCase())}
                placeholder="CM21 1000 1000 0123 4567 8900 123"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RIB complet</label>
              <input
                type="text"
                value={config.bank.rib}
                onChange={e => updateBank('rib', e.target.value)}
                placeholder="ex : 10005 00012 12345678901 23"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              💡 Pensez à vérifier ces informations auprès de votre banque avant de les diffuser.
            </p>
          </div>
        </div>
      )}

      {/* ── Section : Mentions ── */}
      {section === 'mentions' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Personnalisez le pied de page et les conditions générales affichés sur les factures.
          </p>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 max-w-3xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pied de page</label>
              <textarea
                value={config.footerText}
                onChange={e => update('footerText', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none"
                placeholder="Merci pour votre confiance — contact@entreprise.cm"
              />
              <p className="mt-1 text-[10px] text-gray-400">Apparaît tout en bas de la facture, centré, en petits caractères.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Conditions de paiement</label>
              <textarea
                value={config.termsText}
                onChange={e => update('termsText', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none"
                placeholder="Paiement par virement bancaire sous 30 jours…"
              />
              <p className="mt-1 text-[10px] text-gray-400">Texte des conditions générales de vente affiché dans la section "Notes".</p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                <strong>💡 Mentions légales obligatoires</strong> (TVA, délais, escompte) sont configurées
                dans <Link to="/app/settings/entreprise" className="underline">Entreprise → Mentions légales</Link>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sauvegarde bas de page */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <p className="text-[11px] text-gray-400">
          Configuration sauvegardée localement. Sera synchronisée avec le serveur lors de la prochaine mise à jour.
        </p>
        <button
          onClick={handleSave}
          className="rounded-lg bg-forest-900 px-5 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors"
        >
          {savedFlash ? '✓ Enregistré' : 'Enregistrer la configuration'}
        </button>
      </div>
    </div>
  )
}

// ── Composant toggle ──────────────────────────────────────────────────────────

interface ToggleCardProps {
  icon:     string
  label:    string
  desc:     string
  checked:  boolean
  onChange: (v: boolean) => void
  inline?:  boolean
  warning?: string | null
}

function ToggleCard({ icon, label, desc, checked, onChange, inline, warning }: ToggleCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const Inner = (
    <div className="flex items-start gap-3" ref={wrapperRef}>
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`text-sm font-semibold ${checked ? 'text-gray-800' : 'text-gray-600'}`}>{label}</h4>
          {/* Switch */}
          <button
            onClick={() => onChange(!checked)}
            type="button"
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-forest-600' : 'bg-gray-200'}`}
            aria-pressed={checked}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
        {warning && <p className="text-[10px] text-amber-600 mt-1 italic">⚠ {warning}</p>}
      </div>
    </div>
  )

  if (inline) return Inner

  return (
    <div className={`rounded-xl border ${checked ? 'border-forest-300 bg-forest-50/40' : 'border-gray-200 bg-white'} p-3 transition-colors`}>
      {Inner}
    </div>
  )
}
