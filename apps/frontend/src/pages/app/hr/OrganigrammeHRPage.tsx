import { useState, useMemo } from 'react'
import { useHR, type HREmployee } from '@/contexts/HRContext'

// ── Design tokens ─────────────────────────────────────────────────────────────
const DEPT_CSS: Record<string, { card: string; badge: string; avatar: string }> = {
  Direction:      { card: 'border-purple-200 bg-purple-50',  badge: 'bg-purple-100 text-purple-700 border-purple-200',  avatar: 'bg-purple-200 text-purple-800' },
  Commercial:     { card: 'border-blue-200 bg-blue-50',      badge: 'bg-blue-100 text-blue-700 border-blue-200',        avatar: 'bg-blue-200 text-blue-800' },
  Finance:        { card: 'border-green-200 bg-green-50',    badge: 'bg-green-100 text-green-700 border-green-200',     avatar: 'bg-green-200 text-green-800' },
  Informatique:   { card: 'border-orange-200 bg-orange-50',  badge: 'bg-orange-100 text-orange-700 border-orange-200',  avatar: 'bg-orange-200 text-orange-800' },
  Administration: { card: 'border-gray-200 bg-gray-50',      badge: 'bg-gray-100 text-gray-600 border-gray-200',        avatar: 'bg-gray-200 text-gray-700' },
}
const DEPT_CSS_DEFAULT = { card: 'border-gray-200 bg-white', badge: 'bg-gray-100 text-gray-600 border-gray-200', avatar: 'bg-gray-200 text-gray-700' }

