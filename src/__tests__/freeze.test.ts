import { describe, it, expect } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import {
  BehaviorMonitor,
  computePose,
  tierOf,
  WARN_GRACE_MS,
  FREEZE_AFTER_MS,
} from '@/features/monitoring/behaviorMonitor'
import { BEHAVIOR_EVENT_TYPES } from '@/features/monitoring/types'

describe('freeze logic', () => {
  it('returns empty active state initially', () => {
    const m = new BehaviorMonitor()
    expect(m.activeState()).toEqual([])
  })
  it('has all behavior event types defined', () => {
    expect(BEHAVIOR_EVENT_TYPES.length).toBeGreaterThan(0)
    expect(BEHAVIOR_EVENT_TYPES).toContain('no_face')
    expect(BEHAVIOR_EVENT_TYPES).toContain('tab_switch')
  })
  it('acknowledge does not throw when nothing active', () => {
    const m = new BehaviorMonitor()
    expect(() => m.acknowledge()).not.toThrow()
  })
  it('starts with no warnings either', () => {
    const m = new BehaviorMonitor()
    expect(m.warningState()).toEqual([])
    expect(() => m.dismissWarnings()).not.toThrow()
  })
})

describe('staged escalation tiers', () => {
  it('grace period shows nothing before 3s', () => {
    expect(tierOf('looking_away', 0)).toBe('grace')
    expect(tierOf('looking_away', WARN_GRACE_MS - 1)).toBe('grace')
    expect(tierOf('no_face', 2999)).toBe('grace')
  })
  it('warn tier starts at exactly 3s', () => {
    expect(tierOf('looking_away', WARN_GRACE_MS)).toBe('warn')
    expect(tierOf('head_turn', 9999)).toBe('warn')
  })
  it('freeze tier starts at exactly 10s', () => {
    expect(tierOf('no_face', FREEZE_AFTER_MS)).toBe('freeze')
    expect(tierOf('multiple_faces', 60_000)).toBe('freeze')
  })
  it('tab switches freeze immediately (no grace while hidden)', () => {
    expect(tierOf('tab_switch', 0)).toBe('freeze')
    expect(tierOf('tab_switch', 1)).toBe('freeze')
  })
  it('negative elapsed means no episode', () => {
    expect(tierOf('looking_away', -1)).toBe('none')
  })
})

/* ── synthetic face geometry (MediaPipe 478-point indices) ───────── */

function makeFace(overrides: Record<number, Partial<NormalizedLandmark>> = {}): NormalizedLandmark[] {
  const lm: NormalizedLandmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  const base: Record<number, { x: number; y: number }> = {
    1: { x: 0.5, y: 0.5 }, // nose tip
    234: { x: 0.25, y: 0.45 }, // left face edge
    454: { x: 0.75, y: 0.45 }, // right face edge
    33: { x: 0.38, y: 0.4 }, // left eye outer corner
    133: { x: 0.46, y: 0.4 }, // left eye inner corner
    263: { x: 0.62, y: 0.4 }, // right eye outer corner
    362: { x: 0.54, y: 0.4 }, // right eye inner corner
    159: { x: 0.42, y: 0.39 }, // left upper lid
    145: { x: 0.42, y: 0.43 }, // left lower lid
    386: { x: 0.58, y: 0.39 }, // right upper lid
    374: { x: 0.58, y: 0.43 }, // right lower lid
    468: { x: 0.42, y: 0.41 }, // left iris centre
    473: { x: 0.58, y: 0.41 }, // right iris centre
    152: { x: 0.5, y: 0.6 }, // chin
  }
  for (const [idx, pt] of Object.entries(base)) lm[Number(idx)] = { ...pt, z: 0 }
  for (const [idx, pt] of Object.entries(overrides)) {
    lm[Number(idx)] = { ...lm[Number(idx)], ...pt }
  }
  return lm
}

describe('eye-focused pose detection', () => {
  it('neutral face looking at the camera is not flagged', () => {
    const pose = computePose(makeFace())
    expect(pose.headTurn).toBe(false)
    expect(pose.lookingAway).toBe(false)
    expect(pose.detail).toBe('')
  })

  it('flags eyes shifted hard to the side as looking away', () => {
    // Both irises pushed toward image-left (candidate's right).
    const pose = computePose(
      makeFace({ 468: { x: 0.38 }, 473: { x: 0.54 } })
    )
    expect(pose.lookingAway).toBe(true)
    expect(pose.headTurn).toBe(false)
    expect(pose.detail).toContain('Eyes off camera')
    expect(pose.detail).toContain('right')
  })

  it('flags eyes looking down even with a level head', () => {
    const pose = computePose(
      makeFace({ 468: { y: 0.43 }, 473: { y: 0.43 } })
    )
    expect(pose.lookingAway).toBe(true)
    expect(pose.detail).toContain('looking down')
  })

  it('flags eyes looking up even with a level head', () => {
    const pose = computePose(
      makeFace({ 468: { y: 0.39 }, 473: { y: 0.39 } })
    )
    expect(pose.lookingAway).toBe(true)
    expect(pose.detail).toContain('looking up')
  })

  it('small eye movements while reading are within tolerance', () => {
    // Iris a third of a half-eye-width off centre — normal screen reading.
    const pose = computePose(
      makeFace({ 468: { x: 0.405 }, 473: { x: 0.565 } })
    )
    expect(pose.lookingAway).toBe(false)
  })

  it('still detects a head turn from the nose position', () => {
    const pose = computePose(makeFace({ 1: { x: 0.65 } }))
    expect(pose.headTurn).toBe(true)
    expect(pose.detail).toContain('Head turned')
  })

  it('falls back to head pose when iris landmarks are missing', () => {
    const lm = makeFace().slice(0, 100) // no iris indices on older models
    const pose = computePose(lm)
    expect(pose.lookingAway).toBe(false)
    expect(pose.headTurn).toBe(false)
  })

  it('still detects looking down from the nose when gaze is neutral', () => {
    const pose = computePose(makeFace({ 1: { y: 0.62 } }))
    expect(pose.lookingAway).toBe(true)
    expect(pose.detail).toContain('Looking down')
  })
})
