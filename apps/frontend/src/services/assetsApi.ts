import { api } from '@/lib/api'

export type AssetCategory = 'INCORPOREL' | 'CORPOREL' | 'FINANCIER' | 'EN_COURS'
export type AssetStatus   = 'IN_SERVICE' | 'DISPOSED' | 'SCRAPPED' | 'IN_PROGRESS'
export type DeprecMode    = 'LINEAR' | 'DEGRESSIVE'

export interface Asset {
  id:               string
  companyId:        string
  designation:      string
  accountNumber:    string
  category:         AssetCategory
  status:           AssetStatus
  acquisitionDate:  string
  serviceDate?:     string
  disposalDate?:    string
  grossValue:       string
  residualValue:    string
  depreciationMode: DeprecMode
  usefulLifeYears:  number
  depreciationRate: string
  supplier?:        string
  serialNumber?:    string
  location?:        string
  notes?:           string
  depreciations:    AssetDepreciation[]
}

export interface AssetDepreciation {
  id:              string
  assetId:         string
  year:            number
  openingValue:    string
  depreciationAmt: string
  closingValue:    string
  entryGenerated:  boolean
}

export interface AssetSummary {
  grossTotal:  number
  cumulAmort:  number
  netValue:    number
  dotation:    number
  byCategory:  { category: string; brut: number; amort: number; net: number }[]
}

export interface DepreciationRow {
  id:             string
  designation:    string
  accountNumber:  string
  grossValue:     number
  openingAmort:   number
  dotation:       number
  closingAmort:   number
  closingValue:   number
  entryGenerated: boolean
}

export interface DepreciationTable {
  year:   number
  rows:   DepreciationRow[]
  totals: Omit<DepreciationRow, 'id' | 'designation' | 'accountNumber' | 'entryGenerated'>
}

export interface AssetScheduleRow {
  year:       number
  dotation:   number
  cumulAmort: number
  netValue:   number
}

export interface AssetSchedule {
  asset:    Pick<Asset, 'id' | 'designation' | 'accountNumber' | 'grossValue' | 'usefulLifeYears' | 'depreciationRate' | 'depreciationMode'>
  schedule: AssetScheduleRow[]
}

export interface AssetInput {
  designation:      string
  accountNumber:    string
  category:         AssetCategory
  acquisitionDate:  string
  serviceDate?:     string
  grossValue:       number
  residualValue?:   number
  depreciationMode: DeprecMode
  usefulLifeYears:  number
  supplier?:        string
  serialNumber?:    string
  location?:        string
  notes?:           string
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const assetsApi = {
  list: (params?: { category?: AssetCategory; status?: AssetStatus }) =>
    api.get<{ data: Asset[] }>('/accounting/assets', { params }).then(d),
  summary: (year: number) =>
    api.get<{ data: AssetSummary }>('/accounting/assets/summary', { params: { year } }).then(d),
  depreciationTable: (year: number) =>
    api.get<{ data: DepreciationTable }>('/accounting/assets/depreciation-table', { params: { year } }).then(d),
  generateEntries: (year: number) =>
    api.post('/accounting/assets/generate-entries', { year }),
  schedule: (id: string) =>
    api.get<{ data: AssetSchedule }>(`/accounting/assets/${id}/schedule`).then(d),
  create: (data: AssetInput) =>
    api.post<{ data: Asset }>('/accounting/assets', data).then(r => r.data.data),
  update: (id: string, data: Partial<AssetInput>) =>
    api.put<{ data: Asset }>(`/accounting/assets/${id}`, data).then(r => r.data.data),
  delete: (id: string) =>
    api.delete(`/accounting/assets/${id}`),
}
