import { useState, useMemo } from 'react'
import { useHR } from '@/contexts/HRContext'
import {
  useContracts, type EmploymentContract, type ContractType, type ContractStatus,
  generateTemplate,
} from '@/contexts/ContractsContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<ContractType, string> = {
  FULL_TIME: 'CDI — Temps plein',
  PART_TIME: 'CDI — Temps partiel',
  CONTRACT:  'CDD',
  INTERN:    'Convention de stage',
}
const TYPE_BADGE: Record<ContractType, string> = {
  FULL_TIME: 'bg-green-100 text-green-700',
  PART_TIME: 'bg-teal-100 text-teal-700',
  CONTRACT:  'bg-blue-100 text-blue-700',
  INTERN:    'bg-amber-100 text-amber-700',
}
const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Brouillon', SIGNED: 'Signé', TERMINATED: 'Résilié',
}
const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', SIGNED: 'bg-green-100 text-green-700', TERMINATED: 'bg-red-100 text-red-600',
}
const EMP_TYPE_TO_CONTRACT: Record<string, ContractType> = {
  FULL_TIME: 'FULL_TIME', PART_TIME: 'PART_TIME', CONTRACT: 'CONTRACT', INTERN: 'INTERN',
}
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
const fmtSal  = (n: number) => new Intl.NumberFormat('fr-CM').format(n) + ' FCFA'

// ── Print helper ──────────────────────────────────────────────────────────────
function printContract(contract: EmploymentContract) {
  const w = window.open('', '_blank', 'width=900,height=750,scrollbars=yes')
  if (!w) return
  const title = TYPE_LABEL[contract.contractType]
  // Escape HTML in contract text, preserve line breaks
  const body = contract.content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  w.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${title} — ${contract.employeeName}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.7;
         max-width: 800px; margin: 40px auto; color: #111; padding: 0 32px; }
  h1   { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 4px; }
  .sub { font-size: 11px; text-align: center; color: #555; margin-bottom: 24px; }
  pre  { font-family: inherit; font-size: 13px; white-space: pre-wrap; word-wrap: break-word;
         margin: 0; line-height: 1.7; }
  @media print { body { margin: 20px; } }
</style></head>
<body>
  <h1>${title}</h1>
  <div class="sub">${contract.employeeName} · ${contract.poste} · ${contract.departement}</div>
  <pre>${body}</pre>
</body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 400)
}

// ── Contract editor modal ─────────────────────────────────────────────────────
interface EditorModalProps {
  contract:  EmploymentContract
  onSave:    (patch: Partial<EmploymentContract>) => void
  onClose:   () => void
  onDelete:  () => void
}

