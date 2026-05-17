import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi, type Employee, type EmploymentType, type PaymentMethod } from '@/services/hrApi'

const fmt = (n: number) => new Intl.NumberFormat('fr-CM').format(n) + ' FCFA'

const TYPE_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: 'Temps plein',
  PART_TIME: 'Temps partiel',
  CONTRACT:  'CDD',
  INTERN:    'Stage',
}
const TYPE_COLOR: Record<EmploymentType, string> = {
  FULL_TIME: 'bg-green-100 text-green-700',
  PART_TIME: 'bg-blue-100 text-blue-700',
  CONTRACT:  'bg-amber-100 text-amber-700',
  INTERN:    'bg-purple-100 text-purple-700',
}

interface FormData {
  firstName:           string
  lastName:            string
  email:               string
  phone:               string
  employmentType:      EmploymentType
  grossSalary:         string
  startDate:           string
  // Paiement
  paymentMethod:       PaymentMethod | ''
  mobileMoneyNumber:   string
  mobileMoneyProvider: string
  bankName:            string
  bankAccountHolder:   string
  bankAccountNumber:   string
  bankSwiftCode:       string
}

function emptyForm(): FormData {
  return {
    firstName: '', lastName: '', email: '', phone: '',
    employmentType: 'FULL_TIME', grossSalary: '', startDate: '',
    paymentMethod: '', mobileMoneyNumber: '', mobileMoneyProvider: '',
    bankName: '', bankAccountHolder: '', bankAccountNumber: '', bankSwiftCode: '',
  }
}

function fromEmployee(e: Employee): FormData {
  return {
    firstName:           e.firstName,
    lastName:            e.lastName,
    email:               e.email ?? '',
    phone:               e.phone ?? '',
    employmentType:      e.employmentType,
    grossSalary:         String(e.grossSalary),
    startDate:           e.startDate.slice(0, 10),
    paymentMethod:       e.paymentMethod ?? '',
    mobileMoneyNumber:   e.mobileMoneyNumber ?? '',
    mobileMoneyProvider: e.mobileMoneyProvider ?? '',
    bankName:            e.bankName ?? '',
    bankAccountHolder:   e.bankAccountHolder ?? '',
    bankAccountNumber:   e.bankAccountNumber ?? '',
    bankSwiftCode:       e.bankSwiftCode ?? '',
  }
}

// ── Modal create + edit ──────────────────────────────────────────────────────

interface ModalProps {
  mode:     'create' | 'edit'
  employee?: Employee
  onClose:   () => void
  onSaved:   () => void
}

