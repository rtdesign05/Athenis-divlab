import { useMemo, useState, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type BLStatut, type BonLivraison, type LigneLivraison } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { SendEmailModal } from '@/components/gestion/SendEmailModal'
import { printDocument } from '@/lib/printDocument'
import { generateQRDataUrl, buildBLQR } from '@/lib/qrCode'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<BLStatut, string> = {
  'En préparation': 'bg-amber-100 text-amber-700',
  'Expédié':        'bg-blue-100 text-blue-700',
  'Livré':          'bg-green-100 text-green-700',
  'Retourné':       'bg-red-100 text-red-600',
}

const STATUTS: BLStatut[] = ['En préparation', 'Expédié', 'Livré', 'Retourné']

const AGENCES = ['Siège']

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Email HTML builder ────────────────────────────────────────────────────────

function buildBLEmailHtml(bl: BonLivraison, companyName: string, address: string, city: string): string {
  const lignesRows = bl.lignes.map((l, i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:center">${i + 1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;font-family:monospace">${l.reference}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${l.designation}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right">${l.quantite} ${l.unite}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      <tr><td style="background:#1a3a2a;padding:28px 40px;text-align:center">
        <span style="color:#fff;font-size:20px;font-weight:700">Athenis</span>
      </td></tr>
      <tr><td style="padding:36px 40px">
        <h1 style="margin:0 0 4px;font-size:18px;color:#111827">Bon de livraison N° ${bl.id}</h1>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280">De la part de <strong>${companyName}</strong>${address ? `, ${address}` : ''}${city ? `, ${city}` : ''}</p>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280">Commande : <strong>${bl.commande}</strong> | Agence : ${bl.agence}</p>
        <!--CUSTOM_MESSAGE-->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:center;width:32px">N°</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:left">Référence</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:left">Désignation</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:right">Quantité</th>
            </tr>
          </thead>
          <tbody>${lignesRows}</tbody>
        </table>
        ${bl.adresseLivraison ? `<p style="font-size:12px;color:#9ca3af;margin:0">Adresse de livraison : ${bl.adresseLivraison}</p>` : ''}
      </td></tr>
      <tr><td style="background:#f9fafb;padding:18px 40px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} ${companyName} — Document généré par Athenis</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ── BLView — document pleine page ─────────────────────────────────────────────

interface BLViewProps {
  bl:           BonLivraison
  allBL:        BonLivraison[]
  currentIndex: number
  onClose:      () => void
  onNavigate:   (id: string) => void
  onStatut:     (id: string, s: BLStatut) => void
}

function BLView({ bl, allBL, currentIndex, onClose, onNavigate, onStatut }: BLViewProps) {
  const { company }  = useCompanySettings()
  const { clients }  = useGestion()
  const [emailOpen, setEmailOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const docRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    generateQRDataUrl(buildBLQR(bl)).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [bl.id, bl.statut])

  const companyName    = company?.name         ?? 'Société Athenis'
  const companyAddress = company?.address      ?? '12 Rue Bonanjo'
  const companyCity    = company?.city         ?? 'Douala'
  const companyPhone   = company?.phone        ?? ''
  const companyEmail   = company?.contactEmail ?? ''

  const clientEmail = clients.find(c => c.nom === bl.client)?.email ?? ''

  const prev = currentIndex > 0              ? allBL[currentIndex - 1] : null
  const next = currentIndex < allBL.length - 1 ? allBL[currentIndex + 1] : null

  const totalQte = bl.lignes.reduce((s, l) => s + l.quantite, 0)

  return (
    <div className="h-full flex flex-col">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5 flex-wrap">
        <button onClick={onClose}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
          ← Liste
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-sm font-semibold text-gray-800">{bl.id}</span>
        <span className="text-gray-300">|</span>

        <div className="flex items-center gap-1">
          <button disabled={!prev} onClick={() => prev && onNavigate(prev.id)}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            Préc.
          </button>
          <span className="text-xs text-gray-400">{currentIndex + 1}/{allBL.length}</span>
          <button disabled={!next} onClick={() => next && onNavigate(next.id)}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">
            Suiv.
          </button>
        </div>

        <span className="text-gray-300">|</span>

        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLE[bl.statut]}`}>
          {bl.statut}
        </span>
        <select value={bl.statut}
          onChange={e => onStatut(bl.id, e.target.value as BLStatut)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30">
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setEmailOpen(true)}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
            ✉️ Envoyer
          </button>
          <button onClick={() => printDocument(docRef.current, `BON DE LIVRAISON ${bl.id}`)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            🖨️ PDF
          </button>
        </div>
      </div>

      {/* Modal e-mail */}
      <SendEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        to={clientEmail}
        subject={`Bon de livraison N° ${bl.id} — ${companyName}`}
        documentRef={bl.id}
        documentType="Bon de livraison"
        clientName={bl.client}
        bodyHtml={buildBLEmailHtml(bl, companyName, companyAddress, companyCity)}
      />

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
              <p className="text-2xl font-bold text-gray-900 uppercase tracking-wide">BON DE LIVRAISON</p>
              <p className="mt-1 text-sm text-gray-700 font-mono">N° {bl.id}</p>
              <p className="text-sm text-gray-500 mt-0.5">Émis le {fmtDate(bl.dateCreation)}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${STATUT_STYLE[bl.statut]}`}>
                {bl.statut}
              </span>
            </div>
          </div>

          {/* Grille infos */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Destinataire */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Destinataire</p>
              <p className="font-semibold text-gray-900">{bl.client}</p>
              {bl.adresseLivraison && (
                <p className="text-sm text-gray-600 mt-0.5">{bl.adresseLivraison}</p>
              )}
            </div>
            {/* Références */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Références</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Commande</span>
                <span className="font-mono font-medium text-gray-900">{bl.commande}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Livraison prévue</span>
                <span className="text-gray-900">{fmtDate(bl.datePrevue)}</span>
              </div>
              {bl.dateLivraison && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Livré le</span>
                  <span className="font-medium text-green-700">{fmtDate(bl.dateLivraison)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Agence</span>
                <span className="text-gray-900">{bl.agence}</span>
              </div>
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
                  <th className="px-4 py-2.5 text-right text-xs font-semibold w-24">Quantité</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold w-20">Unité</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold w-28">Reçu conforme</th>
                </tr>
              </thead>
              <tbody>
                {bl.lignes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400 border border-gray-100">
                      Aucun article renseigné
                    </td>
                  </tr>
                ) : bl.lignes.map((l, i) => (
                  <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="px-4 py-2.5 text-xs text-gray-400 border border-gray-100">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 border border-gray-100">{l.reference}</td>
                    <td className="px-4 py-2.5 text-gray-900 border border-gray-100">{l.designation}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900 border border-gray-100 tabular-nums">
                      {l.quantite.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 border border-gray-100">{l.unite}</td>
                    <td className="px-4 py-2.5 border border-gray-100">
                      {/* Case à cocher imprimable */}
                      <div className="flex justify-center">
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center
                          ${bl.statut === 'Livré' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                          {bl.statut === 'Livré' && <span className="text-green-600 text-[10px] leading-none">✓</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 font-medium">
                    {bl.lignes.length} article{bl.lignes.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-semibold text-gray-700 tabular-nums">
                    {totalQte.toLocaleString('fr-FR')} unités
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {bl.notes && (
            <div className="mb-8 rounded-xl border border-gray-100 bg-amber-50/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Notes / Instructions</p>
              <p className="text-sm text-gray-700 leading-relaxed">{bl.notes}</p>
            </div>
          )}

          {/* Signatures + QR */}
          <div className="mt-12 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-6">Émis par (expéditeur)</p>
                <p className="text-sm text-gray-700 mb-1">{companyName}</p>
                <p className="text-xs text-gray-400 mb-8">Date : {fmtDate(bl.dateCreation)}</p>
                <div className="border-t border-gray-300 pt-1">
                  <p className="text-[10px] text-gray-400">Signature &amp; cachet</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-6">Reçu par (destinataire)</p>
                <p className="text-sm text-gray-700 mb-1">{bl.client}</p>
                <p className="text-xs text-gray-400 mb-8">
                  Date : {bl.dateLivraison ? fmtDate(bl.dateLivraison) : '_______________'}
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
                    <p className="text-[10px] text-gray-400 font-mono">{bl.id}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-10 pt-4 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">
              {companyName} — {companyAddress}, {companyCity} — Document généré le {fmtDate(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal nouveau BL ──────────────────────────────────────────────────────────

interface ModalBLProps {
  commandes:  { id: string; client: string; agence: string }[]
  articles:   { id: string; reference: string; nom: string; unite: string; categorie: string }[]
  agenceNom:  string | null
  onSave:     (data: Omit<BonLivraison, 'id'>) => void
  onClose:    () => void
}

function ModalBL({ commandes, articles, agenceNom, onSave, onClose }: ModalBLProps) {
  const today = new Date().toISOString().slice(0, 10)

  const availableCmds = useMemo(
    () => agenceNom ? commandes.filter(c => c.agence === agenceNom) : commandes,
    [commandes, agenceNom],
  )

  const [form, setForm] = useState({
    commande:         availableCmds[0]?.id ?? '',
    client:           availableCmds[0]?.client ?? '',
    agence:           agenceNom ?? availableCmds[0]?.agence ?? 'Siège',
    datePrevue:       '',
    adresseLivraison: '',
    notes:            '',
  })

  const [lignes, setLignes] = useState<Omit<LigneLivraison, 'id'>[]>([
    { articleId: '', reference: '', designation: '', quantite: 1, unite: 'pièce' },
  ])

  function handleCommandeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cmd = availableCmds.find(c => c.id === e.target.value)
    setForm(f => ({
      ...f,
      commande: e.target.value,
      client:   cmd?.client ?? '',
      agence:   agenceNom ?? cmd?.agence ?? f.agence,
    }))
  }

  function handleArticleChange(idx: number, articleId: string) {
    const art = articles.find(a => a.id === articleId)
    setLignes(prev => prev.map((l, i) =>
      i !== idx ? l : {
        ...l,
        articleId,
        reference:   art?.reference   ?? '',
        designation: art?.nom         ?? '',
        unite:       art?.unite       ?? 'pièce',
      }
    ))
  }

  function updateLigne(idx: number, k: string, v: string | number) {
    setLignes(prev => prev.map((l, i) => i !== idx ? l : { ...l, [k]: v }))
  }

  function addLigne() {
    setLignes(prev => [...prev, { articleId: '', reference: '', designation: '', quantite: 1, unite: 'pièce' }])
  }

  function removeLigne(idx: number) {
    setLignes(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.datePrevue) return
    const validLignes = lignes.filter(l => l.designation.trim())
    onSave({
      commande:         form.commande,
      client:           form.client.trim() || '—',
      agence:           form.agence,
      dateCreation:     today,
      datePrevue:       form.datePrevue,
      dateLivraison:    null,
      statut:           'En préparation',
      adresseLivraison: form.adresseLivraison.trim(),
      notes:            form.notes.trim(),
      lignes:           validLignes.map((l, i) => ({ ...l, id: `l${i + 1}` })),
    })
  }

  const stockArticles = articles.filter(a => a.categorie !== 'Service')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau bon de livraison</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Commande + client */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Commande client</label>
              {availableCmds.length > 0 ? (
                <select value={form.commande} onChange={handleCommandeChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  <option value="">— libre —</option>
                  {availableCmds.map(c => (
                    <option key={c.id} value={c.id}>{c.id} — {c.client}</option>
                  ))}
                </select>
              ) : (
                <input value={form.commande}
                  onChange={e => setForm(f => ({ ...f, commande: e.target.value }))}
                  placeholder="CMD-xxxx"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
              <input value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                placeholder="Nom du client"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Livraison prévue *</label>
              <input type="date" value={form.datePrevue}
                onChange={e => setForm(f => ({ ...f, datePrevue: e.target.value }))} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse de livraison</label>
            <input value={form.adresseLivraison}
              onChange={e => setForm(f => ({ ...f, adresseLivraison: e.target.value }))}
              placeholder="Rue, quartier, ville…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>

          {/* Articles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Articles à livrer</label>
              <button type="button" onClick={addLigne}
                className="text-xs text-green-700 hover:text-green-800 font-medium">
                + Ajouter une ligne
              </button>
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500 font-medium">
                    <th className="px-3 py-2 text-left">Article</th>
                    <th className="px-3 py-2 text-left w-24">Réf.</th>
                    <th className="px-3 py-2 text-right w-20">Qté</th>
                    <th className="px-3 py-2 text-left w-20">Unité</th>
                    <th className="px-2 py-2 w-7" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lignes.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">
                        <div className="flex flex-col gap-1">
                          <select value={l.articleId}
                            onChange={e => handleArticleChange(i, e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30">
                            <option value="">— libre —</option>
                            {stockArticles.map(a => (
                              <option key={a.id} value={a.id}>{a.nom}</option>
                            ))}
                          </select>
                          {!l.articleId && (
                            <input value={l.designation}
                              onChange={e => updateLigne(i, 'designation', e.target.value)}
                              placeholder="Désignation libre…"
                              className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                          )}
                          {l.articleId && (
                            <span className="text-gray-400 text-[10px] pl-0.5">{l.designation}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={l.reference}
                          onChange={e => updateLigne(i, 'reference', e.target.value)}
                          placeholder="REF"
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={1} value={l.quantite}
                          onChange={e => updateLigne(i, 'quantite', Number(e.target.value))}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={l.unite}
                          onChange={e => updateLigne(i, 'unite', e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                      </td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeLigne(i)}
                          className="text-gray-300 hover:text-red-500 text-base leading-none">
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Instructions</label>
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              placeholder="Instructions de livraison, conditions particulières…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none" />
          </div>

          <div className="flex gap-2 pt-1 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              Créer le bon de livraison
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function BonsLivraisonPage() {
  const { user }    = useAuth()
  const { bonsLivraison, commandes, articles, updateBLStatut, addBonLivraison } = useGestion()

  const agenceNom = user?.agenceNom ?? null

  const [search,     setSearch]     = useState('')
  const [modal,      setModal]      = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  const items = useMemo(() => {
    let list = agenceNom ? bonsLivraison.filter(b => b.agence === agenceNom) : bonsLivraison
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.client.toLowerCase().includes(q)    ||
        b.id.toLowerCase().includes(q)        ||
        b.commande.toLowerCase().includes(q),
      )
    }
    list = filterByDateRange(list, b => b.dateCreation, dateFrom, dateTo)
    return list
  }, [bonsLivraison, agenceNom, search, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  const currentIndex = selectedId ? items.findIndex(b => b.id === selectedId) : -1

  // Navigation clavier ← →
  useEffect(() => {
    if (!selectedId) return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      const idx = items.findIndex(b => b.id === selectedId)
      if (e.key === 'ArrowLeft'  && idx > 0)               setSelectedId(items[idx - 1]!.id)
      if (e.key === 'ArrowRight' && idx < items.length - 1) setSelectedId(items[idx + 1]!.id)
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, items])

  const selectedBL = selectedId ? bonsLivraison.find(b => b.id === selectedId) ?? null : null

  // ── Takeover document ─────────────────────────────────────────────────────
  if (selectedBL) {
    return (
      <BLView
        bl={selectedBL}
        allBL={items}
        currentIndex={currentIndex}
        onClose={() => setSelectedId(null)}
        onNavigate={setSelectedId}
        onStatut={updateBLStatut}
      />
    )
  }

  const total     = items.length
  const livres    = items.filter(b => b.statut === 'Livré').length
  const enCours   = items.filter(b => b.statut === 'En préparation' || b.statut === 'Expédié').length
  const retournes = items.filter(b => b.statut === 'Retourné').length

  return (
    <div className="h-full flex flex-col gap-3">

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Bons de livraison</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>
        <button onClick={() => setModal(true)}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
          + Nouveau BL
        </button>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total BL</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Livrés</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{livres}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600">En cours</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{enCours}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600">Retournés</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{retournes}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Client, N° BL, N° commande…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <PeriodFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
            count={isFiltered ? `${items.length} résultat${items.length > 1 ? 's' : ''}` : null}
          />
          <span className="text-xs text-gray-400 ml-auto">
            Cliquer sur une ligne pour ouvrir le document
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° BL</th>
                <th className="px-4 py-2.5">Commande</th>
                <th className="px-4 py-2.5">Client</th>
                {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                <th className="px-4 py-2.5">Articles</th>
                <th className="px-4 py-2.5">Date prévue</th>
                <th className="px-4 py-2.5">Livraison réelle</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    Aucun bon de livraison trouvé
                  </td>
                </tr>
              ) : items.map(b => (
                <tr key={b.id}
                  className="hover:bg-green-50/40 cursor-pointer transition"
                  onClick={() => setSelectedId(b.id)}>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{b.id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{b.commande}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{b.client}</td>
                  {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{b.agence}</td>}
                  <td className="px-4 py-2.5">
                    {b.lignes.length === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <span className="text-xs text-gray-600">
                        {b.lignes.length} article{b.lignes.length !== 1 ? 's' : ''}
                        <span className="text-gray-400 ml-1">
                          ({b.lignes.reduce((s, l) => s + l.quantite, 0)} u.)
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(b.datePrevue).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {b.dateLivraison ? new Date(b.dateLivraison).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select value={b.statut}
                      onChange={e => updateBLStatut(b.id, e.target.value as BLStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[b.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalBL
          commandes={commandes}
          articles={articles}
          agenceNom={agenceNom}
          onSave={data => { addBonLivraison(data); setModal(false) }}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
