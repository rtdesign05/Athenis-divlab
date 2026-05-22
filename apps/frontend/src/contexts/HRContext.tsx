import { createContext, useContext, useEffect, useState } from 'react'
import { hrApi, type AnnualReview, type Employee, type LeaveRequest, type ReviewObjective } from '@/services/hrApi'

export interface HREmployee {
  id: string
  firstName: string
  lastName: string
  email: string
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
  poste: string
  departement: string
  startDate: string
  endDate: string | null
  grossSalary: number
  managerId: string | null
}

export interface HRLeave {
  id: string
  employeeId: string
  type: 'CP' | 'RTT' | 'SICK' | 'MATERNITY' | 'UNPAID'
  startDate: string
  endDate: string
  days: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  reason?: string
}

export interface HRObjective {
  id: string
  title: string
  target: string
  progress: number
  dueDate?: string
  done: boolean
}

export interface HRReview {
  id: string
  employeeId: string
  year: number
  status: 'DRAFT' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  scheduledAt?: string
  completedAt?: string
  rating?: number
  notes?: string
  objectives: HRObjective[]
}

interface HRContextValue {
  employees: HREmployee[]
  leaves: HRLeave[]
  reviews: HRReview[]
  loading: boolean
  refresh(): Promise<void>
  updateEmployee(id: string, patch: Partial<HREmployee>): Promise<void>
  addLeave(l: Omit<HRLeave, 'id'>): Promise<void>
  updateLeave(id: string, patch: Partial<HRLeave>): Promise<void>
  addReview(r: Omit<HRReview, 'id'>): Promise<void>
  updateReview(id: string, patch: Partial<HRReview>): Promise<void>
  deleteReview(id: string): Promise<void>
}

const HRContext = createContext<HRContextValue | null>(null)

export function useHR() {
  const ctx = useContext(HRContext)
  if (!ctx) throw new Error('useHR must be within HRProvider')
  return ctx
}

// ── Mapping API ↔ Context ─────────────────────────────────────────────────────

function mapEmployee(e: Employee): HREmployee {
  return {
    id:             e.id,
    firstName:      e.firstName,
    lastName:       e.lastName,
    email:          e.email,
    employmentType: e.employmentType,
    poste:          e.poste       ?? '',
    departement:    e.departement ?? '',
    startDate:      e.startDate.slice(0, 10),
    endDate:        e.endDate ? e.endDate.slice(0, 10) : null,
    grossSalary:    Number(e.grossSalary),
    managerId:      e.managerId ?? null,
  }
}

function mapLeave(l: LeaveRequest): HRLeave {
  const base: HRLeave = {
    id:         l.id,
    employeeId: l.employeeId,
    type:       l.type,
    startDate:  l.startDate.slice(0, 10),
    endDate:    l.endDate.slice(0, 10),
    days:       l.days,
    status:     l.status,
  }
  return l.reason ? { ...base, reason: l.reason } : base
}

function mapObjective(o: ReviewObjective): HRObjective {
  const base: HRObjective = {
    id:       o.id,
    title:    o.title,
    target:   o.target,
    progress: o.progress,
    done:     o.done,
  }
  return o.dueDate ? { ...base, dueDate: o.dueDate.slice(0, 10) } : base
}

