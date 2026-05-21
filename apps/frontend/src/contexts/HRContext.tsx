import { createContext, useContext, useState } from 'react'

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
  updateEmployee(id: string, patch: Partial<HREmployee>): void
  addLeave(l: Omit<HRLeave, 'id'>): void
  updateLeave(id: string, patch: Partial<HRLeave>): void
  addReview(r: Omit<HRReview, 'id'>): void
  updateReview(id: string, patch: Partial<HRReview>): void
  deleteReview(id: string): void
}

const HRContext = createContext<HRContextValue | null>(null)

export function useHR() {
  const ctx = useContext(HRContext)
  if (!ctx) throw new Error('useHR must be within HRProvider')
  return ctx
}

export function HRProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<HREmployee[]>([])
  const [leaves,    setLeaves]    = useState<HRLeave[]>([])
  const [reviews,   setReviews]   = useState<HRReview[]>([])

  function updateEmployee(id: string, patch: Partial<HREmployee>) {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }
  function addLeave(l: Omit<HRLeave, 'id'>) {
    setLeaves(prev => [...prev, { ...l, id: `lv-${Date.now()}` }])
  }
  function updateLeave(id: string, patch: Partial<HRLeave>) {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }
  function addReview(r: Omit<HRReview, 'id'>) {
    setReviews(prev => [...prev, { ...r, id: `rv-${Date.now()}` }])
  }
  function updateReview(id: string, patch: Partial<HRReview>) {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  function deleteReview(id: string) {
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  return (
    <HRContext.Provider value={{ employees, leaves, reviews, updateEmployee, addLeave, updateLeave, addReview, updateReview, deleteReview }}>
      {children}
    </HRContext.Provider>
  )
}
