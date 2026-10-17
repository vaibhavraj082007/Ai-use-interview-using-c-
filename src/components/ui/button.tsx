import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium whitespace-nowrap select-none',
    'transition-all duration-200',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
    'cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-accent text-accent-foreground',
          'hover:bg-accent-hover',
          'shadow-sm',
        ].join(' '),
        secondary: [
          'bg-surface-raised text-foreground',
          'border border-border',
          'hover:bg-accent-light hover:border-accent/30 hover:text-accent',
        ].join(' '),
        ghost: [
          'text-foreground-muted',
          'hover:bg-accent-light hover:text-accent',
        ].join(' '),
        danger: [
          'bg-error text-white',
          'hover:bg-red-700',
          'shadow-sm',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
        md: 'h-10 px-5 text-sm rounded-[var(--radius-md)]',
        lg: 'h-12 px-7 text-base rounded-[var(--radius-md)]',
        icon: 'h-10 w-10 rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
