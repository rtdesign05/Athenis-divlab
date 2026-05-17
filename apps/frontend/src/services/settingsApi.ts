import { api } from '@/lib/api'

export type PermissionLevel = 'none' | 'read' | 'write' | 'admin'

export interface RolePermissions {
  gestion:      PermissionLevel
  comptabilite: PermissionLevel
  rh:           PermissionLevel
  juridique:    PermissionLevel
  esg:          PermissionLevel
  settings:     PermissionLevel
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED'

export interface CompanySettings {
  id:               string
  name:             string
  logo:             string | null
  legalForm:        string | null
  siren:            string | null
  siret:            string | null
  naf:              string | null
  vatNumber:        string | null
  capital:          number | null
  address:          string | null
  postalCode:       string | null
  city:             string | null
  country:          string
  phone:            string | null
  contactEmail:     string | null
  website:          string | null
  primaryColor:     string | null
  secondaryColor:   string | null
  font:             string | null
  invoiceMentions:  string | null
  paymentTerms:     number | null
  lateInterestRate: number | null
  discountRate:     number | null
  plan:             string
  modules:          string[]
  locale:           string
  timezone:         string
  accountingZone:      string
  accountingPlan:      string
  accountNumberLength: number
}

export interface SettingsUser {
  id:              string
  email:           string
  /** Prénom de l'utilisateur (user.prenom dans la DB) */
  firstName:       string | null
  /** Nom de famille (user.nom dans la DB) */
  lastName:        string | null
  /** Rôle enum au niveau de la company (ADMIN, MANAGER, etc.) */
  globalRole:      string
  companyRoleId:   string | null
  companyRoleName: string | null
  status:          UserStatus
  /** Alias de twoFAEnabled */
  totpEnabled:     boolean
  lastLoginAt:     string | null
  invitedAt:       string | null
  isInvitation:    boolean
  /** IDs des agences auxquelles l'utilisateur est rattaché */
  agenceIds:       string[]
  /** true si la vue est restreinte aux agences sélectionnées */
  isRestricted:    boolean
}

export interface CompanyRole {
  id:          string
  name:        string
  description: string | null
  isSystem:    boolean
  permissions: RolePermissions
  userCount:   number
}

export interface PayrollConfig {
  /** Code du journal de paie (ex. PAY, SA) */
  journalCode:           string
  /** Compte de charges salariales (641 par défaut — SYSCOHADA) */
  chargeAccount:         string
  /** Compte des cotisations sociales globales (431) */
  socialAccount:         string
  /** Compte des impôts retenus globaux (447) */
  taxAccount:            string
  /** Compte de trésorerie utilisé pour les paiements (521) */
  treasuryAccount:       string
  /** Si true → split CNPS en sal/pat + IRPP/CAC en comptes séparés */
  splitContributions:    boolean
  /** Cotisations sociales — part salariale (ex. 4311) */
  socialAccountPersonal: string
  /** Cotisations sociales — part patronale (ex. 4312) */
  socialAccountEmployer: string
  /** IRPP — Impôt sur le revenu (ex. 4471) */
  taxAccountIrpp:        string
  /** CAC — Centimes additionnels communaux (ex. 4472) */
  taxAccountCac:         string
}

export interface SecurityPolicy {
  passwordMinLength:      number
  requireUppercase:       boolean
  requireNumbers:         boolean
  requireSpecial:         boolean
  passwordExpiryDays:     number
  require2faAll:          boolean
  require2faAdmin:        boolean
  sessionDurationMinutes: number
  autoLogoutMinutes:      number
  ipWhitelist:            string[]
  blockOutsideHours:      boolean
  maxLoginAttempts:       number
  lockoutDurationMinutes: number
}

export interface Agence {
  id:        string
  code:      string
  nom:       string
  adresse:   string | null
  ville:     string | null
  telephone: string | null
  email:     string | null
  isActive:  boolean
  isSiege:   boolean
  createdAt: string
  _count:    { members: number }
}

export interface CreateAgenceDto {
  code:      string
  nom:       string
  adresse?:  string
  ville?:    string
  telephone?: string
  email?:    string
  isSiege?:  boolean
}

export type InviteRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'HR' | 'SALES' | 'READONLY' | 'CUSTOM'

export interface InviteUserDto {
  prenom:       string
  nom:          string
  email:        string
  telephone?:   string
  role:         InviteRole
  permissions:  RolePermissions
  agenceIds:    string[]
  isRestricted: boolean
}

export interface AuditLogEntry {
  id:        string
  action:    string
  resource:  string | null
  ipAddress: string | null
  createdAt: string
  user:      { email: string; firstName: string | null; lastName: string | null } | null
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const settingsApi = {
  getCompany:       () =>
    api.get<{ data: CompanySettings }>('/settings/company').then(d),

  updateCompany:    (body: Partial<CompanySettings>) =>
    api.put<{ data: CompanySettings }>('/settings/company', body).then(d),

  listUsers:        () =>
    api.get<{ data: SettingsUser[] }>('/settings/users').then(d),

  inviteUser:       (body: InviteUserDto) =>
    api.post<{ data: unknown }>('/settings/users/invite', body).then(d),

  updateUserRole:   (id: string, roleId: string) =>
    api.put(`/settings/users/${id}/role`, { roleId }),

  updateUserAgences: (id: string, agenceIds: string[], isRestricted: boolean) =>
    api.put(`/settings/users/${id}/agences`, { agenceIds, isRestricted }),

  updateUserStatus: (id: string, status: string) =>
    api.put(`/settings/users/${id}/status`, { status }),

  deleteUser:       (id: string) =>
    api.delete(`/settings/users/${id}`),

  listRoles:        () =>
    api.get<{ data: CompanyRole[] }>('/settings/roles').then(d),

  createRole:       (body: { name: string; description?: string; permissions: RolePermissions }) =>
    api.post<{ data: CompanyRole }>('/settings/roles', body).then(d),

  updateRolePerms:  (id: string, body: { name?: string; description?: string; permissions?: RolePermissions }) =>
    api.put<{ data: CompanyRole }>(`/settings/roles/${id}`, body).then(d),

  deleteRole:       (id: string) =>
    api.delete(`/settings/roles/${id}`),

  getSecurity:      () =>
    api.get<{ data: SecurityPolicy }>('/settings/security').then(d),

  updateSecurity:   (body: SecurityPolicy) =>
    api.put<{ data: SecurityPolicy }>('/settings/security', body).then(d),

  getAuditLogs:     () =>
    api.get<{ data: AuditLogEntry[] }>('/settings/security/audit').then(d),

  getPayrollConfig:    () =>
    api.get<{ data: PayrollConfig }>('/settings/payroll-config').then(d),

  updatePayrollConfig: (body: Partial<PayrollConfig>) =>
    api.put<{ data: PayrollConfig }>('/settings/payroll-config', body).then(d),

  listAgences:   () =>
    api.get<{ data: Agence[] }>('/settings/agences').then(d),

  createAgence:  (body: CreateAgenceDto) =>
    api.post<{ data: Agence }>('/settings/agences', body).then(d),

  updateAgence:  (id: string, body: Partial<CreateAgenceDto> & { isActive?: boolean }) =>
    api.put<{ data: Agence }>(`/settings/agences/${id}`, body).then(d),

  deleteAgence:  (id: string) =>
    api.delete(`/settings/agences/${id}`),
}
