import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { BehaviorMonitor, emptyFocusStats, type FocusStats } from './behaviorMonitor'
import { appendEvent, readEvents } from './eventLog'
import type { BehaviorEvent, BehaviorEventType } from './types'

interface UseBehaviorMonitorOptions {
  /** Monitoring runs only while the interview is actually on screen. */
  active: boolean
  videoRef: RefObject<HTMLVideoElement | null>
}

interface UseBehaviorMonitorResult {
  /** Freeze-tier flags — drive the full-screen pause overlay. */
  activeViolations: BehaviorEventType[]
  /** Warning-tier flags (after the 3s grace) — drive the gentle toast. */
  activeWarnings: BehaviorEventType[]
  /** Full session log (persisted to localStorage). */
  events: BehaviorEvent[]
  /** Continue / "I'm back" (freeze overlay). */
  acknowledge: () => void
  /** "Got it" on the toast — hides it until the condition clears. */
  dismissWarnings: () => void
  /** Cumulative flagged time — sent with the grade request for the meter. */
  getFocusStats: () => FocusStats
}

export function useBehaviorMonitor({
  active,
  videoRef,
}: UseBehaviorMonitorOptions): UseBehaviorMonitorResult {
  const [activeViolations, setActiveViolations] = useState<BehaviorEventType[]>([])
  const [activeWarnings, setActiveWarnings] = useState<BehaviorEventType[]>([])
  const [events, setEvents] = useState<BehaviorEvent[]>(() => readEvents())
  const monitorRef = useRef<BehaviorMonitor | null>(null)
  // Snapshot survives teardown so the grade request still sees the totals.
  const statsRef = useRef<FocusStats>(emptyFocusStats())

  useEffect(() => {
    if (!active) return
    const video = videoRef.current
    if (!video) return

    const monitor = new BehaviorMonitor()
    monitorRef.current = monitor

    const unsubState = monitor.onStateChange(setActiveViolations)
    const unsubWarnings = monitor.onWarningChange(setActiveWarnings)
    const unsubEvents = monitor.onEvent((event) => {
      setEvents((prev) => appendEvent(prev, event))
    })

    void monitor.start(video)

    return () => {
      unsubState()
      unsubWarnings()
      unsubEvents()
      statsRef.current = monitor.getStats()
      monitor.stop()
      if (monitorRef.current === monitor) monitorRef.current = null
      setActiveViolations([])
      setActiveWarnings([])
    }
    // videoRef is stable; monitoring is toggled by `active`.
  }, [active, videoRef])

  const acknowledge = useCallback(() => {
    monitorRef.current?.acknowledge()
  }, [])

  const dismissWarnings = useCallback(() => {
    monitorRef.current?.dismissWarnings()
  }, [])

  const getFocusStats = useCallback((): FocusStats => {
    return monitorRef.current?.getStats() ?? statsRef.current
  }, [])

  return {
    activeViolations,
    activeWarnings,
    events,
    acknowledge,
    dismissWarnings,
    getFocusStats,
  }
}