// SVG hex colors per department
const DEPT_SVG: Record<string, { bg: string; border: string; text: string; av: string }> = {
  Direction:      { bg: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9', av: '#ddd6fe' },
  Commercial:     { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', av: '#bfdbfe' },
  Finance:        { bg: '#f0fdf4', border: '#86efac', text: '#15803d', av: '#bbf7d0' },
  Informatique:   { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', av: '#fed7aa' },
  Administration: { bg: '#f9fafb', border: '#d1d5db', text: '#374151', av: '#e5e7eb' },
}
const DEPT_SVG_DEFAULT = { bg: '#f9fafb', border: '#e5e7eb', text: '#374151', av: '#f3f4f6' }

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'CDI', PART_TIME: 'Temps partiel', CONTRACT: 'CDD', INTERN: 'Stage',
}
const TYPE_BADGE: Record<string, string> = {
  FULL_TIME: 'bg-emerald-100 text-emerald-700',
  PART_TIME: 'bg-yellow-100 text-yellow-700',
  CONTRACT:  'bg-blue-100 text-blue-700',
  INTERN:    'bg-pink-100 text-pink-700',
}

const DEPTS_LIST = ['Direction', 'Commercial', 'Finance', 'Informatique', 'Administration', 'Production', 'Marketing', 'RH', 'Juridique']

// ── Tree layout algorithm ─────────────────────────────────────────────────────
const NODE_W = 192
const NODE_H = 104
const H_GAP  = 32
const V_GAP  = 72

interface LayoutNode { emp: HREmployee; x: number; y: number }

function buildSubtree(
  emp: HREmployee,
  all: HREmployee[],
  depth: number,
): { nodes: LayoutNode[]; width: number } {
  const children = all.filter(e => e.managerId === emp.id)

  if (children.length === 0) {
    return { nodes: [{ emp, x: 0, y: depth * (NODE_H + V_GAP) }], width: NODE_W }
  }

  // Layout each child subtree side by side
  let cursor = 0
  const subs: Array<{ nodes: LayoutNode[]; width: number; startX: number }> = []
  for (const child of children) {
    const sub = buildSubtree(child, all, depth + 1)
    subs.push({ ...sub, startX: cursor })
    cursor += sub.width + H_GAP
  }
  const totalChildW = cursor - H_GAP

  const myWidth  = Math.max(NODE_W, totalChildW)
  const childShift = (myWidth - totalChildW) / 2   // centers children under parent
  const myX      = (myWidth - NODE_W) / 2           // centers parent over children

  const nodes: LayoutNode[] = [{ emp, x: myX, y: depth * (NODE_H + V_GAP) }]
  for (const sub of subs) {
    for (const n of sub.nodes) {
      nodes.push({ ...n, x: n.x + sub.startX + childShift })
    }
  }
  return { nodes, width: myWidth }
}

function layoutAll(employees: HREmployee[]): { nodes: LayoutNode[]; svgW: number; svgH: number } {
  const roots = employees.filter(e => e.managerId === null)
  if (roots.length === 0) return { nodes: [], svgW: 0, svgH: 0 }

  let cursor = 0
  const allNodes: LayoutNode[] = []
  for (const root of roots) {
    const sub = buildSubtree(root, employees, 0)
    for (const n of sub.nodes) allNodes.push({ ...n, x: n.x + cursor })
    cursor += sub.width + H_GAP
  }
  const maxX = Math.max(...allNodes.map(n => n.x + NODE_W))
  const maxY = Math.max(...allNodes.map(n => n.y + NODE_H))
  return { nodes: allNodes, svgW: maxX, svgH: maxY }
}

// ── SVG export ────────────────────────────────────────────────────────────────
function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function generateSVG(employees: HREmployee[]): string {
  const PAD = 48
  const { nodes, svgW, svgH } = layoutAll(employees)
  if (nodes.length === 0) return ''

  const W = svgW + PAD * 2
  const H = svgH + PAD * 2 + 36  // extra for footer

  // Build a map empId → node for edge drawing
  const nodeMap = new Map(nodes.map(n => [n.emp.id, n]))

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
  svg += `<rect width="${W}" height="${H}" fill="#f8fafc"/>`

  // ── Edges ──
  for (const { emp, x, y } of nodes) {
    if (emp.managerId === null) continue
    const parent = nodeMap.get(emp.managerId)
    if (!parent) continue
    const px = PAD + parent.x + NODE_W / 2
    const py = PAD + parent.y + NODE_H
    const cx = PAD + x + NODE_W / 2
    const cy = PAD + y
    const mid = (py + cy) / 2
    svg += `<path d="M${px} ${py} L${px} ${mid} L${cx} ${mid} L${cx} ${cy}" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round"/>`
  }

  // ── Node cards ──
  for (const { emp, x, y } of nodes) {
    const col = DEPT_SVG[emp.departement] ?? DEPT_SVG_DEFAULT
    const nx = PAD + x
    const ny = PAD + y
    const initials = escapeXml(`${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase())
    const name   = escapeXml(truncate(`${emp.firstName} ${emp.lastName}`, 22))
    const poste  = escapeXml(truncate(emp.poste, 26))
    const dept   = escapeXml(emp.departement)
    const type   = escapeXml(TYPE_LABEL[emp.employmentType] ?? emp.employmentType)

    svg += `<g transform="translate(${nx},${ny})">`
    // Shadow
    svg += `<rect x="2" y="3" width="${NODE_W}" height="${NODE_H}" rx="10" fill="#00000012"/>`
    // Card
    svg += `<rect width="${NODE_W}" height="${NODE_H}" rx="10" fill="${col.bg}" stroke="${col.border}" stroke-width="1.5"/>`
    // Avatar circle
    svg += `<circle cx="${NODE_W / 2}" cy="26" r="18" fill="${col.av}"/>`
    svg += `<text x="${NODE_W / 2}" y="31" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700" fill="${col.text}">${initials}</text>`
    // Name
    svg += `<text x="${NODE_W / 2}" y="58" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="600" fill="#111827">${name}</text>`
    // Poste
    svg += `<text x="${NODE_W / 2}" y="71" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9.5" fill="#6b7280">${poste}</text>`
    // Dept badge
    svg += `<rect x="20" y="78" width="${NODE_W - 40}" height="14" rx="7" fill="${col.border}"/>`
    svg += `<text x="${NODE_W / 2}" y="89" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="8.5" fill="${col.text}">${dept} · ${type}</text>`
    svg += `</g>`
  }

  // ── Footer ──
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  svg += `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="#94a3b8">Organigramme — ${escapeXml(date)} — ${employees.length} collaborateurs</text>`
  svg += `</svg>`
  return svg
}

function downloadSVG(svg: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `organigramme-${new Date().toISOString().slice(0, 10)}.svg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAllSubordinates(empId: string, employees: HREmployee[]): string[] {
  const direct = employees.filter(e => e.managerId === empId).map(e => e.id)
  return [...direct, ...direct.flatMap(id => getAllSubordinates(id, employees))]
}

// ── Edit panel ────────────────────────────────────────────────────────────────
interface EditPanelProps {
  emp:       HREmployee
  employees: HREmployee[]
  onSave:    (patch: Partial<HREmployee>) => void
  onClose:   () => void
}

function EditPanel({ emp, employees, onSave, onClose }: EditPanelProps) {
  const [poste,          setPoste]          = useState(emp.poste)
  const [departement,    setDepartement]     = useState(emp.departement)
  const [employmentType, setEmploymentType]  = useState(emp.employmentType)
  const [managerId,      setManagerId]       = useState<string | null>(emp.managerId)
  const [customDept,     setCustomDept]      = useState(false)

  // Exclude self + all subordinates to prevent circular hierarchies
  const subs          = useMemo(() => getAllSubordinates(emp.id, employees), [emp.id, employees])
  const managerOptions = employees.filter(e => e.id !== emp.id && !subs.includes(e.id))

  const depts = useMemo(() => {
    const fromEmployees = Array.from(new Set(employees.map(e => e.departement)))
    return Array.from(new Set([...DEPTS_LIST, ...fromEmployees])).sort()
  }, [employees])

  const isDirty = poste !== emp.poste
    || departement !== emp.departement
    || employmentType !== emp.employmentType
    || managerId !== emp.managerId

  function handleSave() {
    onSave({ poste, departement, employmentType, managerId })
    onClose()
  }

  return (
    <div className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col h-full shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Modifier l'employé</h3>
        <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Identity (read-only) */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Employé</p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
              ${(DEPT_CSS[emp.departement] ?? DEPT_CSS_DEFAULT).avatar}`}>
              {emp.firstName[0]}{emp.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{emp.firstName} {emp.lastName}</p>
              <p className="text-xs text-gray-500">{emp.email}</p>
            </div>
          </div>
        </div>

        {/* Poste */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Poste / Titre</label>
          <input
            type="text"
            value={poste}
            onChange={e => setPoste(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600"
          />
        </div>

        {/* Département */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Département</label>
          {customDept ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={departement}
                onChange={e => setDepartement(e.target.value)}
                placeholder="Nom du département"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600"
              />
              <button onClick={() => setCustomDept(false)}
                className="text-xs text-gray-500 hover:text-gray-800 px-2">↩</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={depts.includes(departement) ? departement : ''}
                onChange={e => setDepartement(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600">
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={() => { setCustomDept(true); setDepartement('') }}
                className="text-xs text-gray-500 hover:text-gray-800 px-2 border border-gray-300 rounded-lg"
                title="Saisir un nouveau département">+</button>
            </div>
          )}
        </div>

        {/* Type de contrat */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type de contrat</label>
          <select
            value={employmentType}
            onChange={e => setEmploymentType(e.target.value as HREmployee['employmentType'])}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600">
            <option value="FULL_TIME">CDI — Temps plein</option>
            <option value="PART_TIME">Temps partiel</option>
            <option value="CONTRACT">CDD</option>
            <option value="INTERN">Stage</option>
          </select>
        </div>

        {/* Responsable (manager) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rapporte à</label>
          <select
            value={managerId ?? ''}
            onChange={e => setManagerId(e.target.value === '' ? null : e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600">
            <option value="">— Aucun (racine de l'arbre)</option>
            {managerOptions.map(e => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} — {e.poste}
              </option>
            ))}
          </select>
          {subs.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Ses {subs.length} subordonné{subs.length > 1 ? 's' : ''} sont exclus pour éviter les cycles.
            </p>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDirty
              ? 'bg-forest-900 text-white hover:bg-forest-800'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}>
          Enregistrer
        </button>
      </div>
    </div>
  )
}

// ── Employee card (HTML) ──────────────────────────────────────────────────────
interface CardProps {
  emp:      HREmployee
  editMode: boolean
  selected: boolean
  onClick:  () => void
}

function EmployeeCard({ emp, editMode, selected, onClick }: CardProps) {
  const initials  = `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase()
  const col       = DEPT_CSS[emp.departement] ?? DEPT_CSS_DEFAULT
  const typeColor = TYPE_BADGE[emp.employmentType] ?? 'bg-gray-100 text-gray-600'

  return (
    <div
      role={editMode ? 'button' : undefined}
      tabIndex={editMode ? 0 : undefined}
      onClick={editMode ? onClick : undefined}
      onKeyDown={editMode ? e => { if (e.key === 'Enter') onClick() } : undefined}
      className={`bg-white rounded-xl border-2 shadow-sm p-3 w-48 flex flex-col items-center gap-2 transition-all
        ${editMode ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'hover:shadow-md'}
        ${selected ? 'border-forest-500 ring-2 ring-forest-300 shadow-md' : col.card}
      `}>
      <div className="relative w-full flex justify-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${col.avatar}`}>
          {initials}
        </div>
        {editMode && (
          <span className="absolute right-0 top-0 bg-forest-100 text-forest-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">
            ✏
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-gray-800 leading-tight">{emp.firstName} {emp.lastName}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">{emp.poste}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${col.badge}`}>
        {emp.departement}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
        {TYPE_LABEL[emp.employmentType]}
      </span>
    </div>
  )
}

// ── Recursive org node ────────────────────────────────────────────────────────
interface OrgNodeProps {
  emp:        HREmployee
  employees:  HREmployee[]
  editMode:   boolean
  selectedId: string | null
  onSelect:   (id: string) => void
}

function OrgNode({ emp, employees, editMode, selectedId, onSelect }: OrgNodeProps) {
  const children = employees.filter(e => e.managerId === emp.id)

  return (
    <div className="flex flex-col items-center">
      <EmployeeCard
        emp={emp}
        editMode={editMode}
        selected={selectedId === emp.id}
        onClick={() => onSelect(emp.id)}
      />
      {children.length > 0 && (
        <>
          <div className="w-0.5 h-7 bg-gray-300" />
          <div className="relative flex gap-8">
            {children.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 bg-gray-300"
                style={{ width: 'calc(100% - 96px)' }} />
            )}
            {children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-0.5 h-7 bg-gray-300" />
                <OrgNode
                  emp={child}
                  employees={employees}
                  editMode={editMode}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function OrganigrammeHRPage() {
  const { employees, updateEmployee } = useHR()
  const [editMode,   setEditMode]   = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const roots = employees.filter(e => e.managerId === null)
  const depts = useMemo(() => Array.from(new Set(employees.map(e => e.departement))), [employees])
  const selectedEmp = selectedId ? (employees.find(e => e.id === selectedId) ?? null) : null

  function toggleEditMode() {
    setEditMode(v => !v)
    setSelectedId(null)
  }

  function handleSelect(id: string) {
    setSelectedId(prev => prev === id ? null : id)
  }

  function handleSave(patch: Partial<HREmployee>) {
    if (selectedId) updateEmployee(selectedId, patch)
    setSelectedId(null)
  }

  function handleDownloadSVG() {
    setDownloading(true)
    // Slight delay so the button state renders before heavy SVG generation
    setTimeout(() => {
      try {
        const svg = generateSVG(employees)
        if (svg) downloadSVG(svg)
      } finally {
        setDownloading(false)
      }
    }, 50)
  }

  function handlePrint() {
    const svg = generateSVG(employees)
    if (!svg) return
    const w = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Organigramme</title>
      <style>body{margin:0;display:flex;justify-content:center;padding:20px;background:#f8fafc}
      @media print{body{padding:0}}</style></head>
      <body>${svg}</body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organigramme</h1>
          <p className="text-sm text-gray-500 mt-0.5">{employees.length} collaborateurs</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit toggle */}
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              editMode
                ? 'bg-forest-900 text-white hover:bg-forest-800'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
            {editMode ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Terminer l'édition
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </>
            )}
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer
          </button>

          {/* Download SVG */}
          <button
            onClick={handleDownloadSVG}
            disabled={downloading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-wait">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? 'Génération…' : 'Télécharger SVG'}
          </button>
        </div>
      </div>

      {/* ── Dept legend ────────────────────────────────────────────────────── */}
      <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50 shrink-0">
        {depts.map(dept => {
          const col = DEPT_CSS[dept] ?? DEPT_CSS_DEFAULT
          const count = employees.filter(e => e.departement === dept).length
          return (
            <span key={dept}
              className={`text-xs px-3 py-1 rounded-full border font-medium ${col.badge}`}>
              {dept} ({count})
            </span>
          )
        })}
        {editMode && (
          <span className="text-xs px-3 py-1 rounded-full bg-forest-50 text-forest-700 border border-forest-200 font-medium">
            ✏ Mode édition — cliquez sur une carte pour la modifier
          </span>
        )}
      </div>

      {/* ── Content area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Org chart scroll area */}
        <div className="flex-1 overflow-auto p-8">
          {roots.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Aucun employé trouvé.</p>
            </div>
          ) : (
            <div className="inline-flex flex-col items-center gap-0 min-w-max">
              {roots.map(root => (
                <OrgNode
                  key={root.id}
                  emp={root}
                  employees={employees}
                  editMode={editMode}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Edit panel (right slide-in) */}
        {editMode && selectedEmp && (
          <EditPanel
            emp={selectedEmp}
            employees={employees}
            onSave={handleSave}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}