function mapReview(r: AnnualReview): HRReview {
  const base: HRReview = {
    id:         r.id,
    employeeId: r.employeeId,
    year:       r.year,
    status:     r.status,
    objectives: r.objectives.map(mapObjective),
  }
  if (r.scheduledAt) (base as HRReview).scheduledAt = r.scheduledAt
  if (r.completedAt) (base as HRReview).completedAt = r.completedAt
  if (r.rating != null) (base as HRReview).rating = r.rating
  if (r.notes) (base as HRReview).notes = r.notes
  return base
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function HRProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<HREmployee[]>([])
  const [leaves,    setLeaves]    = useState<HRLeave[]>([])
  const [reviews,   setReviews]   = useState<HRReview[]>([])
  const [loading,   setLoading]   = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const [emps, lvs, revs] = await Promise.all([
        hrApi.list(),
        hrApi.leaves.list(),
        hrApi.reviews.list(),
      ])
      setEmployees(emps.map(mapEmployee))
      setLeaves(lvs.map(mapLeave))
      setReviews(revs.map(mapReview))
    } catch (e) {
      console.error('HRProvider refresh', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function updateEmployee(id: string, patch: Partial<HREmployee>) {
    try {
      const updated = await hrApi.update(id, {
        ...(patch.firstName      !== undefined ? { firstName:      patch.firstName }      : {}),
        ...(patch.lastName       !== undefined ? { lastName:       patch.lastName }       : {}),
        ...(patch.email          !== undefined ? { email:          patch.email }          : {}),
        ...(patch.employmentType !== undefined ? { employmentType: patch.employmentType } : {}),
        ...(patch.poste          !== undefined ? { poste:          patch.poste }          : {}),
        ...(patch.departement    !== undefined ? { departement:    patch.departement }    : {}),
        ...(patch.startDate      !== undefined ? { startDate:      patch.startDate }      : {}),
        ...(patch.grossSalary    !== undefined ? { grossSalary:    patch.grossSalary }    : {}),
        ...(patch.managerId      !== undefined ? { managerId:      patch.managerId }      : {}),
      })
      setEmployees(prev => prev.map(e => e.id === id ? mapEmployee(updated) : e))
    } catch (e) {
      console.error('updateEmployee', e)
    }
  }

  async function addLeave(l: Omit<HRLeave, 'id'>) {
    try {
      const created = await hrApi.leaves.create({
        employeeId: l.employeeId,
        type:       l.type,
        startDate:  l.startDate,
        endDate:    l.endDate,
        ...(l.reason ? { reason: l.reason } : {}),
      })
      setLeaves(prev => [...prev, mapLeave(created)])
    } catch (e) {
      console.error('addLeave', e)
    }
  }

  async function updateLeave(id: string, patch: Partial<HRLeave>) {
    // L'API ne permet que approve/reject/cancel ; on délègue selon le status visé
    try {
      let updated: LeaveRequest
      if (patch.status === 'APPROVED' || patch.status === 'REJECTED') {
        updated = await hrApi.leaves.review(id, { status: patch.status })
      } else if (patch.status === 'CANCELLED') {
        updated = await hrApi.leaves.cancel(id)
      } else {
        // Pas de mutation API supportée → garde l'ancien comportement local
        setLeaves(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
        return
      }
      setLeaves(prev => prev.map(l => l.id === id ? mapLeave(updated) : l))
    } catch (e) {
      console.error('updateLeave', e)
    }
  }

  async function addReview(r: Omit<HRReview, 'id'>) {
    try {
      const created = await hrApi.reviews.create({
        employeeId: r.employeeId,
        ...(r.scheduledAt ? { scheduledAt: r.scheduledAt } : {}),
        ...(r.notes       ? { notes:       r.notes }       : {}),
      })
      setReviews(prev => [...prev, mapReview(created)])
    } catch (e) {
      console.error('addReview', e)
    }
  }

  async function updateReview(id: string, patch: Partial<HRReview>) {
    try {
      const updated = await hrApi.reviews.update(id, {
        ...(patch.status      !== undefined ? { status:      patch.status }      : {}),
        ...(patch.scheduledAt !== undefined ? { scheduledAt: patch.scheduledAt ?? null } : {}),
        ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt ?? null } : {}),
        ...(patch.rating      !== undefined ? { rating:      patch.rating ?? null }      : {}),
        ...(patch.notes       !== undefined ? { notes:       patch.notes ?? null }       : {}),
        ...(patch.objectives  !== undefined ? {
              objectives: patch.objectives.map(o => ({
                id:       o.id,
                title:    o.title,
                target:   o.target,
                progress: o.progress,
                dueDate:  o.dueDate ?? null,
                done:     o.done,
              })),
            } : {}),
      })
      setReviews(prev => prev.map(r => r.id === id ? mapReview(updated) : r))
    } catch (e) {
      console.error('updateReview', e)
    }
  }

  async function deleteReview(id: string) {
    try {
      await hrApi.reviews.remove(id)
      setReviews(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      console.error('deleteReview', e)
    }
  }

  return (
    <HRContext.Provider value={{
      employees, leaves, reviews, loading,
      refresh, updateEmployee, addLeave, updateLeave, addReview, updateReview, deleteReview,
    }}>
      {children}
    </HRContext.Provider>
  )
}
