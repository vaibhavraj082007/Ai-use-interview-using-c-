import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Mic,
  Wifi,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ── Types ─────────────────────────────────────────────────────── */

type CheckStatus = 'pending' | 'checking' | 'pass' | 'fail'

interface DeviceCheck {
  id: string
  label: string
  icon: React.ReactNode
  status: CheckStatus
  detail: string
}

/* ── Interview Rules ───────────────────────────────────────────── */

const RULES = [
  'Ensure you are in a quiet, well-lit environment.',
  'Do not switch tabs or leave the browser during the interview.',
  'Answer each question within the allotted time.',
  'AI proctoring is active — no external assistance allowed.',
  'Once started, the interview cannot be paused.',
]

/* ── Component ─────────────────────────────────────────────────── */

export default function PreCheck() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  /* ── state ───────────────────────────────────────────────────── */

  const [cameraStatus, setCameraStatus] = useState<CheckStatus>('pending')
  const [micStatus, setMicStatus] = useState<CheckStatus>('pending')
  const [netStatus, setNetStatus] = useState<CheckStatus>('pending')
  const [cameraDetail, setCameraDetail] = useState('Waiting…')
  const [micDetail, setMicDetail] = useState('Waiting…')
  const [netDetail, setNetDetail] = useState('Waiting…')
  const [hasRun, setHasRun] = useState(false)

  const allPassed =
    cameraStatus === 'pass' && micStatus === 'pass' && netStatus === 'pass'

  const passedCount = [cameraStatus, micStatus, netStatus].filter(
    (s) => s === 'pass'
  ).length

  const anyFailed = [cameraStatus, micStatus, netStatus].some(
    (s) => s === 'fail'
  )

  /* ── check functions ─────────────────────────────────────────── */

  const checkCamera = useCallback(async () => {
    setCameraStatus('checking')
    setCameraDetail('Requesting camera…')
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      const track = stream.getVideoTracks()[0]
      setCameraStatus('pass')
      setCameraDetail(track.label || 'Camera connected')
    } catch {
      setCameraStatus('fail')
      setCameraDetail('Camera access denied or unavailable')
    }
  }, [])

  const checkMic = useCallback(async () => {
    setMicStatus('checking')
    setMicDetail('Requesting microphone…')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const track = stream.getAudioTracks()[0]
      setMicStatus('pass')
      setMicDetail(track.label || 'Microphone connected')
      // We don't need the audio stream running — stop it
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setMicStatus('fail')
      setMicDetail('Microphone access denied or unavailable')
    }
  }, [])

  const checkInternet = useCallback(async () => {
    setNetStatus('checking')
    setNetDetail('Testing connection…')
    try {
      const start = performance.now()
      await fetch('https://www.google.com/generate_204', {
        mode: 'no-cors',
        cache: 'no-store',
      })
      const latency = Math.round(performance.now() - start)
      setNetStatus('pass')
      setNetDetail(`Connected — ${latency} ms latency`)
    } catch {
      setNetStatus('fail')
      setNetDetail('No internet connection detected')
    }
  }, [])

  /* ── run all checks ──────────────────────────────────────────── */

  const runChecks = useCallback(async () => {
    setHasRun(true)
    // Run them sequentially so the user sees each one resolve in order
    await checkCamera()
    await checkMic()
    await checkInternet()
  }, [checkCamera, checkMic, checkInternet])

  // Auto-run on mount
  useEffect(() => {
    runChecks()
    return () => {
      // Cleanup camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── retry a single check ────────────────────────────────────── */

  function retryCheck(id: string) {
    if (id === 'camera') checkCamera()
    else if (id === 'mic') checkMic()
    else if (id === 'net') checkInternet()
  }

  /* ── proceed to interview ────────────────────────────────────── */

  function handleBegin() {
    // Cleanup the camera preview before navigating
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    navigate('/interview')
  }

  /* ── build check rows array ──────────────────────────────────── */

  const checks: DeviceCheck[] = [
    {
      id: 'camera',
      label: 'Camera',
      icon: <Camera className="h-4 w-4" />,
      status: cameraStatus,
      detail: cameraDetail,
    },
    {
      id: 'mic',
      label: 'Microphone',
      icon: <Mic className="h-4 w-4" />,
      status: micStatus,
      detail: micDetail,
    },
    {
      id: 'net',
      label: 'Internet',
      icon: <Wifi className="h-4 w-4" />,
      status: netStatus,
      detail: netDetail,
    },
  ]

  /* ── helpers ─────────────────────────────────────────────────── */

  function statusDot(status: CheckStatus) {
    switch (status) {
      case 'pass':
        return (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-success/40 animate-pulse-soft" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
        )
      case 'fail':
        return (
          <span className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-error" />
          </span>
        )
      case 'checking':
        return <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
      default:
        return (
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-border" />
        )
    }
  }

  function statusIcon(status: CheckStatus) {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-error" />
      default:
        return null
    }
  }

  /* ── render ──────────────────────────────────────────────────── */

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-foreground">
          Pre-Interview Check
        </h1>
        <p className="text-foreground-muted">
          Let's make sure your devices are ready before we begin.
        </p>

        {/* Progress summary */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(passedCount / 3) * 100}%`,
                backgroundColor: anyFailed
                  ? 'var(--color-warning)'
                  : allPassed
                    ? 'var(--color-success)'
                    : 'var(--color-accent)',
              }}
            />
          </div>
          <span className="text-xs font-medium text-foreground-subtle tabular-nums shrink-0">
            {passedCount}/3 passed
          </span>
        </div>
      </div>

      {/* Main grid: Camera preview + Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Camera Preview ───────────────────────────────────── */}
        <div className="border border-border rounded-[var(--radius-md)] bg-surface-raised overflow-hidden animate-slide-up">
          <div className="relative aspect-[4/3] bg-[#0a0a0a]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: 'scaleX(-1)',        // mirror the preview
                display: cameraStatus === 'pass' ? 'block' : 'none',
              }}
            />
            {/* Fallback when camera is not live */}
            {cameraStatus !== 'pass' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center">
                  {cameraStatus === 'checking' ? (
                    <Loader2 className="h-6 w-6 text-white/40 animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white/30" />
                  )}
                </div>
                <p className="text-xs text-white/40">
                  {cameraStatus === 'checking'
                    ? 'Connecting…'
                    : cameraStatus === 'fail'
                      ? 'Camera unavailable'
                      : 'Camera preview'}
                </p>
              </div>
            )}

            {/* Live badge overlay */}
            {cameraStatus === 'pass' && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-soft" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                LIVE
              </div>
            )}

            {/* Camera name overlay */}
            {cameraStatus === 'pass' && (
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-[11px] text-white/60 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full truncate w-fit max-w-full">
                  {cameraDetail}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Device Checks ────────────────────────────────────── */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '60ms' }}>
          {checks.map((check, idx) => (
            <div
              key={check.id}
              className={[
                'border rounded-[var(--radius-md)] bg-surface-raised p-4',
                'flex items-center gap-4 transition-all duration-300',
                check.status === 'pass'
                  ? 'border-success/30 shadow-[0_0_0_1px_rgba(5,150,105,0.06)]'
                  : check.status === 'fail'
                    ? 'border-error/30 shadow-[0_0_0_1px_rgba(220,38,38,0.06)]'
                    : 'border-border',
              ].join(' ')}
              style={{ animationDelay: `${(idx + 1) * 40}ms` }}
            >
              {/* Icon */}
              <div
                className={[
                  'h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-colors duration-300',
                  check.status === 'pass'
                    ? 'bg-success/10 text-success'
                    : check.status === 'fail'
                      ? 'bg-error/10 text-error'
                      : 'bg-accent-light text-accent',
                ].join(' ')}
              >
                {check.icon}
              </div>

              {/* Label + detail */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {statusDot(check.status)}
                  <p className="text-sm font-medium text-foreground">
                    {check.label}
                  </p>
                  {statusIcon(check.status)}
                </div>
                <p className="text-xs text-foreground-subtle mt-0.5 truncate">
                  {check.detail}
                </p>
              </div>

              {/* Retry button on failure */}
              {check.status === 'fail' && (
                <button
                  onClick={() => retryCheck(check.id)}
                  className="h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center
                             text-foreground-muted hover:bg-error/10 hover:text-error
                             transition-colors cursor-pointer shrink-0"
                  title={`Retry ${check.label}`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Retry all */}
          {hasRun && anyFailed && (
            <Button
              id="precheck-retry-all"
              variant="secondary"
              size="sm"
              onClick={runChecks}
              className="mt-1 w-full"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry all checks
            </Button>
          )}
        </div>
      </div>

      {/* ── Interview Rules ────────────────────────────────────── */}
      <div
        className="border border-border rounded-[var(--radius-md)] bg-surface-raised p-5 space-y-4 animate-slide-up"
        style={{ animationDelay: '120ms' }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground-subtle">
            Interview Rules
          </p>
        </div>
        <ul className="space-y-2.5">
          {RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground-muted">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-warning/10 text-warning text-[10px] font-bold shrink-0 mt-px">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Begin Button ───────────────────────────────────────── */}
      <div
        className="flex flex-col items-center gap-3 animate-slide-up"
        style={{ animationDelay: '180ms' }}
      >
        <Button
          id="precheck-begin"
          variant="primary"
          size="lg"
          disabled={!allPassed}
          onClick={handleBegin}
          className={allPassed ? '' : 'opacity-50 cursor-not-allowed'}
        >
          {allPassed ? (
            <>
              Begin Interview <ArrowRight className="h-4 w-4" />
            </>
          ) : anyFailed ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              Fix issues to continue
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running checks…
            </>
          )}
        </Button>

        {allPassed && (
          <p className="text-xs text-success flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All systems ready — you're good to go
          </p>
        )}

        {!allPassed && hasRun && anyFailed && (
          <p className="text-xs text-error flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            Fix the issues above to continue
          </p>
        )}
      </div>
    </div>
  )
}
