import { api } from '@/lib/api'

export type EsgPilier          = 'E' | 'S' | 'G'
export type EsgActionStatus    = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type EsgActionPriority  = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface EsgScores {
  environnement: number
  social:        number
  gouvernance:   number
  global:        number
}

export interface EsgCo2 {
  scope1: number
  scope2: number
  scope3: number
  total:  number
}

export interface EsgIndicators {
  energyKwh:          number | null
  wasteKg:            number | null
  renewableRatio:     number | null
  genderPayGap:       number | null
  trainingHours:      number | null
  absenteeismRate:    number | null
  workplaceAccidents: number | null
  boardFemaleRatio:   number | null
  hasEthicsCode:      boolean
  hasAnticorruption:  boolean
}

export interface EsgScoreResult {
  year:        number
  scores:      EsgScores
  co2:         EsgCo2
  indicators:  EsgIndicators
}

export interface BenchmarkIndicator {
  label:       string
  company:     number
  bench:       number
  unit:        string
  lowerBetter: boolean
}

export interface BenchmarkResult {
  year:        number
  company:     EsgScores
  sector:      EsgScores
  indicators:  BenchmarkIndicator[]
}

export interface MaterialiteItem {
  esrs:     string
  topic:    string
  pilier:   string
  materiel: boolean
  valeur:   string
  details:  string
}

export interface CsrdReport {
  year:           number
  generatedAt:    string
  scores:         EsgScores
  co2:            EsgCo2
  materialite:    MaterialiteItem[]
  recommandations: { priorite: string; pilier: string; action: string }[]
  conformiteCSRD: boolean
}

export interface EsgAction {
  id:          string
  title:       string
  description: string | null
  pilier:      EsgPilier
  priority:    EsgActionPriority
  status:      EsgActionStatus
  targetYear:  number
  deadline:    string | null
  owner:       string | null
  kpiTarget:   string | null
  kpiCurrent:  string | null
  co2Saving:   string | null
  createdAt:   string
}

export interface ActionStats {
  total:      number
  todo:       number
  inProgress: number
  done:       number
  co2Saving:  number
}

export interface UpsertEsgDto {
  year:              number
  scope1Details?:    { naturalGas?: number; fuelOil?: number; vehicles?: number; process?: number }
  scope2Kwh?:        number
  scope3Details?:    { businessTravel?: number; freight?: number; waste?: number; purchasedGoods?: number }
  energyKwh?:        number
  wasteKg?:          number
  renewableRatio?:   number
  genderPayGap?:     number
  trainingHours?:    number
  absenteeismRate?:  number
  workplaceAccidents?: number
  boardFemaleRatio?: number
  hasEthicsCode?:    boolean
  hasAnticorruption?: boolean
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const esgApi = {
  years:     ()           => api.get<{ data: number[] }>('/esg/years').then(d),
  score:     (year: number) => api.get<{ data: EsgScoreResult | null }>('/esg/score', { params: { year } }).then(d),
  benchmark: (year: number) => api.get<{ data: BenchmarkResult | null }>('/esg/benchmark', { params: { year } }).then(d),
  csrd:      (year: number) => api.get<{ data: CsrdReport | null }>('/esg/csrd-report', { params: { year } }).then(d),
  upsert:    (dto: UpsertEsgDto) => api.put<{ data: unknown }>('/esg/data', dto).then(d),

  actions: {
    stats:  ()                => api.get<{ data: ActionStats }>('/esg/actions/stats').then(d),
    list:   (year?: number)   => api.get<{ data: EsgAction[] }>('/esg/actions', { params: year ? { year } : {} }).then(d),
    create: (dto: Omit<EsgAction, 'id' | 'createdAt' | 'kpiCurrent' | 'co2Saving'> & { co2Saving?: number }) =>
              api.post<{ data: EsgAction }>('/esg/actions', dto).then(d),
    update: (id: string, dto: Partial<Pick<EsgAction, 'title'|'description'|'status'|'priority'|'owner'|'kpiTarget'|'kpiCurrent'>> & { deadline?: string; co2Saving?: number }) =>
              api.patch<{ data: EsgAction }>(`/esg/actions/${id}`, dto).then(d),
    remove: (id: string) => api.delete(`/esg/actions/${id}`),
  },
}
