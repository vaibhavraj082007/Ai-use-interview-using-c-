import type { BehaviorEvent } from './types'

const KEY = 'interviewly_proctor_events'
const MAX = 200

export function readEvents(): BehaviorEvent[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as BehaviorEvent[]
  } catch {
    return []
  }
}

export function appendEvent(list: BehaviorEvent[], event: BehaviorEvent): BehaviorEvent[] {
  const next = [...list, event].slice(-MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — keep the in-memory copy
  }
  return next
}