function EditorModal({ contract, onSave, onClose, onDelete }: EditorModalProps) {
  const [content,  setContent]  = useState(contract.content)
  const [status,   setStatus]   = useState<ContractStatus>(contract.status)
  const [isDirty,  setIsDirty]  = useState(false)
  const [tab,      setTab]      = useState<'infos' | 'texte'>('texte')

  function handleChange(val: string) { setContent(val); setIsDirty(true) }
  function handleStatus(s: ContractStatus) { setStatus(s); setIsDirty(true) }

  function handleSave() {
    const patch: Partial<EmploymentContract> = { content, status }
    if (status === 'SIGNED' && !contract.signedAt) {
      patch.signedAt = new Date().toISOString().slice(0, 10)
    }
    onSave(patch)
    setIsDirty(false)
  }

  function handleResetText() {
    const fresh = generateTemplate(contract.contractType, {
      firstName: contract.employeeName.split(' ')[0] ?? '',
      lastName:  contract.employeeName.split(' ').slice(1).join(' '),
      poste: contract.poste, departement: contract.departement,
      startDate: contract.startDate, endDate: contract.endDate,
      grossSalary: contract.grossSalary,
    })
    setContent(fresh)
    setIsDirty(true)
  }

  const typeColor = TYPE_BADGE[contract.contractType] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColor}`}>
              {TYPE_LABEL[contract.contractType]}
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{contract.employeeName}</h2>
              <p className="text-xs text-gray-500">{contract.poste} · {contract.departement}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-100 bg-gray-50 shrink-0">
          {(['texte', 'infos'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t ? 'bg-white text-gray-900 border border-b-white border-gray-200 -mb-px' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'texte' ? '📄 Texte du contrat' : 'ℹ️ Informations'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {tab === 'texte' ? (
            <div className="h-full flex flex-col p-4 gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Éditez le texte du contrat ci-dessous. Les modifications sont enregistrées avec le bouton « Enregistrer ».</p>
                <button onClick={handleResetText}
                  className="text-xs text-blue-600 hover:text-blue-800 underline">
                  ↺ Régénérer depuis le modèle
                </button>
              </div>
              <textarea
                value={content}
                onChange={e => handleChange(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-forest-600 resize-none"
                style={{ minHeight: '480px' }}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Key info grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Employé',      value: contract.employeeName },
                  { label: 'Email',        value: contract.employeeEmail },
                  { label: 'Poste',        value: contract.poste },
                  { label: 'Département',  value: contract.departement },
                  { label: 'Type',         value: TYPE_LABEL[contract.contractType] },
                  { label: 'Salaire brut', value: fmtSal(contract.grossSalary) },
                  { label: 'Date de début', value: fmtDate(contract.startDate) },
                  { label: 'Date de fin',   value: fmtDate(contract.endDate) },
                  { label: 'Lieu de travail', value: contract.lieuTravail },
                  { label: 'Créé le',       value: fmtDate(contract.createdAt) },
                  { label: 'Signé le',      value: fmtDate(contract.signedAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Status change */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Modifier le statut</p>
                <div className="flex gap-2 flex-wrap">
                  {(['DRAFT', 'SIGNED', 'TERMINATED'] as ContractStatus[]).map(s => (
                    <button key={s} onClick={() => handleStatus(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        status === s ? `${STATUS_BADGE[s]} ring-2 ring-offset-1 ring-current` : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}>
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="border border-red-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-700 mb-1">Zone de danger</p>
                <p className="text-xs text-gray-500 mb-3">La suppression du contrat est irréversible.</p>
                <button onClick={() => { if (window.confirm('Supprimer définitivement ce contrat ?')) onDelete() }}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors border border-red-200">
                  Supprimer le contrat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            {contract.signedAt && (
              <span className="text-xs text-gray-500">Signé le {fmtDate(contract.signedAt)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => printContract({ ...contract, content, status })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer
            </button>
            <button onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
              Fermer
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isDirty ? 'bg-forest-900 text-white hover:bg-forest-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Generate confirm modal ────────────────────────────────────────────────────
interface GenerateModalProps {
  employeeId:   string
  employeeName: string
  defaultType:  ContractType
  employees:    ReturnType<typeof useHR>['employees']
  onGenerate:   (type: ContractType, lieu: string) => void
  onClose:      () => void
}

function GenerateModal({ employeeName, defaultType, onGenerate, onClose }: GenerateModalProps) {
  const [type, setType] = useState<ContractType>(defaultType)
  const [lieu, setLieu] = useState('Yaoundé')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Générer un contrat</h3>
        <p className="text-sm text-gray-500 mb-4">{employeeName}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de contrat</label>
            <select value={type} onChange={e => setType(e.target.value as ContractType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600">
              <option value="FULL_TIME">CDI — Temps plein</option>
              <option value="PART_TIME">CDI — Temps partiel</option>
              <option value="CONTRACT">CDD</option>
              <option value="INTERN">Convention de stage</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lieu de travail</label>
            <input value={lieu} onChange={e => setLieu(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600"
              placeholder="ex. Yaoundé" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={() => onGenerate(type, lieu)}
            className="flex-1 py-2 rounded-lg bg-forest-900 text-white text-sm font-medium hover:bg-forest-800">
            Générer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ContratsHRPage() {
  const { employees } = useHR()
  const { contracts, addContract, updateContract, deleteContract } = useContracts()

  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [filter,       setFilter]       = useState<ContractStatus | 'ALL'>('ALL')

  const today = new Date()

  // Map empId → contract
  const contractsByEmp = useMemo(
    () => new Map(contracts.map(c => [c.employeeId, c])),
    [contracts],
  )

  const editingContract = editingId ? (contracts.find(c => c.id === editingId) ?? null) : null
  const generatingEmp   = generatingId ? (employees.find(e => e.id === generatingId) ?? null) : null

  // Contracts expiring within 90 days
  const alerts = employees.filter(e => {
    if (!e.endDate) return false
    const fin = new Date(e.endDate)
    return fin > today && fin <= new Date(today.getTime() + 90 * 86_400_000)
  })

  // Filtered contracts view
  const filteredContracts = useMemo(() =>
    contracts.filter(c => filter === 'ALL' || c.status === filter),
    [contracts, filter],
  )

  const stats = {
    total:     contracts.length,
    signed:    contracts.filter(c => c.status === 'SIGNED').length,
    draft:     contracts.filter(c => c.status === 'DRAFT').length,
    noContract: employees.filter(e => !contractsByEmp.has(e.id)).length,
  }

  function handleGenerate(type: ContractType, lieu: string) {
    if (!generatingEmp) return
    const content = generateTemplate(type, {
      firstName: generatingEmp.firstName, lastName: generatingEmp.lastName,
      poste: generatingEmp.poste, departement: generatingEmp.departement,
      startDate: generatingEmp.startDate, endDate: generatingEmp.endDate,
      grossSalary: generatingEmp.grossSalary,
    }, 'Nexoria SARL', lieu)

    addContract({
      employeeId:    generatingEmp.id,
      employeeName:  `${generatingEmp.firstName} ${generatingEmp.lastName}`,
      employeeEmail: generatingEmp.email,
      contractType:  type,
      status:        'DRAFT',
      startDate:     generatingEmp.startDate,
      endDate:       generatingEmp.endDate,
      grossSalary:   generatingEmp.grossSalary,
      poste:         generatingEmp.poste,
      departement:   generatingEmp.departement,
      lieuTravail:   lieu,
      content,
      signedAt:      null,
    })
    setGeneratingId(null)
    // Find the newly created contract and open it
    // (will be the last in the array since we push to end)
    setTimeout(() => {
      const latest = contracts[contracts.length - 1]
      if (latest) setEditingId(latest.id)
    }, 50)
  }

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contrats de travail</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.signed} signé(s) · {stats.draft} brouillon(s)</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total contrats', value: stats.total,      color: 'text-gray-800' },
          { label: 'Signés',         value: stats.signed,     color: 'text-green-700' },
          { label: 'Brouillons',     value: stats.draft,      color: 'text-gray-500' },
          { label: 'Sans contrat',   value: stats.noContract, color: stats.noContract > 0 ? 'text-amber-600' : 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Alert renouvellement */}
      {alerts.length > 0 && (
        <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <span className="text-amber-600 text-lg shrink-0">⚠</span>
          <p className="text-sm text-amber-800">
            <strong>{alerts.length} contrat{alerts.length > 1 ? 's' : ''} à renouveler :</strong>{' '}
            {alerts.map(e => `${e.firstName} ${e.lastName} (fin ${fmtDate(e.endDate)})`).join(' · ')}
          </p>
        </div>
      )}

      {/* ── Employés sans contrat ── */}
      {stats.noContract > 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Employés sans contrat généré ({stats.noContract})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {employees.filter(e => !contractsByEmp.has(e.id)).map(emp => (
              <div key={emp.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-gray-400">{emp.poste}</p>
                  </div>
                </div>
                <button
                  onClick={() => setGeneratingId(emp.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-900 text-white text-xs font-medium hover:bg-forest-800 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Générer contrat
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Contracts list ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Contrats générés</h2>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(['ALL', 'DRAFT', 'SIGNED', 'TERMINATED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {f === 'ALL' ? 'Tous' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucun contrat</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Employé</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-center font-medium">Début</th>
                <th className="px-4 py-2 text-center font-medium">Fin</th>
                <th className="px-4 py-2 text-right font-medium">Salaire brut</th>
                <th className="px-4 py-2 text-center font-medium">Statut</th>
                <th className="px-4 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContracts.map(c => {
                const isExpSoon = c.endDate && (() => {
                  const fin = new Date(c.endDate!)
                  return fin > today && fin <= new Date(today.getTime() + 90 * 86_400_000)
                })()

                return (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${isExpSoon ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{c.employeeName}</p>
                      <p className="text-xs text-gray-400">{c.poste}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[c.contractType]}`}>
                        {TYPE_LABEL[c.contractType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">{fmtDate(c.startDate)}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      {c.endDate ? (
                        <span className={isExpSoon ? 'text-amber-700 font-medium' : 'text-gray-600'}>
                          {isExpSoon ? '⚠ ' : ''}{fmtDate(c.endDate)}
                        </span>
                      ) : <span className="text-gray-400">Indéterminée</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 text-xs font-mono">
                      {fmtSal(c.grossSalary)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setEditingId(c.id)}
                          className="text-xs px-3 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors">
                          {c.status === 'SIGNED' ? '👁 Voir' : '✏️ Éditer'}
                        </button>
                        <button onClick={() => printContract(c)}
                          title="Imprimer"
                          className="text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors">
                          🖨
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {editingContract && (
        <EditorModal
          contract={editingContract}
          onSave={patch => { updateContract(editingContract.id, patch); setEditingId(null) }}
          onClose={() => setEditingId(null)}
          onDelete={() => { deleteContract(editingContract.id); setEditingId(null) }}
        />
      )}
      {generatingId && generatingEmp && (
        <GenerateModal
          employeeId={generatingId}
          employeeName={`${generatingEmp.firstName} ${generatingEmp.lastName}`}
          defaultType={EMP_TYPE_TO_CONTRACT[generatingEmp.employmentType] ?? 'FULL_TIME'}
          employees={employees}
          onGenerate={handleGenerate}
          onClose={() => setGeneratingId(null)}
        />
      )}
    </div>
  )
}
