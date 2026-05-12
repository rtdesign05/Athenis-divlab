import { z } from 'zod'

const emailSchema = z.string().email().toLowerCase().trim()

const passwordSchema = z
  .string()
  .min(8, 'Au moins 8 caractères')
  .max(128, 'Trop long')
  .regex(/[A-Z]/, 'Doit contenir une majuscule')
  .regex(/[0-9]/, 'Doit contenir un chiffre')

const baseFields = {
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
}

export const RegisterPersonalDto = z.object({
  ...baseFields,
  accountType: z.literal('PERSONAL'),
  country: z.string().length(2).regex(/^[A-Za-z]{2}$/).default('FR').transform((v) => v.toUpperCase()),
})

export const RegisterCompanyDto = z.object({
  ...baseFields,
  accountType: z.literal('COMPANY'),
  companyName: z.string().min(2).max(100).trim(),
  siren: z.string().length(9).regex(/^\d{9}$/).optional(),
  niu: z.string().min(1).max(30).trim().optional(),
  secteur: z.string().max(100).trim().optional(),
  taille: z.enum(['TPE', 'PME', 'ETI', 'GE']).default('PME'),
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'PREMIUM']).default('FREE'),
  country: z.string().length(2).regex(/^[A-Za-z]{2}$/).default('FR').transform((v) => v.toUpperCase()),
})

export const RegisterCabinetDto = z.object({
  ...baseFields,
  accountType: z.literal('CABINET'),
  cabinetName: z.string().min(2).max(100).trim(),
  siret: z.string().length(14).regex(/^\d{14}$/).optional(),
  niu: z.string().min(1).max(30).trim().optional(),
  country: z.string().length(2).regex(/^[A-Za-z]{2}$/).default('FR').transform((v) => v.toUpperCase()),
})

export const RegisterDto = z.discriminatedUnion('accountType', [
  RegisterPersonalDto,
  RegisterCompanyDto,
  RegisterCabinetDto,
])

export const LoginDto = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

export const TotpVerifyDto = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
})

export const TotpEnableDto = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
})

export const TotpDisableDto = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
  password: z.string().min(1),
})

export const ChangePasswordDto = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'Le nouveau mot de passe doit être différent',
    path: ['newPassword'],
  })

export type RegisterDto = z.infer<typeof RegisterDto>
export type RegisterPersonalDto = z.infer<typeof RegisterPersonalDto>
export type RegisterCompanyDto = z.infer<typeof RegisterCompanyDto>
export type RegisterCabinetDto = z.infer<typeof RegisterCabinetDto>
export type LoginDto = z.infer<typeof LoginDto>
export type TotpVerifyDto = z.infer<typeof TotpVerifyDto>
export type TotpEnableDto = z.infer<typeof TotpEnableDto>
export type TotpDisableDto = z.infer<typeof TotpDisableDto>
export type ChangePasswordDto = z.infer<typeof ChangePasswordDto>
