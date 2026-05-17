/**
 * ComptabiliteParamPage
 *
 * Page de paramétrage comptable — 4 onglets :
 *   1. Référentiel comptable  — choix du cadre (OHADA / PCG France / IFRS)
 *   2. Exercices comptables   — gestion des exercices (créer, verrouiller, clôturer…)
 *   3. Paramètres de clôture  — comptes de résultat et report à nouveau
 *   4. Journaux comptables    — configuration des journaux de saisie
 *
 * Stockage :
 *   – accountingZone  → API via settingsApi.updateCompany
 *   – Reste           → localStorage('athenis:accounting-config')
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { useFiscalYear } from '@/contexts/FiscalYearContext'
import { settingsApi, type PayrollConfig } from '@/services/settingsApi'
import type { FiscalYear } from '@/services/accountingApi'
import {
  useFiscalYears,
  useCreateFiscalYear,
  useCloseFiscalYear,
  useLockFiscalYear,
  useCanCreateFiscalYear,
} from '@/hooks/useFiscalYear'

// ── Types locaux ─────────────────────────────────────────────────────────────

type AccountingZone = 'OHADA' | 'FRANCE' | 'IFRS'
type FiscalYearStatus = 'DRAFT' | 'OPEN' | 'LOCKED' | 'CLOSED'
type TabId = 'referentiel' | 'exercices' | 'cloture' | 'journaux' | 'paie'

interface SyscohadaConfig {
  system:  'NORMAL' | 'MINIMAL'
  country: string
}

interface PcgConfig {
  regime: 'NORMAL' | 'SIMPLIFIE' | 'MICRO'
}

interface ClosingConfig {
  resultBeneficeAccount:      string
  resultPerteAccount:         string
  reportNouveauBenefAccount:  string
  reportNouveauPerteAccount:  string
  closingJournal:             string
  transferMethod:             'AUTO' | 'MANUAL'
}

interface JournalEntry {
  code:     string
  label:    string
  type:     string
  isActive: boolean
}

interface AccountingLocalConfig {
  syscohada: SyscohadaConfig
  pcg:       PcgConfig
  closing:   ClosingConfig
  journals:  JournalEntry[]
}

// ── Constantes ───────────────────────────────────────────────────────────────

const ACCOUNTING_CONFIG_KEY = 'athenis:accounting-config'

const OHADA_COUNTRIES = [
  'Bénin', 'Burkina Faso', 'Cameroun', 'Centrafrique', 'Comores', 'Congo',
  "Côte d'Ivoire", 'Gabon', 'Guinée', 'Guinée-Bissau', 'Guinée Équatoriale',
  'Mali', 'Niger', 'RDC', 'Sénégal', 'Tchad', 'Togo',
]

// Codes canoniques alignés sur ceux que le backend utilise lors de la
// comptabilisation automatique (posting.service.ts) : ACH, VTE, BNQ, CAI, PAY.
// Indispensable pour que les filtres « Ventes / Achats / Banque » du Journal
// trouvent les écritures correspondantes.
const OHADA_DEFAULT_JOURNALS: JournalEntry[] = [
  { code: 'ACH', label: 'Journal des achats',          type: 'ACHAT',    isActive: true },
  { code: 'VTE', label: 'Journal des ventes',          type: 'VENTE',    isActive: true },
  { code: 'BNQ', label: 'Journal de banque',           type: 'BANQUE',   isActive: true },
  { code: 'CAI', label: 'Journal de caisse',           type: 'CAISSE',   isActive: true },
  { code: 'OD',  label: 'Opérations diverses',         type: 'OD',       isActive: true },
  { code: 'AN',  label: 'À-Nouveaux (ouverture)',      type: 'OUVERTURE',isActive: true },
  { code: 'PAY', label: 'Salaires & charges sociales', type: 'OD',       isActive: true },
  { code: 'IM',  label: 'Immobilisations',             type: 'OD',       isActive: true },
]

const FRANCE_DEFAULT_JOURNALS: JournalEntry[] = [
  { code: 'ACH', label: 'Journal des achats',          type: 'ACHAT',    isActive: true },
  { code: 'VTE', label: 'Journal des ventes',          type: 'VENTE',    isActive: true },
  { code: 'BNQ', label: 'Journal de banque',           type: 'BANQUE',   isActive: true },
  { code: 'CAI', label: 'Journal de caisse',           type: 'CAISSE',   isActive: true },
  { code: 'OD',  label: 'Opérations diverses',         type: 'OD',       isActive: true },
  { code: 'AN',  label: 'À-Nouveaux',                  type: 'OUVERTURE',isActive: true },
  { code: 'NDF', label: 'Notes de frais',              type: 'ACHAT',    isActive: true },
  { code: 'PAY', label: 'Paie',                        type: 'OD',       isActive: true },
]

const JOURNAL_TYPE_COLORS: Record<string, string> = {
  ACHAT:    'bg-blue-100 text-blue-700',
  VENTE:    'bg-green-100 text-green-700',
  BANQUE:   'bg-indigo-100 text-indigo-700',
  CAISSE:   'bg-amber-100 text-amber-700',
  OD:       'bg-gray-100 text-gray-600',
  OUVERTURE:'bg-purple-100 text-purple-700',
}

const JOURNAL_TYPES = ['ACHAT', 'VENTE', 'BANQUE', 'CAISSE', 'OD', 'OUVERTURE']

const TABS: { id: TabId; label: string }[] = [
  { id: 'referentiel', label: 'Référentiel comptable' },
  { id: 'exercices',   label: 'Exercices comptables' },
  { id: 'cloture',     label: 'Paramètres de clôture' },
  { id: 'journaux',    label: 'Journaux comptables' },
  { id: 'paie',        label: 'Écritures de paie' },
]

// ── Helpers localStorage ─────────────────────────────────────────────────────

function defaultConfig(zone: AccountingZone): AccountingLocalConfig {
  const isOhada = zone === 'OHADA'
  return {
    syscohada: { system: 'NORMAL', country: 'Cameroun' },
    pcg:       { regime: 'NORMAL' },
    closing: {
      resultBeneficeAccount:     isOhada ? '131' : '120',
      resultPerteAccount:        isOhada ? '139' : '129',
      reportNouveauBenefAccount: '110',
      reportNouveauPerteAccount: '119',
      closingJournal:            'OD',
      transferMethod:            'AUTO',
    },
    journals: isOhada ? OHADA_DEFAULT_JOURNALS : FRANCE_DEFAULT_JOURNALS,
  }
}

function loadConfig(zone: AccountingZone): AccountingLocalConfig {
  try {
    const raw = localStorage.getItem(ACCOUNTING_CONFIG_KEY)
    if (raw) return JSON.parse(raw) as AccountingLocalConfig
  } catch { /* ignore */ }
  return defaultConfig(zone)
}

