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

const INIT_EMPLOYEES: HREmployee[] = [
  { id: 'hr-1', firstName: 'Hervé', lastName: 'Ekambi', email: 'h.ekambi@nexoria.cm', employmentType: 'FULL_TIME', poste: 'Directeur Général', departement: 'Direction', startDate: '2019-01-15', endDate: null, grossSalary: 2500000, managerId: null },
  { id: 'hr-2', firstName: 'Sandrine', lastName: 'Biya', email: 's.biya@nexoria.cm', employmentType: 'FULL_TIME', poste: 'Directrice Commerciale', departement: 'Commercial', startDate: '2022-03-01', endDate: null, grossSalary: 1200000, managerId: 'hr-1' },
  { id: 'hr-3', firstName: 'Jean-Paul', lastName: 'Nguele', email: 'jp.nguele@nexoria.cm', employmentType: 'FULL_TIME', poste: 'Directeur Administratif et Financier', departement: 'Finance', startDate: '2020-06-15', endDate: null, grossSalary: 1350000, managerId: 'hr-1' },
  { id: 'hr-4', firstName: 'Marie', lastName: 'Fotso', email: 'm.fotso@nexoria.cm', employmentType: 'FULL_TIME', poste: 'Assistante Commerciale', departement: 'Commercial', startDate: '2023-01-10', endDate: null, grossSalary: 450000, managerId: 'hr-2' },
  { id: 'hr-5', firstName: 'Alain', lastName: 'Mbock', email: 'a.mbock@nexoria.cm', employmentType: 'CONTRACT', poste: 'Développeur Web', departement: 'Informatique', startDate: '2024-01-01', endDate: '2026-12-31', grossSalary: 680000, managerId: 'hr-1' },
  { id: 'hr-6', firstName: 'Carine', lastName: 'Talla', email: 'c.talla@nexoria.cm', employmentType: 'INTERN', poste: 'Stagiaire RH', departement: 'Administration', startDate: '2026-01-15', endDate: '2026-07-15', grossSalary: 120000, managerId: 'hr-3' },
  { id: 'hr-7', firstName: 'Patrick', lastName: 'Ndinga', email: 'p.ndinga@nexoria.cm', employmentType: 'FULL_TIME', poste: 'Comptable Senior', departement: 'Finance', startDate: '2021-09-01', endDate: null, grossSalary: 780000, managerId: 'hr-3' },
  { id: 'hr-8', firstName: 'Adèle', lastName: 'Kamga', email: 'a.kamga@nexoria.cm', employmentType: 'PART_TIME', poste: 'Assistante Administrative', departement: 'Administration', startDate: '2023-06-01', endDate: null, grossSalary: 300000, managerId: 'hr-3' },
]

const INIT_LEAVES: HRLeave[] = [
  { id: 'lv-1', employeeId: 'hr-2', type: 'CP', startDate: '2026-05-12', endDate: '2026-05-16', days: 5, status: 'PENDING', reason: 'Vacances familiales' },
  { id: 'lv-2', employeeId: 'hr-7', type: 'SICK', startDate: '2026-04-28', endDate: '2026-04-30', days: 3, status: 'APPROVED', reason: 'Grippe' },
  { id: 'lv-3', employeeId: 'hr-1', type: 'CP', startDate: '2026-06-02', endDate: '2026-06-13', days: 10, status: 'APPROVED', reason: 'Congé annuel' },
  { id: 'lv-4', employeeId: 'hr-8', type: 'MATERNITY', startDate: '2026-03-01', endDate: '2026-05-31', days: 63, status: 'APPROVED', reason: 'Congé maternité' },
  { id: 'lv-5', employeeId: 'hr-5', type: 'UNPAID', startDate: '2026-04-07', endDate: '2026-04-11', days: 5, status: 'REJECTED', reason: 'Raisons personnelles' },
  { id: 'lv-6', employeeId: 'hr-4', type: 'CP', startDate: '2026-05-19', endDate: '2026-05-23', days: 5, status: 'PENDING', reason: 'Mariage' },
  { id: 'lv-7', employeeId: 'hr-3', type: 'RTT', startDate: '2026-03-17', endDate: '2026-03-21', days: 5, status: 'APPROVED' },
  { id: 'lv-8', employeeId: 'hr-6', type: 'SICK', startDate: '2026-02-10', endDate: '2026-02-12', days: 3, status: 'CANCELLED' },
]

const INIT_REVIEWS: HRReview[] = [
  {
    id: 'rv-1', employeeId: 'hr-2', year: 2025, status: 'COMPLETED', scheduledAt: '2026-01-10', completedAt: '2026-01-10', rating: 4,
    notes: 'Excellentes performances commerciales. CA dépassé de 22%.',
    objectives: [
      { id: 'obj-1', title: 'Augmenter le CA', target: '+20% vs 2024', progress: 100, done: true },
      { id: 'obj-2', title: 'Fidélisation clients', target: 'Taux rétention 85%', progress: 90, done: false },
    ],
  },
  {
    id: 'rv-2', employeeId: 'hr-7', year: 2025, status: 'COMPLETED', scheduledAt: '2026-01-15', completedAt: '2026-01-15', rating: 5,
    notes: 'Excellente maîtrise SYSCOHADA. Clôture dans les délais.',
    objectives: [
      { id: 'obj-3', title: 'Clôture annuelle', target: 'Avant 28/02', progress: 100, done: true },
    ],
  },
  {
    id: 'rv-3', employeeId: 'hr-5', year: 2025, status: 'SCHEDULED', scheduledAt: '2026-05-20',
    objectives: [
      { id: 'obj-4', title: 'Livraison module ERP stock', target: 'Q2 2026', progress: 65, done: false },
    ],
  },
  { id: 'rv-4', employeeId: 'hr-1', year: 2025, status: 'DRAFT', objectives: [] },
]

export function HRProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<HREmployee[]>(INIT_EMPLOYEES)
  const [leaves,    setLeaves]    = useState<HRLeave[]>(INIT_LEAVES)
  const [reviews,   setReviews]   = useState<HRReview[]>(INIT_REVIEWS)

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
