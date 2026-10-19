import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'default' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastRecord extends ToastOptions {
  id: string
  open: boolean
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const EXIT_MS = 200

const VARIANT_META: Record<
  ToastVariant,
  { icon: React.ReactNode; iconClass: string; borderClass: string }
> = {
  default: {
    icon: <Info className="h-4 w-4" />,
    iconClass: 'bg-accent-light text-accent',
    borderClass: 'border-border',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    iconClass: 'bg-success-soft text-success',
    borderClass: 'border-success/30',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    iconClass: 'bg-warning-soft text-warning',
    borderClass: 'border-warning/30',
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    iconClass: 'bg-error-soft text-error',
    borderClass: 'border-error/30',
  },
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      const timer = timers.current.get(id)
      if (timer) {
        clearTimeout(timer)
        timers.current.delete(id)
      }
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, open: false } : t))
      )
      setTimeout(() => remove(id), EXIT_MS)
    },
    [remove]
  )

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = createId()
      const duration = options.duration ?? 4000
      setToasts((prev) => [
        ...prev,
        { id, open: true, variant: 'default', ...options },
      ])
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration)
        timers.current.set(id, timer)
      }
      return id
    },
    [dismiss]
  )

  useEffect(() => {
    const store = timers.current
    return () => {
      store.forEach((timer) => clearTimeout(timer))
      store.clear()
    }
  }, [])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const meta = VARIANT_META[t.variant ?? 'default']
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={cn(
                'pointer-events-auto flex items-start gap-3',
                'rounded-[var(--radius-md)] border bg-surface-raised p-4 shadow-lg',
                meta.borderClass,
                t.open ? 'animate-toast-in' : 'animate-toast-out'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  meta.iconClass
                )}
              >
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                {t.title && (
                  <p className="text-sm font-medium text-foreground">
                    {t.title}
                  </p>
                )}
                {t.description && (
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-[var(--radius-sm)] p-1 text-foreground-subtle transition-colors hover:text-foreground cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