function saveConfig(cfg: AccountingLocalConfig) {
  try {
    localStorage.setItem(ACCOUNTING_CONFIG_KEY, JSON.stringify(cfg))
  } catch { /* ignore */ }
}

// ── Composant spinner ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
    </div>
  )
}

// ── Badge statut exercice ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FiscalYearStatus }) {
  const map: Record<FiscalYearStatus, { label: string; cls: string }> = {
    DRAFT:  { label: 'Brouillon',   cls: 'bg-gray-100 text-gray-600' },
    OPEN:   { label: 'Ouvert',      cls: 'bg-green-100 text-green-700' },
    LOCKED: { label: 'Verrouillé',  cls: 'bg-amber-100 text-amber-700' },
    CLOSED: { label: 'Clôturé',     cls: 'bg-blue-100 text-blue-700' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ── Formatage ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtNumber(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('fr-FR')
}

// ── Modal générique ──────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Onglet 1 : Référentiel comptable ─────────────────────────────────────────

interface TabReferentielProps {
  zone:     AccountingZone
  onZone:   (z: AccountingZone) => void
  config:   AccountingLocalConfig
  onConfig: (c: AccountingLocalConfig) => void
}

function TabReferentiel({ zone, onZone, config, onConfig }: TabReferentielProps) {
  const zones: { id: AccountingZone; title: string; badge: string; description: string }[] = [
    {
      id: 'OHADA',
      title: 'SYSCOHADA Révisé',
      badge: '17 états membres',
      description: "Système Comptable OHADA révisé — applicable depuis le 1er janvier 2018 dans les 17 États membres. Classes 1–9, TAFIRE obligatoire.",
    },
    {
      id: 'FRANCE',
      title: 'PCG France',
      badge: 'Plan Comptable Général 2014',
      description: "Référentiel français (ANC) — PCG 2014. Classes 1–7 + 8 hors bilan. TVA française applicable.",
    },
    {
      id: 'IFRS',
      title: 'IFRS',
      badge: 'International Financial Reporting Standards',
      description: "Normes IFRS — pour les groupes et sociétés cotées. Présentation en juste valeur, consolidation obligatoire.",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Zone selector — 3 cartes */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Cadre comptable applicable</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {zones.map(z => (
            <button
              key={z.id}
              onClick={() => onZone(z.id)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                zone === z.id
                  ? 'border-forest-600 bg-forest-50 ring-2 ring-forest-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className={`text-sm font-semibold ${zone === z.id ? 'text-forest-700' : 'text-gray-800'}`}>
                  {z.title}
                </span>
                {zone === z.id && (
                  <span className="shrink-0 rounded-full bg-forest-600 text-white text-[10px] font-bold px-2 py-0.5">
                    ACTIF
                  </span>
                )}
              </div>
              <span className="inline-block rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 mb-2">
                {z.badge}
              </span>
              <p className="text-xs text-gray-500 leading-relaxed">{z.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sous-options OHADA ── */}
      {zone === 'OHADA' && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-5 space-y-5">
          <h3 className="text-sm font-semibold text-amber-900">Configuration SYSCOHADA</h3>

          {/* Système de présentation */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Système de présentation</label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'NORMAL' as const,  label: 'Système Normal (SN)', note: null },
                { value: 'MINIMAL' as const, label: 'Système Minimal de Trésorerie (SMT)', note: 'Pour les entités dont les recettes sont inférieures à 30 millions FCFA' },
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="syscohada-system"
                    value={opt.value}
                    checked={config.syscohada.system === opt.value}
                    onChange={() => onConfig({ ...config, syscohada: { ...config.syscohada, system: opt.value } })}
                    className="mt-0.5 accent-forest-600"
                  />
                  <span className="text-sm text-gray-700">
                    {opt.label}
                    {opt.note && <span className="block text-xs text-gray-400 mt-0.5">{opt.note}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* État membre */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">État membre</label>
            <select
              value={config.syscohada.country}
              onChange={e => onConfig({ ...config, syscohada: { ...config.syscohada, country: e.target.value } })}
              className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 bg-white"
            >
              {OHADA_COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* États financiers obligatoires */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">États financiers obligatoires</label>
            <ul className="space-y-1">
              {[
                'Bilan (Actif / Passif)',
                'Compte de résultat',
                'TAFIRE (Tableau de Financement par Ressources & Emplois)',
                'Notes annexes',
              ].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Principe de continuité */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Principe de continuité :</strong> L'exercice coïncide avec l'année civile (1er janv. → 31 déc.) sauf pour le premier et le dernier exercice.
          </div>
        </div>
      )}

      {/* ── Sous-options France ── */}
      {zone === 'FRANCE' && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-5">
          <h3 className="text-sm font-semibold text-indigo-900">Configuration PCG France</h3>

          {/* Régime comptable */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Régime comptable</label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'NORMAL' as const,    label: 'Régime Normal', note: null },
                { value: 'SIMPLIFIE' as const, label: 'Régime Simplifié', note: 'CA < 818 000 € (ventes) ou 247 000 € (services)' },
                { value: 'MICRO' as const,     label: 'Micro-entreprise', note: 'CA < 188 700 € (ventes) ou 77 700 € (services)' },
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pcg-regime"
                    value={opt.value}
                    checked={config.pcg.regime === opt.value}
                    onChange={() => onConfig({ ...config, pcg: { ...config.pcg, regime: opt.value } })}
                    className="mt-0.5 accent-forest-600"
                  />
                  <span className="text-sm text-gray-700">
                    {opt.label}
                    {opt.note && <span className="block text-xs text-gray-400 mt-0.5">{opt.note}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* États financiers */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">États financiers</label>
            <ul className="space-y-1">
              {[
                { label: 'Bilan',                               required: true },
                { label: 'Compte de résultat',                 required: true },
                { label: 'Annexe',                             required: true },
                { label: 'Tableau de flux de trésorerie',      required: false },
              ].map(item => (
                <li key={item.label} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg
                    className={`h-4 w-4 shrink-0 ${item.required ? 'text-green-600' : 'text-gray-400'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item.label}
                  {!item.required && (
                    <span className="text-[10px] rounded bg-gray-100 px-1.5 text-gray-400 font-medium">recommandé</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Note exercice */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
            <strong>Exercice comptable :</strong> L'exercice peut commencer à toute date et doit durer 12 mois (Code de commerce L.123-12). Il n'est pas nécessaire de démarrer au 1er janvier.
          </div>
        </div>
      )}

      {/* ── Info IFRS ── */}
      {zone === 'IFRS' && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Configuration IFRS</h3>
          <p className="text-sm text-blue-800">
            Configuration IFRS avancée disponible sur le forfait <strong>Premium</strong>.
          </p>
          <p className="mt-2 text-xs text-blue-600">
            Les normes IFRS s'appliquent principalement aux groupes et sociétés cotées. Contactez le support pour activer les fonctionnalités avancées (consolidation, juste valeur, notes détaillées).
          </p>
        </div>
      )}
    </div>
  )
}

// ── Modal : Nouvel exercice ──────────────────────────────────────────────────

interface ModalNewFYProps {
  zone:    AccountingZone
  onClose: () => void
}

function ModalNewFiscalYear({ zone, onClose }: ModalNewFYProps) {
  const nextYear = new Date().getFullYear() + 1
  const [year, setYear]           = useState(nextYear)
  const [startDate, setStartDate] = useState(`${nextYear}-01-01`)
  const [endDate, setEndDate]     = useState(`${nextYear}-12-31`)

  const { canCreate, blockingMessage } = useCanCreateFiscalYear()
  const createMutation = useCreateFiscalYear()

  // Auto-update dates when year changes
  useEffect(() => {
    setStartDate(`${year}-01-01`)
    setEndDate(`${year}-12-31`)
  }, [year])

  function handleSubmit() {
    createMutation.mutate({ year, startDate, endDate }, {
      onSuccess: onClose,
    })
  }

  return (
    <Modal title="Nouvel exercice comptable" onClose={onClose}>
      <div className="space-y-4">
        {!canCreate && blockingMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {blockingMessage}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
            <input
              type="number"
              value={year}
              min={2000}
              max={2100}
              onChange={e => setYear(parseInt(e.target.value) || nextYear)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Début</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30"
            />
          </div>
        </div>

        {/* Info selon zone */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          {zone === 'OHADA'
            ? "L'exercice doit couvrir 12 mois sauf premier ou dernier exercice (SYSCOHADA art. 7)."
            : zone === 'FRANCE'
              ? "L'exercice peut commencer à toute date et doit durer 12 mois (Code de commerce L.123-12)."
              : "Assurez-vous que la durée de l'exercice respecte les normes IFRS applicables."}
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">
            Erreur lors de la création. Vérifiez que cet exercice n'existe pas déjà.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canCreate || createMutation.isPending}
            className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Création…' : 'Créer l\'exercice'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal : Clôturer l'exercice ──────────────────────────────────────────────

interface ModalCloseProps {
  fy:      FiscalYear
  zone:    AccountingZone
  onClose: () => void
}

function ModalCloseFiscalYear({ fy, zone, onClose }: ModalCloseProps) {
  const checkItems = [
    "J'ai vérifié que toutes les écritures de l'exercice sont saisies",
    `J'ai édité et archivé les états financiers (Bilan, Compte de résultat${zone === 'OHADA' ? ', TAFIRE' : ''})`,
    'Les soldes ont été rapprochés avec les relevés bancaires',
    'Les écritures de clôture (résultat, report à nouveau) sont passées',
  ]

  const [checked, setChecked] = useState<boolean[]>(checkItems.map(() => false))
  const closeMutation = useCloseFiscalYear()

  const allChecked = checked.every(Boolean)

  function toggle(i: number) {
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  function handleClose() {
    closeMutation.mutate(fy.id, { onSuccess: onClose })
  }

  return (
    <Modal title={`Clôturer l'exercice ${fy.year}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Avertissement */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
          <svg className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="text-sm text-amber-800 space-y-1">
            <p><strong>Cette opération est définitivement irréversible.</strong></p>
            <p className="text-xs">Les à-nouveaux seront générés automatiquement dans l'exercice suivant.</p>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Confirmez que vous avez effectué les opérations suivantes :
          </p>
          {checkItems.map((item, i) => (
            <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="mt-0.5 accent-forest-600"
              />
              <span className={`text-sm transition-colors ${checked[i] ? 'text-gray-700 line-through text-gray-400' : 'text-gray-700'}`}>
                {item}
              </span>
            </label>
          ))}
        </div>

        {/* Résumé exercice */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Exercice</p>
            <p className="text-sm font-semibold text-gray-800">{fy.year}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Écritures</p>
            <p className="text-sm font-semibold text-gray-800">{fmtNumber(fy._count?.journalEntries)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Période</p>
            <p className="text-xs font-medium text-gray-700">{fmtDate(fy.startDate)} → {fmtDate(fy.endDate)}</p>
          </div>
        </div>

        {closeMutation.isError && (
          <p className="text-sm text-red-600">Erreur lors de la clôture. Veuillez réessayer.</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={handleClose}
            disabled={!allChecked || closeMutation.isPending}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {closeMutation.isPending ? 'Clôture en cours…' : 'Clôturer l\'exercice'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Onglet 2 : Exercices comptables ─────────────────────────────────────────

interface TabExercicesProps {
  zone: AccountingZone
}

function TabExercices({ zone }: TabExercicesProps) {
  const { selectedYear, setSelectedYear } = useFiscalYear()
  const { data: years = [], isLoading, isError } = useFiscalYears()
  const lockMutation = useLockFiscalYear()

  const [showNewModal,   setShowNewModal]   = useState(false)
  const [closingFy,      setClosingFy]      = useState<FiscalYear | null>(null)

  if (isLoading) return <Spinner />
  if (isError)   return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      Impossible de charger les exercices comptables. Vérifiez la connexion au serveur.
    </div>
  )

  const sorted = [...years].sort((a, b) => b.year - a.year)

  return (
    <div className="space-y-4">
      {/* Barre supérieure */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 shrink-0">Exercice actif :</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 bg-white"
          >
            {sorted.map(y => (
              <option key={y.id} value={y.year}>{y.year}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">Utilisé dans tous les modules comptables</span>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 transition-colors shrink-0"
        >
          + Nouvel exercice
        </button>
      </div>

      {/* Erreur mutation verrouillage */}
      {lockMutation.isError && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          ⚠️ {(lockMutation.error as { message?: string })?.message ?? 'Erreur lors du (dé)verrouillage.'}
        </div>
      )}

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Exercice</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Période</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Écritures</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  Aucun exercice comptable créé
                </td>
              </tr>
            )}
            {sorted.map(fy => (
              <tr
                key={fy.id}
                className={`hover:bg-gray-50/60 transition-colors ${fy.year === selectedYear ? 'bg-forest-50/40' : ''}`}
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedYear(fy.year)}
                    className="font-semibold text-gray-800 hover:text-forest-700 transition-colors"
                  >
                    {fy.year}
                    {fy.year === selectedYear && (
                      <span className="ml-2 rounded-full bg-forest-100 text-forest-700 text-[10px] font-bold px-2 py-0.5">
                        ACTIF
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {fmtDate(fy.startDate)} → {fmtDate(fy.endDate)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={fy.status} />
                </td>
                <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs">
                  {fmtNumber(fy._count?.journalEntries)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {fy.status === 'OPEN' && (
                      <>
                        <button
                          onClick={() => setClosingFy(fy)}
                          className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                          title="Clôturer l'exercice"
                        >
                          Clôturer
                        </button>
                        <button
                          onClick={() => lockMutation.mutate(fy.id)}
                          disabled={lockMutation.isPending}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                          title="Verrouiller l'exercice"
                        >
                          Verrouiller
                        </button>
                      </>
                    )}
                    {fy.status === 'LOCKED' && (
                      <button
                        onClick={() => lockMutation.mutate(fy.id)}
                        disabled={lockMutation.isPending}
                        className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        title="Déverrouiller l'exercice"
                      >
                        Déverrouiller
                      </button>
                    )}
                    {fy.status === 'CLOSED' && (
                      <span className="text-xs text-gray-400 italic">
                        Clôturé — À-nouveaux générés automatiquement
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showNewModal && (
        <ModalNewFiscalYear zone={zone} onClose={() => setShowNewModal(false)} />
      )}
      {closingFy && (
        <ModalCloseFiscalYear
          fy={closingFy}
          zone={zone}
          onClose={() => setClosingFy(null)}
        />
      )}
    </div>
  )
}

// ── Onglet 3 : Paramètres de clôture ────────────────────────────────────────

interface TabClotureProps {
  zone:    AccountingZone
  config:  AccountingLocalConfig
  onChange:(c: AccountingLocalConfig) => void
}

function TabCloture({ zone, config, onChange }: TabClotureProps) {
  const c = config.closing

  function updateClosing<K extends keyof ClosingConfig>(key: K, value: ClosingConfig[K]) {
    onChange({ ...config, closing: { ...config.closing, [key]: value } })
  }

  const rows: { key: keyof ClosingConfig; label: string; description: string }[] = [
    {
      key: 'resultBeneficeAccount',
      label: 'Résultat net — bénéfice',
      description: 'Solde créditeur du compte de résultat',
    },
    {
      key: 'resultPerteAccount',
      label: 'Résultat net — perte',
      description: 'Solde débiteur du compte de résultat',
    },
    {
      key: 'reportNouveauBenefAccount',
      label: 'Report à nouveau — bénéficiaire',
      description: 'Report exercice précédent bénéficiaire',
    },
    {
      key: 'reportNouveauPerteAccount',
      label: 'Report à nouveau — déficitaire',
      description: 'Report exercice précédent déficitaire',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">Comptes de clôture et report à nouveau</h2>
        <p className="mt-1 text-xs text-gray-500">
          Ces comptes sont utilisés lors de la clôture annuelle pour affecter le résultat et ouvrir le nouvel exercice.
        </p>
      </div>

      {/* Tableau des 4 comptes */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Compte</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description réglementaire</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">N° de compte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.key} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{row.description}</td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={c[row.key] as string}
                    onChange={e => updateClosing(row.key, e.target.value)}
                    className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Journal de clôture + Méthode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Journal */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
          <label className="block text-xs font-semibold text-gray-700">Journal de clôture</label>
          <input
            type="text"
            value={c.closingJournal}
            onChange={e => updateClosing('closingJournal', e.target.value.toUpperCase().slice(0, 5))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500/30"
            placeholder="OD"
          />
          <p className="text-[11px] text-gray-400">
            Journal utilisé pour les écritures de clôture et d'ouverture (À Nouveaux)
          </p>
        </div>

        {/* Méthode */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-700">Méthode de report</label>
          <div className="flex flex-col gap-2">
            {[
              { value: 'AUTO' as const,   label: 'Automatique', note: 'Le logiciel génère les écritures de report' },
              { value: 'MANUAL' as const, label: 'Manuelle',    note: 'Saisie libre des écritures de report' },
            ].map(opt => (
              <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transfer-method"
                  value={opt.value}
                  checked={c.transferMethod === opt.value}
                  onChange={() => updateClosing('transferMethod', opt.value)}
                  className="mt-0.5 accent-forest-600"
                />
                <span className="text-sm text-gray-700">
                  {opt.label}
                  <span className="block text-xs text-gray-400">{opt.note}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Info réglementaire */}
      {zone === 'OHADA' && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Conformément au <strong>SYSCOHADA révisé (2018)</strong>, le résultat de l'exercice est viré au compte <strong>131</strong> (bénéfice) ou <strong>139</strong> (perte) lors de la clôture. Le report à nouveau est en compte <strong>110</strong> ou <strong>119</strong>.
        </div>
      )}
      {zone === 'FRANCE' && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
          Conformément au <strong>PCG 2014</strong>, le résultat est porté en compte <strong>120</strong> (bénéfice) ou <strong>129</strong> (perte). Le report à nouveau figure en compte <strong>110</strong> (créditeur) ou <strong>119</strong> (débiteur).
        </div>
      )}
      {zone === 'IFRS' && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          La présentation du résultat et du report à nouveau en normes IFRS suit IAS 1 et doit être adaptée au cadre de présentation des états financiers.
        </div>
      )}
    </div>
  )
}

// ── Onglet 4 : Journaux comptables ──────────────────────────────────────────

interface TabJournauxProps {
  zone:    AccountingZone
  config:  AccountingLocalConfig
  onChange:(c: AccountingLocalConfig) => void
}

function TabJournaux({ zone, config, onChange }: TabJournauxProps) {
  const [newCode,  setNewCode]  = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newType,  setNewType]  = useState('OD')
  const [addError, setAddError] = useState('')

  function updateJournal(index: number, patch: Partial<JournalEntry>) {
    const next = config.journals.map((j, i) => i === index ? { ...j, ...patch } : j)
    onChange({ ...config, journals: next })
  }

  function deleteJournal(index: number) {
    if (!confirm('Supprimer ce journal ?')) return
    onChange({ ...config, journals: config.journals.filter((_, i) => i !== index) })
  }

  function addJournal() {
    setAddError('')
    const code = newCode.trim().toUpperCase()
    if (!code || !newLabel.trim()) {
      setAddError('Code et libellé obligatoires')
      return
    }
    if (config.journals.some(j => j.code === code)) {
      setAddError(`Le code "${code}" existe déjà`)
      return
    }
    onChange({
      ...config,
      journals: [...config.journals, { code, label: newLabel.trim(), type: newType, isActive: true }],
    })
    setNewCode(''); setNewLabel(''); setNewType('OD')
  }

  function resetDefaults() {
    if (!confirm('Réinitialiser les journaux aux valeurs par défaut pour cette zone ?')) return
    const defaults = zone === 'OHADA' ? OHADA_DEFAULT_JOURNALS : FRANCE_DEFAULT_JOURNALS
    onChange({ ...config, journals: defaults })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Configuration des journaux</h2>
          <p className="mt-1 text-xs text-gray-500">
            Les journaux structurent la saisie comptable. Chaque écriture est obligatoirement rattachée à un journal.
          </p>
        </div>
        <button
          onClick={resetDefaults}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ↺ Valeurs par défaut
        </button>
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Libellé</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Type</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Actif</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {config.journals.map((journal, index) => (
              <tr key={journal.code} className="hover:bg-gray-50/40 group">
                <td className="px-4 py-2">
                  <span className="font-mono text-sm font-semibold text-gray-800">{journal.code}</span>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={journal.label}
                    onChange={e => updateJournal(index, { label: e.target.value })}
                    className="w-full rounded border border-transparent px-2 py-1 text-sm text-gray-700 hover:border-gray-200 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-forest-500/30 bg-transparent"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={journal.type}
                    onChange={e => updateJournal(index, { type: e.target.value })}
                    className="w-full rounded border border-transparent px-1 py-1 text-xs bg-transparent hover:border-gray-200 focus:outline-none"
                  >
                    {JOURNAL_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => updateJournal(index, { isActive: !journal.isActive })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${journal.isActive ? 'bg-forest-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${journal.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => deleteJournal(index)}
                    className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}

            {/* Ligne d'ajout */}
            <tr className="bg-gray-50/50">
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Code"
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Libellé du journal"
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                />
              </td>
              <td className="px-4 py-2">
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-500/30 bg-white"
                >
                  {JOURNAL_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2">
                <button
                  onClick={addJournal}
                  className="rounded-lg bg-forest-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-forest-800 transition-colors"
                  title="Ajouter le journal"
                >
                  +
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {addError && (
        <p className="text-sm text-red-600">{addError}</p>
      )}

      {/* Légende types */}
      <div className="flex flex-wrap gap-2">
        {JOURNAL_TYPES.map(t => (
          <span
            key={t}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${JOURNAL_TYPE_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Onglet 5 : Écritures de paie ────────────────────────────────────────────

function TabPaie({ zone }: { zone: AccountingZone }) {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings', 'payroll-config'],
    queryFn:  () => settingsApi.getPayrollConfig(),
  })

  // État local — initialisé à partir des données reçues
  const [form, setForm] = useState<PayrollConfig | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: (body: Partial<PayrollConfig>) => settingsApi.updatePayrollConfig(body),
    onSuccess: (res) => {
      setForm(res)
      setSavedAt(new Date())
      qc.invalidateQueries({ queryKey: ['settings', 'payroll-config'] })
    },
  })

  if (isLoading) return <Spinner />
  if (isError || !form) return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      Impossible de charger la configuration de paie.
    </div>
  )

  function update<K extends keyof PayrollConfig>(key: K, value: PayrollConfig[K]) {
    setForm(f => f ? { ...f, [key]: value } : f)
  }

  function handleSave() {
    if (!form) return
    mutation.mutate(form)
  }

  function handleResetDefaults() {
    if (!confirm('Réinitialiser tous les paramètres aux valeurs SYSCOHADA par défaut ?')) return
    setForm({
      journalCode:           'PAY',
      chargeAccount:         '641',
      socialAccount:         '431',
      taxAccount:            '447',
      treasuryAccount:       '521',
      splitContributions:    false,
      socialAccountPersonal: '4311',
      socialAccountEmployer: '4312',
      taxAccountIrpp:        '4471',
      taxAccountCac:         '4472',
    })
  }

  const rowsMain: { key: keyof PayrollConfig; label: string; description: string; placeholder: string }[] = [
    {
      key:         'chargeAccount',
      label:       'Charges de personnel',
      description: 'Rémunérations directes versées (SYSCOHADA 641)',
      placeholder: '641',
    },
    {
      key:         'socialAccount',
      label:       'Cotisations sociales (CNPS / CFC / FNE)',
      description: 'Compte global de cotisations à reverser aux organismes (431)',
      placeholder: '431',
    },
    {
      key:         'taxAccount',
      label:       'Impôts retenus (IRPP + CAC)',
      description: 'Compte État — Impôts retenus à la source sur salaires (447)',
      placeholder: '447',
    },
    {
      key:         'treasuryAccount',
      label:       'Compte de trésorerie',
      description: 'Banque utilisée pour le virement des salaires nets (521)',
      placeholder: '521',
    },
  ]

  const rowsSplit: { key: keyof PayrollConfig; label: string; description: string; placeholder: string }[] = [
    {
      key:         'socialAccountPersonal',
      label:       'CNPS — part salariale',
      description: 'Précompte salarial (4311)',
      placeholder: '4311',
    },
    {
      key:         'socialAccountEmployer',
      label:       'CNPS — part patronale',
      description: 'Cotisations à la charge de l\'employeur (4312)',
      placeholder: '4312',
    },
    {
      key:         'taxAccountIrpp',
      label:       'IRPP — Impôt sur le revenu',
      description: 'Impôt sur le revenu des personnes physiques (4471)',
      placeholder: '4471',
    },
    {
      key:         'taxAccountCac',
      label:       'CAC — Centimes additionnels communaux',
      description: 'Centimes additionnels communaux (4472)',
      placeholder: '4472',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Paramètres des écritures de paie</h2>
          <p className="mt-1 text-xs text-gray-500">
            Comptes et journal utilisés lors de la comptabilisation mensuelle de la paie.
            La configuration est appliquée à toutes les paies futures.
          </p>
        </div>
        <button
          onClick={handleResetDefaults}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ↺ Valeurs par défaut
        </button>
      </div>

      {/* Journal de paie */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <label className="block text-xs font-semibold text-gray-700">Journal de paie</label>
        <input
          type="text"
          value={form.journalCode}
          onChange={e => update('journalCode', e.target.value.toUpperCase().slice(0, 5))}
          className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-500/30"
          placeholder="PAY"
        />
        <p className="text-[11px] text-gray-400">
          Code du journal dans lequel les écritures de paie seront passées chaque mois (ex. <code>PAY</code>, <code>SA</code>).
          Doit exister dans l'onglet <strong>Journaux comptables</strong>.
        </p>
      </div>

      {/* Comptes globaux */}
      <div>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Comptes principaux
        </h3>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Poste</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">N° de compte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rowsMain.map(row => (
                <tr key={row.key} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.description}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={String(form[row.key] ?? '')}
                      onChange={e => update(row.key, e.target.value as PayrollConfig[typeof row.key])}
                      placeholder={row.placeholder}
                      className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toggle ventilation détaillée */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.splitContributions}
            onChange={e => update('splitContributions', e.target.checked)}
            className="mt-0.5 accent-forest-600 h-4 w-4"
          />
          <div className="flex-1">
            <span className="block text-sm font-semibold text-gray-800">
              Ventilation détaillée des cotisations et impôts
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Si activé, les cotisations sociales sont scindées en <strong>part salariale</strong> (4311) et <strong>part patronale</strong> (4312),
              et les impôts retenus en <strong>IRPP</strong> (4471) et <strong>CAC</strong> (4472).
              Sinon, les écritures utilisent les comptes globaux <code>{form.socialAccount}</code> et <code>{form.taxAccount}</code>.
            </span>
          </div>
        </label>
      </div>

      {/* Comptes détaillés */}
      {form.splitContributions && (
        <div>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Comptes détaillés
          </h3>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Poste</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">N° de compte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rowsSplit.map(row => (
                  <tr key={row.key} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.description}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={String(form[row.key] ?? '')}
                        onChange={e => update(row.key, e.target.value as PayrollConfig[typeof row.key])}
                        placeholder={row.placeholder}
                        className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info réglementaire */}
      {zone === 'OHADA' && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Référence SYSCOHADA révisé (Cameroun)</p>
          <ul className="text-xs space-y-0.5 list-disc list-inside">
            <li><strong>641</strong> — Rémunérations directes versées au personnel national</li>
            <li><strong>431</strong> — Sécurité sociale (CNPS, CFC, FNE)</li>
            <li><strong>447</strong> — État, impôts retenus à la source (IRPP, CAC)</li>
            <li><strong>422</strong> — Personnel — Rémunérations dues (net à payer)</li>
            <li><strong>521</strong> — Banques (paiement du net)</li>
          </ul>
        </div>
      )}
      {zone === 'FRANCE' && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
          <p className="font-semibold mb-1">Référence PCG France</p>
          <ul className="text-xs space-y-0.5 list-disc list-inside">
            <li><strong>641</strong> — Rémunérations du personnel</li>
            <li><strong>431</strong> — Sécurité sociale</li>
            <li><strong>437</strong> — Autres organismes sociaux</li>
            <li><strong>421</strong> — Personnel — Rémunérations dues</li>
            <li><strong>512</strong> — Banques</li>
          </ul>
        </div>
      )}

      {/* Erreur mutation */}
      {mutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible d'enregistrer les paramètres. Vérifiez vos droits d'administrateur.
        </div>
      )}

      {/* Barre de sauvegarde */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        {savedAt && !mutation.isPending && (
          <span className="text-xs text-green-600">
            ✓ Enregistré à {savedAt.toLocaleTimeString('fr-FR')}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────

export function ComptabiliteParamPage() {
  const { company, refreshCompany } = useCompanySettings()
  const qc = useQueryClient()

  // Zone comptable — état local pour réponse immédiate, synchro avec l'API
  const apiZone = (company?.accountingZone ?? 'OHADA') as AccountingZone
  const [zone, setZone] = useState<AccountingZone>(apiZone)

  // Sync lorsque la réponse API arrive (chargement initial ou après refreshCompany)
  useEffect(() => {
    if (company?.accountingZone) {
      setZone(company.accountingZone as AccountingZone)
    }
  }, [company?.accountingZone])

  // Config locale — chargée depuis localStorage
  const [config, setConfig] = useState<AccountingLocalConfig>(() => loadConfig(apiZone))

  // Onglet actif — peut être initialisé via le paramètre URL ?tab=exercices
  const [searchParams] = useSearchParams()
  const initialTab     = (searchParams.get('tab') as TabId) ?? 'referentiel'
  const validTab: TabId = ['referentiel', 'exercices', 'cloture', 'journaux', 'paie'].includes(initialTab)
    ? initialTab
    : 'referentiel'
  const [activeTab, setActiveTab] = useState<TabId>(validTab)

  // Mutation changement de zone
  const zoneMutation = useMutation({
    mutationFn: (newZone: AccountingZone) =>
      settingsApi.updateCompany({ accountingZone: newZone }),
    onSuccess: () => {
      void refreshCompany()
      qc.invalidateQueries({ queryKey: ['company'] })
    },
    onError: () => {
      // Rollback UI si l'API échoue
      setZone(apiZone)
    },
  })

  // Sauvegarde immédiate dans localStorage à chaque changement de config
  useEffect(() => {
    saveConfig(config)
  }, [config])

  // Changement de zone : mise à jour immédiate de l'UI + persistance en arrière-plan
  const handleZoneChange = useCallback((newZone: AccountingZone) => {
    setZone(newZone)          // réponse UI instantanée
    zoneMutation.mutate(newZone)
    // Réinitialise les comptes aux valeurs par défaut pour la nouvelle zone
    setConfig(prev => ({
      ...prev,
      closing: {
        ...prev.closing,
        resultBeneficeAccount:     newZone === 'OHADA' ? '131' : '120',
        resultPerteAccount:        newZone === 'OHADA' ? '139' : '129',
        reportNouveauBenefAccount: '110',
        reportNouveauPerteAccount: '119',
      },
      journals: newZone === 'OHADA' ? OHADA_DEFAULT_JOURNALS : FRANCE_DEFAULT_JOURNALS,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-4xl space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Paramètres de comptabilité</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configurez le référentiel comptable, les exercices, les règles de clôture et les journaux.
        </p>
      </div>

      {/* Bandeau erreur mutation zone */}
      {zoneMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de mettre à jour le référentiel comptable. Veuillez réessayer.
        </div>
      )}

      {/* Barre d'onglets */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-forest-600 text-forest-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'referentiel' && (
        <TabReferentiel
          zone={zone}
          onZone={handleZoneChange}
          config={config}
          onConfig={setConfig}
        />
      )}

      {activeTab === 'exercices' && (
        <TabExercices zone={zone} />
      )}

      {activeTab === 'cloture' && (
        <TabCloture
          zone={zone}
          config={config}
          onChange={setConfig}
        />
      )}

      {activeTab === 'journaux' && (
        <TabJournaux
          zone={zone}
          config={config}
          onChange={setConfig}
        />
      )}

      {activeTab === 'paie' && (
        <TabPaie zone={zone} />
      )}
    </div>
  )
}
