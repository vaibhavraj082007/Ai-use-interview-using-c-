/**
 * Behaviour monitoring (proctoring) types.
 *
 * Every event here is a FLAG only — it is logged and surfaced to the candidate
 * as a warning, but it never auto-fails or scores the candidate.
 */

export type BehaviorEventType =
  | 'no_face'
  | 'multiple_faces'
  | 'head_turn'
  | 'looking_away'
  | 'tab_switch'

export const BEHAVIOR_EVENT_TYPES: BehaviorEventType[] = [
  'no_face',
  'multiple_faces',
  'head_turn',
  'looking_away',
  'tab_switch',
]

export interface BehaviorEvent {
  id: string
  type: BehaviorEventType
  detail: string
  /** Epoch milliseconds when the onset was detected. */
  at: number
}

export interface BehaviorEventMeta {
  label: string
  description: string
}

export const BEHAVIOR_EVENT_META: Record<BehaviorEventType, BehaviorEventMeta> = {
  no_face: {
    label: 'No face detected',
    description: 'No one was visible in the camera.',
  },
  multiple_faces: {
    label: 'Multiple faces',
    description: 'More than one person appeared in the camera.',
  },
  head_turn: {
    label: 'Head turned',
    description: 'Your head was turned away from the screen.',
  },
  looking_away: {
    label: 'Looking away',
    description: 'You appeared to look away from the screen.',
  },
  tab_switch: {
    label: 'Tab switch',
    description: 'You left the interview tab.',
  },
}
