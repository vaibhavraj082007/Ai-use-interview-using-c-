import {
  AppWindow,
  EyeOff,
  MoveHorizontal,
  ShieldAlert,
  UserX,
  Users,
} from 'lucide-react'
import { BEHAVIOR_EVENT_META, type BehaviorEventType } from './types'

const EVENT_ICONS: Record<BehaviorEventType, React.ReactNode> = {
  no_face: <UserX className="h-4 w-4" />,
  multiple_faces: <Users className="h-4 w-4" />,
  head_turn: <MoveHorizontal className="h-4 w-4" />,
  looking_away: <EyeOff className="h-4 w-4" />,
  tab_switch: <AppWindow className="h-4 w-4" />,
}

interface BehaviorOverlayProps {
  active: BehaviorEventType[]
  onAcknowledge: () => void
}

/**
 * Full-screen freeze shown while a proctoring flag is unresolved.
 *
 * The interview is paused (the shell is `inert`, timers stop) until the
 * candidate faces the camera again — the overlay lifts automatically as soon
 * as the monitor clears the flag — or presses Continue to acknowledge a
 * false positive. Flags are logged and feed the report's confidence meter;
 * they never fail or score the candidate.
 */
export default function BehaviorOverlay({
  active,
  onAcknowledge,
}: BehaviorOverlayProps) {
  if (active.length === 0) return null

  return (
    <div
      data-proctor-freeze
      role="alertdialog"
      aria-modal="true"
      aria-label="Interview paused"
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-fade-in"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl overflow-hidden animate-scale-in">
        <div className="bg-warning-soft px-5 py-4 flex items-start gap-3 border-b border-warning/30">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Interview paused
            </p>
            <p className="text-xs text-foreground-muted mt-0.5">
              Please look at the camera to continue.
            </p>
          </div>
        </div>

        <ul className="px-5 py-4 space-y-3">
          {active.map((type) => (
            <li key={type} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                {EVENT_ICONS[type]}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {BEHAVIOR_EVENT_META[type].label}
                </p>
                <p className="text-[11px] text-foreground-muted">
                  {BEHAVIOR_EVENT_META[type].description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="px-5 pb-4 space-y-3">
          <button
            type="button"
            id="proctor-continue"
            onClick={onAcknowledge}
            className="w-full h-9 rounded-[var(--radius-md)] bg-foreground text-background text-sm font-medium
                       hover:opacity-90 transition-opacity cursor-pointer"
          >
            Continue
          </button>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">
            This is logged as a flag in your session record only — it does not
            fail or score your interview.
          </p>
        </div>
      </div>
    </div>
  )
}
