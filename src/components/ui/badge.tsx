import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center',
    'font-medium whitespace-nowrap select-none',
    'transition-colors duration-150',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-accent-light text-accent',
        success: 'bg-emerald-50 text-success',
        warning: 'bg-amber-50 text-warning',
        error: 'bg-red-50 text-error',
        outline: 'border border-border text-foreground-muted',
      },
      size: {
        sm: 'h-5 px-2 text-[11px] rounded-[var(--radius-sm)]',
        md: 'h-6 px-2.5 text-xs rounded-[var(--radius-sm)]',
        lg: 'h-7 px-3 text-sm rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
