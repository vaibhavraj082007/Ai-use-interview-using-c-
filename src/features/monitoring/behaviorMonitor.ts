import type { FaceLandmarker, FaceLandmarkerOptions, NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { BehaviorEvent, BehaviorEventType } from './types'
import { BEHAVIOR_EVENT_TYPES } from './types'

// MediaPipe runtime (pinned to the installed package version) + face landmarker model.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

const DETECT_INTERVAL_MS = 400

/**
 * Staged escalation — a flag never interrupts the interview instantly.
 *
 * 1. 0–3s   grace: nothing shown, nothing logged, nothing counted.
 * 2. ≥3s    warning: a gentle non-blocking notification appears.
 * 3. ≥10s   freeze: the full-screen pause overlay (still dismissible).
 *
 * Tab switches keep the original immediate behaviour (the page isn't
 * visible while hidden anyway; the flag clears on return).
 */
export const WARN_GRACE_MS = 3000
export const FREEZE_AFTER_MS = 10000

function graceMs(type: BehaviorEventType): number {
  return type === 'tab_switch' ? 0 : WARN_GRACE_MS
}

function freezeMs(type: BehaviorEventType): number {
  return type === 'tab_switch' ? 0 : FREEZE_AFTER_MS
}

export type EpisodeTier = 'none' | 'grace' | 'warn' | 'freeze'

/** Where an episode sits given how long the condition has been continuous. */
export function tierOf(type: BehaviorEventType, elapsedMs: number): EpisodeTier {
  if (elapsedMs < 0) return 'none'
  if (elapsedMs >= freezeMs(type)) return 'freeze'
  if (elapsedMs >= graceMs(type)) return 'warn'
  return 'grace'
}

// MediaPipe FaceLandmarker (478-point) landmark indices.
const IDX = {
  noseTip: 1,
  leftFace: 234,
  rightFace: 454,
  eyeLeft: 33,
  eyeRight: 263,
  chin: 152,
  // Eye contours + iris centres — gaze is read from the eyes directly.
  eyeLeftInner: 133,
  eyeRightInner: 362,
  eyeLeftUpper: 159,
  eyeLeftLower: 145,
  eyeRightUpper: 386,
  eyeRightLower: 374,
  irisLeft: 468,
  irisRight: 473,
} as const

// --- Tunable thresholds -----------------------------------------------------
/** |yaw| (fraction of half face-width) at/above which the head counts as turned. */
const YAW_THRESHOLD = 0.4
/** Nose position within the eye→chin span, outside which the candidate looks away. */
const PITCH_LOW = 0.3
const PITCH_HIGH = 0.72
/** Iris offset from eye centre, in half-eye-width units — eyes off camera. */
const GAZE_X = 0.55
/** Iris offset from lid centre, in half-lid-height units — looking up/down. */
const GAZE_Y = 0.6
/**
 * Consecutive positive detections required before an episode starts.
 * Kept at 1 for face flags — the 3s grace period IS the debounce now, so a
 * notification lands ~3s after the behaviour starts instead of later.
 */
const MIN_STREAK: Record<BehaviorEventType, number> = {
  no_face: 1,
  multiple_faces: 1,
  head_turn: 1,
  looking_away: 1,
  tab_switch: 1,
}

interface Episode {
  /** Condition is currently present. */
  raw: boolean
  /** Candidate dismissed the freeze overlay (suppressed until condition clears). */
  acked: boolean
  /** Candidate dismissed the warning toast (suppressed until condition clears). */
  warnAcked: boolean
  /** Epoch ms when the condition became continuous (0 = no episode). */
  since: number
  /** Detail text captured at onset, used when the episode is logged. */
  detail: string
  /** Last tier emitted — transitions fire the log + state listeners. */
  tier: EpisodeTier
}

function newEpisodes(): Record<BehaviorEventType, Episode> {
  const out = {} as Record<BehaviorEventType, Episode>
  for (const type of BEHAVIOR_EVENT_TYPES) {
    out[type] = { raw: false, acked: false, warnAcked: false, since: 0, detail: '', tier: 'none' }
  }
  return out
}

function newStreaks(): Record<BehaviorEventType, number> {
  const out = {} as Record<BehaviorEventType, number>
  for (const type of BEHAVIOR_EVENT_TYPES) out[type] = 0
  return out
}

interface PoseEstimate {
  headTurn: boolean
  lookingAway: boolean
  detail: string
}

/** Cumulative time spent in each flagged condition (ms), for the report meter. */
export interface FocusStats {
  /** Milliseconds each flag type was active (warning tier and beyond). */
  flaggedMs: Record<BehaviorEventType, number>
}

function newFlaggedMs(): Record<BehaviorEventType, number> {
  const out = {} as Record<BehaviorEventType, number>
  for (const type of BEHAVIOR_EVENT_TYPES) out[type] = 0
  return out
}

export function emptyFocusStats(): FocusStats {
  return { flaggedMs: newFlaggedMs() }
}

/**
 * Iris position relative to the eye it belongs to, in image space:
 * gx — horizontal offset in half-eye-width units (+ = image right,
 *      which is the candidate's left in an unmirrored camera feed);
 * gy — vertical offset in half-lid-height units (+ = down).
 * Returns null when any required landmark is missing (e.g. older models
 * without the 478-point iris refinement) so callers can fall back to pose.
 */
function eyeGaze(
  landmarks: NormalizedLandmark[],
  outer: number,
  inner: number,
  upper: number,
  lower: number,
  iris: number
): { gx: number; gy: number } | null {
  const o = landmarks[outer]
  const i = landmarks[inner]
  const u = landmarks[upper]
  const lo = landmarks[lower]
  const ir = landmarks[iris]
  if (!o || !i || !u || !lo || !ir) return null
  const halfW = Math.abs(i.x - o.x) / 2
  const halfH = Math.abs(lo.y - u.y) / 2
  if (halfW < 1e-6 || halfH < 1e-6) return null
  const centreX = (o.x + i.x) / 2
  const centreY = (u.y + lo.y) / 2
  return { gx: (ir.x - centreX) / halfW, gy: (ir.y - centreY) / halfH }
}

/** Head pose (nose geometry) + eye gaze (iris geometry). */
export function computePose(landmarks: NormalizedLandmark[]): PoseEstimate {
  const nose = landmarks[IDX.noseTip]
  const left = landmarks[IDX.leftFace]
  const right = landmarks[IDX.rightFace]
  const eyeLeft = landmarks[IDX.eyeLeft]
  const eyeRight = landmarks[IDX.eyeRight]
  const chin = landmarks[IDX.chin]
  if (!nose || !left || !right || !eyeLeft || !eyeRight || !chin) {
    return { headTurn: false, lookingAway: false, detail: '' }
  }

  const centreX = (left.x + right.x) / 2
  const halfWidth = Math.max(1e-6, Math.abs(right.x - left.x) / 2)
  const yaw = (nose.x - centreX) / halfWidth

  const eyeY = (eyeLeft.y + eyeRight.y) / 2
  const faceSpan = Math.max(1e-6, chin.y - eyeY)
  const pitchFraction = (nose.y - eyeY) / faceSpan

  // --- eye gaze (primary "are they looking at the camera" signal) ----------
  let gazeAway = false
  let gazeDetail = ''
  const gL = eyeGaze(landmarks, IDX.eyeLeft, IDX.eyeLeftInner, IDX.eyeLeftUpper, IDX.eyeLeftLower, IDX.irisLeft)
  const gR = eyeGaze(landmarks, IDX.eyeRight, IDX.eyeRightInner, IDX.eyeRightUpper, IDX.eyeRightLower, IDX.irisRight)
  if (gL && gR) {
    const gx = (gL.gx + gR.gx) / 2
    const gy = (gL.gy + gR.gy) / 2
    if (Math.abs(gx) >= GAZE_X) {
      gazeAway = true
      gazeDetail = `Eyes off camera — looking ${gx > 0 ? 'left' : 'right'}`
    } else if (gy >= GAZE_Y) {
      gazeAway = true
      gazeDetail = 'Eyes off camera — looking down'
    } else if (gy <= -GAZE_Y) {
      gazeAway = true
      gazeDetail = 'Eyes off camera — looking up'
    }
  }

  const headTurn = Math.abs(yaw) >= YAW_THRESHOLD
  const pitchAway = pitchFraction <= PITCH_LOW || pitchFraction >= PITCH_HIGH
  const lookingAway = gazeAway || pitchAway

  let detail = ''
  if (headTurn) {
    const pct = Math.round(Math.abs(yaw) * 100)
    detail = `Head turned ${yaw > 0 ? 'left' : 'right'} (~${pct}%)`
  } else if (gazeAway) {
    detail = gazeDetail
  } else if (pitchAway) {
    detail = pitchFraction >= PITCH_HIGH ? 'Looking down away from the screen' : 'Looking up away from the screen'
  }
  return { headTurn, lookingAway, detail }
}

type StateListener = (active: BehaviorEventType[]) => void
type WarningListener = (warnings: BehaviorEventType[]) => void
type EventListener = (event: BehaviorEvent) => void

/**
 * Single-use monitor: create, `start(video)`, then `stop()`.
 *
 * Face events require MediaPipe; if the runtime fails to load, only tab-switch
 * monitoring stays available (best effort — never a hard failure).
 *
 * Escalation is staged: warnings appear after the 3s grace period, the
 * freeze overlay only after FREEZE_AFTER_MS of continuous behaviour.
 */
export class BehaviorMonitor {
  private landmarker: FaceLandmarker | null = null
  private video: HTMLVideoElement | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private lastTs = 0
  private seq = 0
  private started = false
  private stopped = false
  private visibilityAttached = false

  private streaks = newStreaks()
  private episodes = newEpisodes()
  /** Running totals used to compute the report's camera-confidence meter. */
  private flagged = newFlaggedMs()
  private lastWarningsKey = ''

  private stateListeners = new Set<StateListener>()
  private warningListeners = new Set<WarningListener>()
  private eventListeners = new Set<EventListener>()

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    listener(this.activeState())
    return () => this.stateListeners.delete(listener)
  }

  /** Toast-tier warnings (after the grace period, before/without freeze). */
  onWarningChange(listener: WarningListener): () => void {
    this.warningListeners.add(listener)
    listener(this.warningState())
    return () => this.warningListeners.delete(listener)
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  async start(video: HTMLVideoElement): Promise<void> {
    if (this.started) return
    this.started = true
    this.stopped = false
    this.video = video

    try {
      const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
      if (this.stopped) return

      const options: FaceLandmarkerOptions = {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 4,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      }

      let landmarker: FaceLandmarker
      try {
        landmarker = await FaceLandmarker.createFromOptions(fileset, options)
      } catch {
        landmarker = await FaceLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        })
      }

      if (this.stopped) {
        landmarker.close()
        return
      }

      this.landmarker = landmarker
      this.attachVisibility()
      this.timer = setInterval(this.tick, DETECT_INTERVAL_MS)
      this.emitState()
    } catch (err) {
      if (this.stopped) return
      // Face detection unavailable — keep tab-switch monitoring working.
      console.warn('[monitor] face detection unavailable, continuing without it:', err)
      this.attachVisibility()
      this.emitState()
    }
  }

  stop(): void {
    this.stopped = true
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.detachVisibility()
    if (this.landmarker) {
      try {
        this.landmarker.close()
      } catch {
        // already torn down
      }
      this.landmarker = null
    }
    this.video = null
    this.streaks = newStreaks()
    this.episodes = newEpisodes()
    this.emitState()
  }

  /** Freeze overlay "Continue": dismisses until the condition re-occurs. */
  acknowledge(): void {
    for (const type of BEHAVIOR_EVENT_TYPES) {
      const episode = this.episodes[type]
      if (!episode.raw) continue
      if (type === 'tab_switch') {
        episode.raw = false
        episode.acked = false
        episode.warnAcked = false
        episode.since = 0
        episode.tier = 'none'
      } else {
        episode.acked = true
        episode.warnAcked = true
      }
    }
    this.emitState()
  }

  /** Toast "Got it": hides the notification until the condition clears. */
  dismissWarnings(): void {
    for (const type of this.warningState()) this.episodes[type].warnAcked = true
    this.emitWarnings()
  }

  /** Freeze-tier flags — drive the full-screen pause overlay. */
  activeState(): BehaviorEventType[] {
    const active: BehaviorEventType[] = []
    for (const type of BEHAVIOR_EVENT_TYPES) {
      const episode = this.episodes[type]
      if (episode.raw && episode.tier === 'freeze' && !episode.acked) active.push(type)
    }
    return active
  }

  /** Warning-tier flags — drive the gentle toast. Never shown once frozen. */
  warningState(): BehaviorEventType[] {
    const warnings: BehaviorEventType[] = []
    for (const type of BEHAVIOR_EVENT_TYPES) {
      const episode = this.episodes[type]
      if (episode.raw && episode.tier === 'warn' && !episode.warnAcked) warnings.push(type)
    }
    return warnings
  }

  /** Cumulative flagged time — drives the confidence meter in the report. */
  getStats(): FocusStats {
    return { flaggedMs: { ...this.flagged } }
  }

  // --- internals ------------------------------------------------------------

  /**
   * Move episodes across tier boundaries as wall-clock time passes.
   * Returns true when anything changed (→ listeners must fire). The first
   * time an episode reaches `warn` is also when it is logged — grace-period
   * blips never reach the session record.
   */
  private refreshTiers(): boolean {
    const now = Date.now()
    let changed = false
    for (const type of BEHAVIOR_EVENT_TYPES) {
      if (type === 'tab_switch') continue // tier set at onset (0/0 thresholds)
      const episode = this.episodes[type]
      if (!episode.raw) {
        if (episode.tier !== 'none') {
          episode.tier = 'none'
          changed = true
        }
        continue
      }
      const tier = tierOf(type, now - episode.since)
      if (tier !== episode.tier) {
        episode.tier = tier
        if (tier === 'warn') this.log(type, episode.detail)
        changed = true
      }
    }
    return changed
  }

  private tick = (): void => {
    const promoted = this.refreshTiers()

    // Accumulate flagged time for the report's confidence meter.
    // (Tab-switch time is accounted for in onVisibilityChange instead.)
    // Grace-period time does not count — the meter measures attention,
    // and normal blinks/glances are not lost attention.
    for (const type of BEHAVIOR_EVENT_TYPES) {
      if (type === 'tab_switch') continue
      const episode = this.episodes[type]
      if (episode.tier === 'warn' || episode.tier === 'freeze') {
        this.flagged[type] += DETECT_INTERVAL_MS
      }
    }

    const video = this.video
    const landmarker = this.landmarker
    if (!video || !landmarker || this.stopped) return

    // Never flag "no face" while the camera stream isn't actually being rendered.
    if (video.readyState < 2 || video.videoWidth === 0) {
      for (const type of BEHAVIOR_EVENT_TYPES) {
        if (type === 'tab_switch') continue
        this.streaks[type] = 0
        this.setOnset(type, false)
      }
      if (promoted) this.emitState()
      return
    }

    let ts = performance.now()
    if (ts <= this.lastTs) ts = this.lastTs + 1
    this.lastTs = ts

    let result
    try {
      result = landmarker.detectForVideo(video, ts)
    } catch {
      if (promoted) this.emitState()
      return
    }

    const faces = result.faceLandmarks?.length ?? 0
    this.update('no_face', faces === 0, 'No face detected in camera')
    this.update('multiple_faces', faces > 1, `${faces} faces detected`)

    const primary = faces >= 1 ? result.faceLandmarks[0] : undefined
    if (primary) {
      const pose = computePose(primary)
      this.update('head_turn', pose.headTurn, pose.detail || 'Head turned away from screen')
      this.update('looking_away', pose.lookingAway, pose.detail || 'Looking away from screen')
    } else {
      this.streaks.head_turn = 0
      this.setOnset('head_turn', false)
      this.streaks.looking_away = 0
      this.setOnset('looking_away', false)
    }

    // Surface time-based promotions (grace → warn → freeze) even when the
    // detector itself saw no state change this tick.
    if (promoted) this.emitState()
  }

  private update(type: BehaviorEventType, active: boolean, detail: string): void {
    if (active) {
      this.streaks[type] += 1
      if (this.streaks[type] >= MIN_STREAK[type]) this.setOnset(type, true, detail)
    } else {
      this.streaks[type] = 0
      this.setOnset(type, false)
    }
  }

  private setOnset(type: BehaviorEventType, active: boolean, detail = ''): void {
    const episode = this.episodes[type]
    if (active && !episode.raw) {
      episode.raw = true
      episode.acked = false
      episode.warnAcked = false
      episode.since = Date.now()
      episode.detail = detail
      episode.tier = tierOf(type, 0)
      // Types with no grace period (tab_switch) are logged immediately;
      // face flags are logged only when they graduate past the grace period.
      if (episode.tier === 'warn' || episode.tier === 'freeze') this.log(type, detail)
      this.emitState()
    } else if (!active && episode.raw) {
      episode.raw = false
      episode.acked = false
      episode.warnAcked = false
      episode.since = 0
      episode.detail = ''
      episode.tier = 'none'
      this.emitState()
    }
  }

  private hiddenSince: number | null = null

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.hiddenSince = Date.now()
      this.setOnset('tab_switch', true, 'Left the interview tab')
    } else if (this.hiddenSince !== null) {
      // Account the hidden stretch, then clear the warning so the freeze
      // lifts as soon as the candidate is back on the interview tab.
      this.flagged.tab_switch += Date.now() - this.hiddenSince
      this.hiddenSince = null
      this.episodes.tab_switch.raw = false
      this.episodes.tab_switch.acked = false
      this.episodes.tab_switch.warnAcked = false
      this.episodes.tab_switch.since = 0
      this.episodes.tab_switch.tier = 'none'
      this.emitState()
    }
  }

  private attachVisibility(): void {
    if (this.visibilityAttached) return
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.visibilityAttached = true
  }

  private detachVisibility(): void {
    if (!this.visibilityAttached) return
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.visibilityAttached = false
  }

  private log(type: BehaviorEventType, detail: string): void {
    const event: BehaviorEvent = {
      id: `${Date.now()}-${type}-${this.seq++}`,
      type,
      detail,
      at: Date.now(),
    }
    console.warn(`[monitor] flag:${type}${detail ? ` — ${detail}` : ''}`)
    for (const listener of this.eventListeners) listener(event)
  }

  private emitState(): void {
    const active = this.activeState()
    for (const listener of this.stateListeners) listener(active)
    this.emitWarnings()
  }

  private emitWarnings(): void {
    const warnings = this.warningState()
    const key = warnings.join(',')
    if (key === this.lastWarningsKey) return
    this.lastWarningsKey = key
    for (const listener of this.warningListeners) listener(warnings)
  }
}
