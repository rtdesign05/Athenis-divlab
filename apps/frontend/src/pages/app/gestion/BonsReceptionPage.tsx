import { useMemo, useState, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  useGestion,
  type BRStatut,
  type BonReception,
  type LigneBR,
} from '@/contexts/GestionContext'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { SendEmailModal } from '@/components/gestion/SendEmailModal'
import { printDocument } from '@/lib/printDocument'
import { generateQRDataUrl, buildBRQR } from '@/lib/qrCode'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<BRStatut, string> = {
  'Attendu':       'bg-amber-100 text-amber-700',
  'Reçu partiel':  'bg-blue-100 text-blue-700',
  'Reçu':          'bg-green-100 text-green-700',
  'Litige':        'bg-red-100 text-red-600',
}

const STATUTS: BRStatut[] = ['Attendu', 'Reçu partiel', 'Reçu', 'Litige']
const AGENCES = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Agence Bafoussam']

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

let _ligneCounter = 1
function newLigneId() { return `new-${_ligneCounter++}` }

// ── Email HTML builder ─────────────────────────────────────────────────────────

function buildBREmailHtml(br: BonReception, companyName: string, address: string, city: string): string {
  const rows = (br.lignes ?? []).map((l, i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:center">${i + 1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;font-family:monospace">${l.reference}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${l.designation}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right">${l.quantite} ${l.unite}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right">${l.quantiteRecue} ${l.unite}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      <tr><td style="background:#1a3a2a;padding:28px 40px;text-align:center">
        <span style="color:#fff;font-size:20px;font-weight:700">${companyName}</span>
      </td></tr>
      <tr><td style="padding:36px 40px">
        <h1 style="margin:0 0 4px;font-size:18px;color:#111827">Bon de réception N° ${br.id}</h1>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Commande : <strong>${br.commande}</strong> — Fournisseur : <strong>${br.fournisseur}</strong></p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280">Agence : ${br.agence}${address ? ` | ${address}` : ''}${city ? `, ${city}` : ''}</p>
        <!--CUSTOM_MESSAGE-->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:center;width:32px">N°</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:left">Référence</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:left">Désignation</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:right">Qté cmdée</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:right">Qté reçue</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${br.notes ? `<p style="font-size:12px;color:#6b7280;margin:0 0 8px"><strong>Notes :</strong> ${br.notes}</p>` : ''}
        ${br.conditionsLivraison ? `<p style="font-size:12px;color:#9ca3af;margin:0">Conditions : ${br.conditionsLivraison}</p>` : ''}
      </td></tr>
      <tr><td style="background:#f9fafb;padding:18px 40px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} ${companyName} — Document généré par Athenis</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ── Modal creation/édition BR ─────────────────────────────────────────────────

interface ModalBRProps {
  achats:    { id: string; fournisseur: string; agence: string }[]
  agenceNom: string | null
  initial?:  BonReception
  onSave:    (data: Omit<BonReception, 'id'>) => void
  onClose:   () => void
}

function ModalBR({ achats, agenceNom, initial, onSave, onClose }: ModalBRProps) {
  const today = new Date().toISOString().slice(0, 10)
  const isEdit = !!initial

  const availableAchats = useMemo(
    () => agenceNom ? achats.filter(a => a.agence === agenceNom) : achats,
    [achats, agenceNom],
  )

  const [form, setForm] = useState({
    commande:            initial?.commande            ?? availableAchats[0]?.id      ?? '',
    fournisseur:         initial?.fournisseur         ?? availableAchats[0]?.fournisseur ?? '',
    agence:              initial?.agence              ?? agenceNom ?? availableAchats[0]?.agence ?? 'Siège',
    datePrevue:          initial?.datePrevue          ?? '',
    dateReception:       initial?.dateReception       ?? '',
    statut:              initial?.statut              ?? 'Attendu' as BRStatut,
    notes:               initial?.notes               ?? '',
    conditionsLivraison: initial?.conditionsLivraison ?? '',
  })

  const [lignes, setLignes] = useState<LigneBR[]>(
    initial?.lignes ?? [],
  )

  function handleCommandeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cmd = availableAchats.find(a => a.id === e.target.value)
    setForm(f => ({
      ...f,
      commande:    e.target.value,
      fournisseur: cmd?.fournisseur ?? f.fournisseur,
      agence:      agenceNom ?? cmd?.agence ?? f.agence,
    }))
  }

  function addLigne() {
    setLignes(prev => [...prev, {
      id: newLigneId(), reference: '', designation: '', quantite: 1, quantiteRecue: 0, unite: 'pièce',
    }])
  }

  function removeLigne(id: string) {
    setLignes(prev => prev.filter(l => l.id !== id))
  }

  function updateLigne(id: string, key: keyof LigneBR, value: string | number) {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [key]: value } : l))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.commande || !form.datePrevue) return
    onSave({
      commande:            form.commande,
      fournisseur:         form.fournisseur,
      agence:              form.agence,
      dateCreation:        initial?.dateCreation ?? today,
      datePrevue:          form.datePrevue,
      dateReception:       form.dateReception || null,
      statut:              form.statut,
      lignes,
      notes:               form.notes,
      conditionsLivraison: form.conditionsLivraison,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {isEdit ? `Modifier ${initial!.id}` : 'Nouveau bon de réception'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Commande / Fournisseur / Agence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Commande fournisseur *</label>
              {availableAchats.length > 0 && !isEdit ? (
                <select value={form.commande} onChange={handleCommandeChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  {availableAchats.map(a => (
                    <option key={a.id} value={a.id}>{a.id} — {a.fournisseur}</option>
                  ))}
                </select>
              ) : (
                <input value={form.commande}
                  onChange={e => setForm(f => ({ ...f, commande: e.target.value }))}
                  placeholder="ACH-xxxx"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fournisseur</label>
              <input value={form.fournisseur}
                onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                placeholder="Nom du fournisseur"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Réception prévue *</label>
              <input type="date" value={form.datePrevue}
                onChange={e => setForm(f => ({ ...f, datePrevue: e.target.value }))} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de réception effective</label>
              <input type="date" value={form.dateReception}
                onChange={e => setForm(f => ({ ...f, dateReception: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select value={form.statut}
                onChange={e => setForm(f => ({ ...f, statut: e.target.value as BRStatut }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agence</label>
              {agenceNom ? (
                <input value={agenceNom} readOnly
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
              ) : (
                <select value={form.agence}
                  onChange={e => setForm(f => ({ ...f, agence: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  {AGENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Lignes articles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Articles reçus</p>
              <button type="button" onClick={addLigne}
                className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
                + Ajouter une ligne
              </button>
            </div>
            {lignes.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Aucune ligne — cliquez sur « Ajouter une ligne »</p>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-500 font-semibold">
                      <th className="px-2 py-2 text-left">Référence</th>
                      <th className="px-2 py-2 text-left">Désignation</th>
                      <th className="px-2 py-2 text-right w-16">Qté cmdée</th>
                      <th className="px-2 py-2 text-right w-16">Qté reçue</th>
                      <th className="px-2 py-2 text-left w-20">Unité</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lignes.map(l => (
                      <tr key={l.id}>
                        <td className="px-2 py-1.5">
                          <input value={l.reference}
                            onChange={e => updateLigne(l.id, 'reference', e.target.value)}
                            placeholder="REF-001"
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={l.designation}
                            onChange={e => updateLigne(l.id, 'designation', e.target.value)}
                            placeholder="Description article"
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} value={l.quantite}
                            onChange={e => updateLigne(l.id, 'quantite', Number(e.target.value))}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} value={l.quantiteRecue}
                            onChange={e => updateLigne(l.id, 'quantiteRecue', Number(e.target.value))}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={l.unite}
                            onChange={e => updateLigne(l.id, 'unite', e.target.value)}
                            placeholder="pièce"
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button type="button" onClick={() => removeLigne(l.id)}
                            className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes & Conditions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Observations</label>
              <textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Remarques sur la réception…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Conditions de livraison</label>
              <input value={form.conditionsLivraison}
                onChange={e => setForm(f => ({ ...f, conditionsLivraison: e.target.value }))}
                placeholder="Franco de port, CIF Douala…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              {isEdit ? 'Enregistrer les modifications' : 'Créer le BR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── BRView — document pleine page ─────────────────────────────────────────────

interface BRViewProps {
  br:           BonReception
  allBR:        BonReception[]
  currentIndex: number
  onClose:      () => void
  onNavigate:   (id: string) => void
  onStatut:     (id: string, s: BRStatut) => void
  onEdit:       (br: BonReception) => void
  onDelete:     (br: BonReception) => void
}

function BRView({ br, allBR, currentIndex, onClose, onNavigate, onStatut, onEdit, onDelete }: BRViewProps) {
  const { company }      = useCompanySettings()
  const [emailOpen, setEmailOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const docRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    generateQRDataUrl(buildBRQR(br)).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [br.id, br.statut])

  const companyName    = company?.name         ?? 'Société Athenis'
  const companyAddress = company?.address      ?? '12 Rue Bonanjo'
  const companyCity    = company?.city         ?? 'Douala'
  const companyPhone   = company?.phone        ?? ''
  const companyEmail   = company?.contactEmail ?? ''

  const prev = currentIndex > 0                 ? allBR[currentIndex - 1] : null
  const next = currentIndex < allBR.length - 1  ? allBR[currentIndex + 1] : null

  const totalCmdee = (br.lignes ?? []).reduce((s, l) => s + l.quantite, 0)
  const totalRecue = (br.lignes ?? []).reduce((s, l) => s + l.quantiteRecue, 0)

  // Conformité par ligne
  function conformite(l: LigneBR): 'ok' | 'partial' | 'missing' {
    if (l.quantiteRecue === 0) return 'missing'
    if (l.quantiteRecue < l.quantite) return 'partial'
    return 'ok'
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5 flex-wrap">
        <button onClick={onClose}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
          ← Liste
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-sm font-semibold text-gray-800">{br.id}</span>
        <span className="text-gray-300">|</span>

        <div className="flex items-center gap-1">
          <button disabled={!prev} onClick={() => prev && onNavigate(prev.id)}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            Préc.
          </button>
          <span className="text-xs text-gray-400">{currentIndex + 1}/{allBR.length}</span>
          <button disabled={!next} onClick={() => next && onNavigate(next.id)}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            Suiv.
          </button>
        </div>

        <span className="text-gray-300">|</span>

        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLE[br.statut]}`}>
          {br.statut}
        </span>
        <select value={br.statut}
          onChange={e => onStatut(br.id, e.target.value as BRStatut)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30">
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => onEdit(br)}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
            ✏️ Modifier
          </button>
          <button onClick={() => setConfirmDel(true)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
            🗑️ Supprimer
          </button>
          <button onClick={() => setEmailOpen(true)}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
            ✉️ Envoyer
          </button>
          <button onClick={() => printDocument(docRef.current, `BON DE RÉCEPTION ${br.id}`)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            🖨️ PDF
          </button>
        </div>
      </div>

      {/* Modal e-mail */}
      <SendEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        to=""
        subject={`Bon de réception N° ${br.id} — ${companyName}`}
        documentRef={br.id}
        documentType="Bon de réception"
        clientName={br.fournisseur}
        bodyHtml={buildBREmailHtml(br, companyName, companyAddress, companyCity)}
      />

      {/* Confirm suppression */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 text-center">
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Supprimer ce bon de réception ?</h3>
            <p className="text-xs text-gray-500 mb-5">
              <span className="font-mono font-medium">{br.id}</span> — {br.fournisseur}<br />
              Cette action est irréversible.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => onDelete(br)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-100 p-6">
        <div ref={docRef} className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-10 print:shadow-none print:rounded-none">

          {/* En-tête */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-lg font-bold text-gray-900">{companyName}</p>
              <p className="text-sm text-gray-600">{companyAddress}</p>
              <p className="text-sm text-gray-600">{companyCity}, Cameroun</p>
              {companyPhone && <p className="text-sm text-gray-600">Tél : {companyPhone}</p>}
              {companyEmail && <p className="text-sm text-gray-600">{companyEmail}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 uppercase tracking-wide">BON DE RÉCEPTION</p>
              <p className="mt-1 text-sm text-gray-700 font-mono">N° {br.id}</p>
              <p className="text-sm text-gray-500 mt-0.5">Créé le {fmtDate(br.dateCreation)}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${STATUT_STYLE[br.statut]}`}>
                {br.statut}
              </span>
            </div>
          </div>

          {/* Grille infos */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Fournisseur */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Fournisseur</p>
              <p className="font-semibold text-gray-900">{br.fournisseur}</p>
              <p className="text-sm text-gray-500 mt-0.5">{br.agence}</p>
            </div>
            {/* Références */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Références</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Commande</span>
                <span className="font-mono font-medium text-gray-900">{br.commande}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Réception prévue</span>
                <span className="text-gray-900">{fmtDate(br.datePrevue)}</span>
              </div>
              {br.dateReception && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reçu le</span>
                  <span className="font-medium text-green-700">{fmtDate(br.dateReception)}</span>
                </div>
              )}
              {br.conditionsLivraison && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Conditions</span>
                  <span className="text-gray-900">{br.conditionsLivraison}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tableau articles */}
          <div className="mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold w-8">N°</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold w-28">Référence</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">Désignation</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold w-24">Qté cmdée</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold w-24">Qté reçue</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold w-16">Unité</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold w-24">Conformité</th>
                </tr>
              </thead>
              <tbody>
                {(br.lignes ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400 border border-gray-100">
                      Aucun article renseigné
                    </td>
                  </tr>
                ) : (br.lignes ?? []).map((l, i) => {
                  const conf = conformite(l)
                  return (
                    <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td className="px-4 py-2.5 text-xs text-gray-400 border border-gray-100">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600 border border-gray-100">{l.reference}</td>
                      <td className="px-4 py-2.5 text-gray-900 border border-gray-100">{l.designation}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700 border border-gray-100 tabular-nums">
                        {l.quantite.toLocaleString('fr-FR')}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold border border-gray-100 tabular-nums ${
                        conf === 'ok' ? 'text-green-700' : conf === 'partial' ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {l.quantiteRecue.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 border border-gray-100">{l.unite}</td>
                      <td className="px-4 py-2.5 border border-gray-100">
                        <div className="flex justify-center">
                          {conf === 'ok' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              ✓ Conforme
                            </span>
                          )}
                          {conf === 'partial' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              ~ Partiel
                            </span>
                          )}
                          {conf === 'missing' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                              ✗ Manquant
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 font-medium">
                    {(br.lignes ?? []).length} article{(br.lignes ?? []).length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-semibold text-gray-700 tabular-nums">
                    {totalCmdee.toLocaleString('fr-FR')}
                  </td>
                  <td className={`px-4 py-2 text-right text-xs font-semibold tabular-nums ${
                    totalRecue === totalCmdee ? 'text-green-700' : 'text-amber-600'
                  }`}>
                    {totalRecue.toLocaleString('fr-FR')}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {br.notes && (
            <div className="mb-8 rounded-xl border border-gray-100 bg-amber-50/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Notes / Observations</p>
              <p className="text-sm text-gray-700 leading-relaxed">{br.notes}</p>
            </div>
          )}

          {/* Signatures + QR */}
          <div className="mt-12 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-6">Émis par (réceptionnaire)</p>
                <p className="text-sm text-gray-700 mb-1">{companyName}</p>
                <p className="text-xs text-gray-400 mb-8">Date : {fmtDate(br.dateCreation)}</p>
                <div className="border-t border-gray-300 pt-1">
                  <p className="text-[10px] text-gray-400">Signature &amp; cachet</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-6">Confirmé par (fournisseur)</p>
                <p className="text-sm text-gray-700 mb-1">{br.fournisseur}</p>
                <p className="text-xs text-gray-400 mb-8">
                  Date : {br.dateReception ? fmtDate(br.dateReception) : '_______________'}
                </p>
                <div className="border-t border-gray-300 pt-1">
                  <p className="text-[10px] text-gray-400">Signature &amp; cachet</p>
                </div>
              </div>
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center">
                {qrDataUrl && (
                  <>
                    <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 border border-gray-200 rounded p-1" />
                    <p className="mt-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Vérification</p>
                    <p className="text-[10px] text-gray-400 font-mono">{br.id}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-10 pt-4 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">
              Document généré par Athenis — {companyName} — {companyCity}, Cameroun
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function BonsReceptionPage() {
  const { user } = useAuth()
  const {
    bonsReception, achats,
    updateBRStatut, addBonReception,
    updateBonReception, deleteBonReception,
  } = useGestion()

  const agenceNom = user?.agenceNom ?? null
  const [search,      setSearch]      = useState('')
  const [statutFilter, setStatutFilter] = useState<BRStatut | 'all'>('all')
  const [modal,       setModal]       = useState<'create' | 'edit' | null>(null)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [editTarget,  setEditTarget]  = useState<BonReception | null>(null)
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')

  // Liste filtrée
  const items = useMemo(() => {
    let list = agenceNom ? bonsReception.filter(b => b.agence === agenceNom) : bonsReception
    if (statutFilter !== 'all') list = list.filter(b => b.statut === statutFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.fournisseur.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.commande.toLowerCase().includes(q),
      )
    }
    list = filterByDateRange(list, b => b.dateCreation, dateFrom, dateTo)
    return list
  }, [bonsReception, agenceNom, search, statutFilter, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  const selectedBR    = items.find(b => b.id === selectedId) ?? null
  const selectedIndex = items.findIndex(b => b.id === selectedId)

  const total    = items.length
  const recus    = items.filter(b => b.statut === 'Reçu').length
  const attendus = items.filter(b => b.statut === 'Attendu').length
  const litiges  = items.filter(b => b.statut === 'Litige').length

  function handleEdit(br: BonReception) {
    setEditTarget(br)
    setModal('edit')
  }

  function handleDelete(br: BonReception) {
    deleteBonReception(br.id)
    setSelectedId(null)
  }

  function handleSave(data: Omit<BonReception, 'id'>) {
    if (modal === 'edit' && editTarget) {
      updateBonReception(editTarget.id, data)
      setModal(null)
      setEditTarget(null)
    } else {
      const newBR = addBonReception(data)
      setModal(null)
      setSelectedId(newBR.id)
    }
  }

  // Si un BR est sélectionné → vue document
  if (selectedBR && selectedIndex !== -1) {
    return (
      <>
        <BRView
          br={selectedBR}
          allBR={items}
          currentIndex={selectedIndex}
          onClose={() => setSelectedId(null)}
          onNavigate={id => setSelectedId(id)}
          onStatut={updateBRStatut}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        {modal === 'edit' && editTarget && (
          <ModalBR
            achats={achats}
            agenceNom={agenceNom}
            initial={editTarget}
            onSave={handleSave}
            onClose={() => { setModal(null); setEditTarget(null) }}
          />
        )}
      </>
    )
  }

  return (
    <div className="h-full flex flex-col gap-3">

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Bons de réception</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>
        <button onClick={() => setModal('create')}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
          + Nouveau BR
        </button>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 cursor-pointer hover:border-gray-300"
          onClick={() => setStatutFilter('all')}>
          <p className="text-xs text-gray-500">Total BR</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className={`rounded-xl border p-3 cursor-pointer transition-colors ${
          statutFilter === 'Reçu' ? 'border-green-400 bg-green-100' : 'border-green-200 bg-green-50 hover:border-green-300'
        }`} onClick={() => setStatutFilter(f => f === 'Reçu' ? 'all' : 'Reçu')}>
          <p className="text-xs text-green-600">Reçus</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{recus}</p>
        </div>
        <div className={`rounded-xl border p-3 cursor-pointer transition-colors ${
          statutFilter === 'Attendu' ? 'border-amber-400 bg-amber-100' : 'border-amber-200 bg-amber-50 hover:border-amber-300'
        }`} onClick={() => setStatutFilter(f => f === 'Attendu' ? 'all' : 'Attendu')}>
          <p className="text-xs text-amber-600">Attendus</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{attendus}</p>
        </div>
        <div className={`rounded-xl border p-3 cursor-pointer transition-colors ${
          statutFilter === 'Litige' ? 'border-red-400 bg-red-100' : 'border-red-200 bg-red-50 hover:border-red-300'
        }`} onClick={() => setStatutFilter(f => f === 'Litige' ? 'all' : 'Litige')}>
          <p className="text-xs text-red-600">Litiges</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{litiges}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Fournisseur, N° BR, commande…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <select value={statutFilter}
            onChange={e => setStatutFilter(e.target.value as BRStatut | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="all">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <PeriodFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
            count={isFiltered ? `${items.length} résultat${items.length > 1 ? 's' : ''}` : null}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° BR</th>
                <th className="px-4 py-2.5">Commande</th>
                <th className="px-4 py-2.5">Fournisseur</th>
                {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                <th className="px-4 py-2.5">Articles</th>
                <th className="px-4 py-2.5">Date prévue</th>
                <th className="px-4 py-2.5">Date réception</th>
                <th className="px-4 py-2.5">Statut</th>
                <th className="px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                    Aucun bon de réception trouvé
                  </td>
                </tr>
              ) : items.map(b => (
                <tr key={b.id}
                  className="hover:bg-green-50/50 cursor-pointer group"
                  onClick={() => setSelectedId(b.id)}>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{b.id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{b.commande}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{b.fournisseur}</td>
                  {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{b.agence}</td>}
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {(b.lignes ?? []).length > 0
                      ? `${(b.lignes ?? []).length} article${(b.lignes ?? []).length !== 1 ? 's' : ''}`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(b.datePrevue).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {b.dateReception ? new Date(b.dateReception).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select value={b.statut}
                      onChange={e => updateBRStatut(b.id, e.target.value as BRStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[b.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditTarget(b); setModal('edit') }}
                        className="rounded px-2 py-0.5 text-xs text-amber-600 hover:bg-amber-50"
                        title="Modifier">✏️</button>
                      <button
                        onClick={() => setSelectedId(b.id)}
                        className="rounded px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                        title="Ouvrir">👁</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <ModalBR
          achats={achats}
          agenceNom={agenceNom}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'edit' && editTarget && (
        <ModalBR
          achats={achats}
          agenceNom={agenceNom}
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
