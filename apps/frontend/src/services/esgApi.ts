import { api } from '@/lib/api'

export interface EsgScore {
  scoreE: number | null
  scoreS: number | null
  scoreG: number | null
  scoreGlobal: number | null
  co2Emissions: string | null
  energyConsumption: string | null
  renewableEnergyRatio: string | null
  waterConsumption: string | null
  wasteRecyclingRate: string | null
  femaleLeadershipRatio: string | null
  employeeSatisfaction: string | null
  absenteeismRate: string | null
  trainingHoursPerEmployee: string | null
  workplaceAccidents: number | null
  boardIndependenceRatio: string | null
  auditCommitteeExists: boolean
  codeOfConductExists: boolean
  anticorruptionPolicyExists: boolean
  year: number
}

export interface EsgRisk {
  category: 'E' | 'S' | 'G'
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
}

export interface CsrdTopic {
  esrsCode: string
  topic: string
  category: 'E' | 'S' | 'G'
  material: boolean
  rationale: string
}

export interface UpdateEsgDto {
  co2Emissions?: number
  energyConsumption?: number
  renewableEnergyRatio?: number
  waterConsumption?: number
  wasteRecyclingRate?: number
  femaleLeadershipRatio?: number
  employeeSatisfaction?: number
  absenteeismRate?: number
  trainingHoursPerEmployee?: number
  workplaceAccidents?: number
  boardIndependenceRatio?: number
  auditCommitteeExists?: boolean
  codeOfConductExists?: boolean
  anticorruptionPolicyExists?: boolean
  year?: number
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const esgApi = {
  score:     (year?: number) => api.get<{ data: EsgScore }>('/esg/score', { params: year ? { year } : undefined }).then(d),
  risques:   ()              => api.get<{ data: EsgRisk[] }>('/esg/risques').then(d),
  materialite: ()            => api.get<{ data: CsrdTopic[] }>('/esg/materialite').then(d),
  rapport:   (year?: number) => api.get<{ data: unknown }>('/esg/rapport', { params: year ? { year } : undefined }).then(d),
  update:    (dto: UpdateEsgDto) => api.put<{ data: EsgScore }>('/esg/indicateurs', dto).then(d),
}
