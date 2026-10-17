import * as React from 'react'

import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? React.useId()

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full',
            'bg-surface-raised text-foreground',
            'border border-border rounded-[var(--radius-md)]',
            'px-3.5 py-2 text-sm',
            'placeholder:text-foreground-subtle',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error focus-visible:border-error focus-visible:ring-error/30',
            className
          )}
          ref={ref}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-foreground-subtle">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