function EmployeeFormModal({ mode, employee, onClose, onSaved }: ModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormData>(employee ? fromEmployee(employee) : emptyForm())
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        firstName:      form.firstName.trim(),
        lastName:       form.lastName.trim(),
        ...(form.email.trim()                ? { email:               form.email.trim() }               : {}),
        ...(form.phone.trim()                ? { phone:               form.phone.trim() }               : {}),
        employmentType: form.employmentType,
        grossSalary:    parseFloat(form.grossSalary),
        startDate:      form.startDate,
        ...(form.paymentMethod               ? { paymentMethod:       form.paymentMethod as PaymentMethod } : {}),
        ...(form.mobileMoneyNumber.trim()    ? { mobileMoneyNumber:   form.mobileMoneyNumber.trim() }    : {}),
        ...(form.mobileMoneyProvider.trim()  ? { mobileMoneyProvider: form.mobileMoneyProvider.trim() }  : {}),
        ...(form.bankName.trim()             ? { bankName:            form.bankName.trim() }             : {}),
        ...(form.bankAccountHolder.trim()    ? { bankAccountHolder:   form.bankAccountHolder.trim() }    : {}),
        ...(form.bankAccountNumber.trim()    ? { bankAccountNumber:   form.bankAccountNumber.trim() }    : {}),
        ...(form.bankSwiftCode.trim()        ? { bankSwiftCode:       form.bankSwiftCode.trim() }        : {}),
      }
      return mode === 'create'
        ? hrApi.create(payload)
        : hrApi.update(employee!.id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employee-stats'] })
      onSaved()
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setError(err.response?.data?.error ?? err.message ?? 'Erreur lors de l\'enregistrement')
    },
  })

  const valid =
    form.firstName.trim().length >= 1 &&
    form.lastName.trim().length >= 1 &&
    parseFloat(form.grossSalary) > 0 &&
    !!form.startDate

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={e => { e.preventDefault(); if (valid) mutation.mutate() }}
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-forest-900">
          <h2 className="text-sm font-semibold text-white">
            {mode === 'create' ? 'Nouvel employé' : `Modifier ${employee?.firstName} ${employee?.lastName}`}
          </h2>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prénom *</label>
              <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nom *</label>
              <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                   className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                   placeholder="prenom.nom@entreprise.cm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Type de contrat *</label>
              <select value={form.employmentType} onChange={e => set('employmentType', e.target.value as EmploymentType)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30">
                {(Object.keys(TYPE_LABEL) as EmploymentType[]).map(t => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Salaire brut (FCFA) *</label>
              <input type="number" min="0" step="1000" value={form.grossSalary} onChange={e => set('grossSalary', e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                     placeholder="500000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date d'entrée *</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                     placeholder="237 6XX XXX XXX"
                     className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
            </div>
          </div>

          {/* ── Moyens de paiement ────────────────────────────────────────── */}
          <details className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2" open>
            <summary className="cursor-pointer text-xs font-bold text-gray-700 uppercase tracking-wide py-1">
              💰 Moyens de paiement du salaire
            </summary>
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mode de paiement préféré</label>
                <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value as PaymentMethod | '')}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30">
                  <option value="">— Aucun choisi —</option>
                  <option value="MOBILE_MONEY">📱 Mobile Money</option>
                  <option value="BANK_TRANSFER">🏦 Virement bancaire</option>
                  <option value="CASH">💵 Espèces</option>
                  <option value="CHECK">📄 Chèque</option>
                </select>
              </div>

              {(form.paymentMethod === 'MOBILE_MONEY' || form.mobileMoneyNumber || form.mobileMoneyProvider) && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-orange-50 border border-orange-100">
                  <div>
                    <label className="block text-xs font-semibold text-orange-700 mb-1">Opérateur Mobile Money</label>
                    <select value={form.mobileMoneyProvider} onChange={e => set('mobileMoneyProvider', e.target.value)}
                            className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                      <option value="">—</option>
                      <option value="ORANGE">Orange Money</option>
                      <option value="MTN">MTN MoMo</option>
                      <option value="EU">Express Union</option>
                      <option value="YUP">YUP</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-orange-700 mb-1">Numéro Mobile Money</label>
                    <input type="tel" value={form.mobileMoneyNumber} onChange={e => set('mobileMoneyNumber', e.target.value)}
                           placeholder="237 6XX XXX XXX"
                           className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                </div>
              )}

              {(form.paymentMethod === 'BANK_TRANSFER' || form.bankAccountNumber || form.bankName) && (
                <div className="space-y-3 p-3 rounded-md bg-blue-50 border border-blue-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">Banque</label>
                      <input type="text" value={form.bankName} onChange={e => set('bankName', e.target.value)}
                             placeholder="BICEC, Afriland, UBA…"
                             className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">Titulaire du compte</label>
                      <input type="text" value={form.bankAccountHolder} onChange={e => set('bankAccountHolder', e.target.value)}
                             placeholder="NOM Prénom"
                             className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">N° de compte / RIB</label>
                      <input type="text" value={form.bankAccountNumber} onChange={e => set('bankAccountNumber', e.target.value)}
                             placeholder="CM21 1000 5..."
                             className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">Code SWIFT / BIC (optionnel)</label>
                      <input type="text" value={form.bankSwiftCode} onChange={e => set('bankSwiftCode', e.target.value)}
                             placeholder="CBCAMCMX"
                             className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </details>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">⚠️ {error}</div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose} disabled={mutation.isPending}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-white transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={!valid || mutation.isPending}
                  className="flex-1 rounded-lg bg-forest-900 py-2.5 text-sm font-semibold text-white hover:bg-forest-700 transition-colors disabled:opacity-40">
            {mutation.isPending ? 'Enregistrement…' : (mode === 'create' ? '+ Créer l\'employé' : 'Mettre à jour')}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────

export function EmployesPage() {
  const qc = useQueryClient()
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<Employee | null>(null)
  const [toast,     setToast]     = useState<string | null>(null)

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => hrApi.list(),
    staleTime: 15_000,
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => hrApi.toggle(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrApi.remove(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setToast('✓ Employé supprimé')
      setTimeout(() => setToast(null), 3000)
    },
  })

  const filtered = employees.filter(e =>
    !search ||
    `${e.firstName} ${e.lastName} ${e.email ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Employés</h1>
          <p className="mt-1 text-sm text-gray-500">
            {employees.filter(e => !e.endDate).length} actifs sur {employees.length}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors"
        >
          + Nouvel employé
        </button>
      </div>

      {toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">{toast}</div>
      )}

      <input
        type="search"
        placeholder="Rechercher un employé…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30"
      />

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Nom</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Entrée</th>
              <th className="px-5 py-3 text-right">Salaire brut</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3 w-32 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                {search ? 'Aucun résultat' : 'Aucun employé'}
              </td></tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-forest-100 flex items-center justify-center text-xs font-bold text-forest-700">
                        {e.firstName[0]}{e.lastName[0]}
                      </div>
                      <span className="font-medium text-gray-900">{e.firstName} {e.lastName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{e.email}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLOR[e.employmentType]}`}>
                      {TYPE_LABEL[e.employmentType]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {new Date(e.startDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {fmt(Number(e.grossSalary))}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleMutation.mutate(e.id)}
                      title={e.endDate ? 'Réactiver' : 'Désactiver'}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        e.endDate ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}>
                      {e.endDate ? 'Inactif' : 'Actif'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex justify-center gap-1.5">
                      <button
                        onClick={() => { setEditing(e); setShowModal(true) }}
                        title="Modifier"
                        className="text-xs rounded-md border border-gray-200 px-2.5 py-1 hover:bg-gray-50 hover:border-forest-300 transition-colors">
                        ✎ Modifier
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer l'employé ${e.firstName} ${e.lastName} ?`)) {
                            deleteMutation.mutate(e.id)
                          }
                        }}
                        title="Supprimer"
                        className="text-xs rounded-md border border-red-200 text-red-600 px-2.5 py-1 hover:bg-red-50 transition-colors">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <EmployeeFormModal
          mode={editing ? 'edit' : 'create'}
          {...(editing ? { employee: editing } : {})}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => {
            setShowModal(false)
            setToast(editing ? '✓ Employé mis à jour' : '✓ Employé créé')
            setEditing(null)
            setTimeout(() => setToast(null), 3000)
          }}
        />
      )}
    </div>
  )
}
