import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        default: 'bg-forest-50 text-forest-800 ring-forest-200',
        success: 'bg-green-50 text-green-800 ring-green-200',
        warning: 'bg-amber-50 text-amber-800 ring-amber-200',
        danger: 'bg-red-50 text-red-800 ring-red-200',
        info: 'bg-blue-50 text-blue-800 ring-blue-200',
        neutral: 'bg-gray-50 text-gray-700 ring-gray-200',
        purple: 'bg-purple-50 text-purple-800 ring-purple-200',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Maps invoice/expense/employee status to badge variant
export function statusVariant(
  status: string,
): VariantProps<typeof badgeVariants>['variant'] {
  const map: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    PAID: 'success',
    ACTIVE: 'success',
    DRAFT: 'neutral',
    SENT: 'info',
    OVERDUE: 'danger',
    CANCELLED: 'neutral',
    PENDING: 'warning',
  }
  return map[status] ?? 'neutral'
}
