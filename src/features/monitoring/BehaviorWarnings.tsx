import { Bell, Check, EyeOff, MoveHorizontal, UserX, Users, AppWindow } from 'lucide-react'
import { BEHAVIOR_EVENT_META, type BehaviorEventType } from './types'

const EVENT_ICONS: Record<BehaviorEventType, React.ReactNode> = {
  no_face: <UserX className="h-4 w-4" />,
  multiple_faces: <Users className="h-4 w-4" />,
  head_turn: <MoveHorizontal className="h-4 w-4" />,
  looking_away: <EyeOff className="h-4 w-4" />,
  tab_switch: <AppWindow className="h-4 w-4" />,
}

/** Headline that matches what the camera is actually seeing. */
function headline(active: BehaviorEventType[]): string {
  if (active.includes('no_face')) return "We can't see you — sit in front of the camera"
  if (active.includes('multiple_faces')) return 'Only you should be visible in the camera'
  return 'Please look at the camera'
}

interface BehaviorWarningsProps {
  active: BehaviorEventType[]
  onDismiss: () => void
}

/**
 * Gentle, non-blocking notification shown while a proctoring condition is
 * past the 3-second grace period but has not escalated to a freeze.
 * The interview keeps running — timers, mic and question all stay live.
 * "Got it" hides the toast until the condition clears; if the behaviour
 * continues for 10s total, the full-screen pause takes over.
 */
export default function BehaviorWarnings({ active, onDismiss }: BehaviorWarningsProps) {
  if (active.length === 0) return null

  return (
    <div
      data-proctor-toast
      role="status"
      aria-live="polite"
      aria-label="Proctoring reminder"
      className="fixed bottom-4 right-4 z-[200] w-[min(21rem,calc(100vw-2rem))]
                 rounded-[var(--radius-lg)] border border-warning/40 bg-surface shadow-xl
                 overflow-hidden animate-scale-in"
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Bell className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{headline(active)}</p>
          <p className="text-xs text-foreground-muted mt-1">
            Your interview is still running — just a quick check-in.
          </p>
          <ul className="mt-2 space-y-1">
            {active.map((type) => (
              <li key={type} className="flex items-center gap-2 text-xs text-foreground-muted">
                <span className="text-warning">{EVENT_ICONS[type]}</span>
                {BEHAVIOR_EVENT_META[type].label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 flex items-center justify-between gap-3">
        <p className="text-[10px] text-foreground-subtle leading-tight">
          Flags are logged for your session record only.
        </p>
        <button
          type="button"
          id="proctor-toast-dismiss"
          onClick={onDismiss}
          className="shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-md)]
                     border border-border text-xs font-medium text-foreground
                     hover:bg-accent-light/50 transition-colors cursor-pointer"
        >
          <Check className="h-3.5 w-3.5" /> Got it
        </button>
      </div>
    </div>
  )
}
