import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  Mic,
  MicOff,
  Send,
  Clock,
  ChevronRight,
  AlertCircle,
  Video,
  Loader2,
  Code2,
  BookOpen,
  MessageCircle,
  RefreshCw,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import BehaviorOverlay from '@/features/monitoring/BehaviorOverlay'
import BehaviorWarnings from '@/features/monitoring/BehaviorWarnings'
import { useBehaviorMonitor } from '@/features/monitoring/useBehaviorMonitor'
import {
  gradeInterviewRemote,
  type GradeAnswer,
  type GradeQuestion,
  type SpeechMetric,
} from '@/lib/api'
import {
  generateQuestions,
  QUESTION_TYPE_META,
  type InterviewQuestion,
  type QuestionType,
  type Difficulty,
} from '@/features/interview/questionEngine'

/* ── Timer helper ──────────────────────────────────────────────── */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/* ── Type badge icon map ───────────────────────────────────────── */

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  coding: <Code2 className="h-3 w-3" />,
  conceptual: <BookOpen className="h-3 w-3" />,
  oral: <MessageCircle className="h-3 w-3" />,
}

/* ── Monaco language mapping ──────────────────────────────────── */

function languageForQuestion(q: InterviewQuestion): string {
  const s = `${q.skill} ${q.topic}`.toLowerCase()
  if (s.includes('typescript') || s.includes('react')) return 'typescript'
  if (s.includes('python') || s.includes('pandas')) return 'python'
  if (s.includes('sql')) return 'sql'
  if (s.includes('html')) return 'html'
  if (s.includes('css')) return 'css'
  if (s.includes('javascript')) return 'javascript'
  return 'javascript'
}

/* ── Component ─────────────────────────────────────────────────── */

export default function Interview() {
  const navigate = useNavigate()

  /* ── read setup data ─────────────────────────────────────────── */

  const stored = localStorage.getItem('interviewly_setup')
  let setup: {
    role: string
    difficulty: string
    skills: string[]
    questionCount: number
  } | null = null
  if (stored) {
    try {
      setup = JSON.parse(stored)
    } catch {
      setup = null
    }
  }

  const role = setup?.role ?? 'Frontend'
  const difficulty = (setup?.difficulty ?? 'Medium') as Difficulty
  const skills = setup?.skills ?? ['React', 'TypeScript', 'CSS']
  const questionCount = setup?.questionCount ?? 8

  // CV text persisted by the upload step — used to tailor questions.
  const cvStored = localStorage.getItem('interviewly_cv')
  let cvText = ''
  if (cvStored) {
    try {
      cvText = (JSON.parse(cvStored) as { text?: string }).text ?? ''
    } catch {
      cvText = ''
    }
  }

  /* ── state ───────────────────────────────────────────────────── */

  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [genError, setGenError] = useState<string | null>(null)
  const [mode, setMode] = useState<'ai' | 'mock'>('mock')
  const [genAttempt, setGenAttempt] = useState(0)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [questionTime, setQuestionTime] = useState(120)
  const [transitioning, setTransitioning] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const [speechSupported] = useState(() =>
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  )
  /** Fatal speech errors (permission denied, no mic, …) shown near the mic. */
  const [speechError, setSpeechError] = useState<string | null>(null)
  /** Speech metrics (seconds spoken + confidence) accumulated per question. */
  const [speechStats, setSpeechStats] = useState<SpeechMetric[]>([])

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const committedRef = useRef('')
  /** True while the candidate wants the mic open (drives auto-restart). */
  const wantListeningRef = useRef(false)
  /** When recognition last delivered transcript — i.e. the candidate was
   *  actually speaking. Gaps longer than SPEECH_SILENCE_MS are pauses and
   *  do not count towards spoken time. */
  const lastHeardAtRef = useRef<number | null>(null)
  /** Total ms spoken on the current question across all segments. */
  const spokenMsRef = useRef(0)
  /** Confidence samples collected from final recognition results. */
  const confidencesRef = useRef<number[]>([])

  /* ── generate questions on mount ─────────────────────────────── */

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setGenError(null)
      try {
        const result = await generateQuestions({
          cvText,
          role,
          skills,
          difficulty,
          count: questionCount,
        })
        if (cancelled) return
        setMode(result.mode)
        setQuestions(result.questions)
        if (result.questions.length > 0) {
          setQuestionTime(result.questions[0].timeLimitSeconds ?? 120)
        }
      } catch (err) {
        if (cancelled) return
        setQuestions([])
        setGenError(
          err instanceof Error ? err.message : 'Could not generate questions.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genAttempt])

  /* ── hide parent layout on mount ─────────────────────────────── */

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const totalQuestions = questions.length
  const question = questions[currentIdx] ?? null
  const progress = totalQuestions > 0 ? (currentIdx / totalQuestions) * 100 : 0
  const isLastQuestion = currentIdx === totalQuestions - 1
  const isCoding = question?.type === 'coding'

  /* ── behaviour monitoring (flag-only proctoring) ───────────── */

  const {
    activeViolations,
    activeWarnings,
    acknowledge,
    dismissWarnings,
    events,
    getFocusStats,
  } = useBehaviorMonitor({
    active: !loading && !genError && Boolean(question),
    videoRef,
  })

  /** Freeze: while a freeze-tier flag is open the shell is inert and timers stop. */
  const frozen = activeViolations.length > 0

  /** Wall-clock start — denominates the report's camera-confidence meter. */
  const sessionStartRef = useRef(Date.now())

  /* ── per-question countdown timer ────────────────────────────── */

  const maxTime = question?.timeLimitSeconds ?? 120
  const questionTimerFraction = maxTime > 0 ? questionTime / maxTime : 1
  const timerUrgency =
    questionTime <= 15 ? 'critical' : questionTime <= 30 ? 'warning' : 'normal'

  /* ── global elapsed timer ────────────────────────────────────── */

  useEffect(() => {
    if (loading || frozen) return
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [loading, frozen])

  /* ── per-question countdown ──────────────────────────────────── */

  useEffect(() => {
    if (!question) return
    setQuestionTime(question.timeLimitSeconds ?? 120)
  }, [currentIdx, question])

  useEffect(() => {
    if (loading || frozen || questionTime <= 0) return
    const interval = setInterval(() => {
      setQuestionTime((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading, frozen, questionTime])

  /* ── speech recognition control ──────────────────────────────── */

  /** Silence gap after which we stop counting speaking time. Wide enough to
   *  bridge recognition restarts (Chrome ends on silence, restarts ~250ms). */
  const SPEECH_SILENCE_MS = 2000

  /**
   * Account the time since the last transcript as speaking time — but only if
   * it was short enough to be continuous speech (a longer gap was a pause).
   * `open` keeps the window running for the next result; false closes it
   * (mic stopping or a fatal recognition error).
   */
  const accountSpeech = useCallback((open: boolean) => {
    const now = Date.now()
    const prev = lastHeardAtRef.current
    lastHeardAtRef.current = open ? now : null
    if (prev !== null && now - prev <= SPEECH_SILENCE_MS) {
      spokenMsRef.current += now - prev
    }
  }, [])

  const stopListening = useCallback(() => {
    wantListeningRef.current = false
    accountSpeech(false)
    if (recRef.current) {
      try {
        recRef.current.stop()
      } catch {
        /* ignore — already stopped */
      }
    }
    setIsRecording(false)
  }, [accountSpeech])

  const startListening = useCallback(() => {
    if (!speechSupported) return
    wantListeningRef.current = true
    setSpeechError(null)

    if (!recRef.current) {
      const Ctor =
        window.SpeechRecognition || window.webkitSpeechRecognition
      if (!Ctor) return
      const rec = new Ctor()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (event) => {
        let finalDelta = ''
        let interimDelta = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          const text = res[0]?.transcript ?? ''
          if (res.isFinal) {
            finalDelta += text
            const conf = res[0]?.confidence
            if (typeof conf === 'number' && Number.isFinite(conf) && conf > 0) {
              confidencesRef.current.push(conf)
            }
          } else {
            interimDelta += text
          }
        }
        if (finalDelta) {
          committedRef.current = `${committedRef.current} ${finalDelta}`.replace(
            /\s+/g,
            ' '
          )
          setAnswer(committedRef.current)
        }
        if (finalDelta || interimDelta) accountSpeech(true)
        setInterim(interimDelta)
      }
      rec.onerror = (ev) => {
        if (
          ev.error === 'not-allowed' ||
          ev.error === 'service-not-allowed'
        ) {
          wantListeningRef.current = false
          accountSpeech(false)
          setSpeechError(
            'Microphone access was blocked — allow the mic in your browser and press Speak again. You can also type your answer.'
          )
        } else if (ev.error === 'audio-capture') {
          wantListeningRef.current = false
          accountSpeech(false)
          setSpeechError(
            'No microphone found — check your device. You can still type your answer.'
          )
        } else if (ev.error === 'network') {
          wantListeningRef.current = false
          accountSpeech(false)
          setSpeechError(
            'Speech service unavailable — check your connection. You can still type your answer.'
          )
        }
        // 'no-speech' / 'aborted' are routine — onend restarts if still wanted.
        setIsRecording(false)
      }
      rec.onend = () => {
        setIsRecording(false)
        // Chrome closes recognition after silence; keep the mic open until
        // the candidate presses Stop (or a fatal error stopped us).
        if (wantListeningRef.current && recRef.current) {
          window.setTimeout(() => {
            const r = recRef.current
            if (!wantListeningRef.current || !r) return
            try {
              r.start()
              setIsRecording(true)
            } catch {
              /* already started */
            }
          }, 250)
        }
      }
      recRef.current = rec
    }

    try {
      recRef.current.start()
      setIsRecording(true)
    } catch {
      /* already started */
    }
  }, [speechSupported, accountSpeech])

  /**
   * Seconds actually spoken on the current question — transcript-driven, so
   * silence while the mic is open never inflates the metric. Includes the
   * in-progress stretch since the last transcript (while still speaking).
   */
  function spokenSecondsNow(): number {
    let ms = spokenMsRef.current
    const heard = lastHeardAtRef.current
    if (
      isRecording &&
      heard !== null &&
      Date.now() - heard <= SPEECH_SILENCE_MS
    ) {
      ms += Date.now() - heard
    }
    return Math.round(ms / 1000)
  }

  /* ── live speech-activity indicator ───────────────────────────── */

  /** True while transcript results are arriving — i.e. speech detected now. */
  const [speakingNow, setSpeakingNow] = useState(false)

  useEffect(() => {
    if (!isRecording) {
      setSpeakingNow(false)
      return
    }
    const iv = setInterval(() => {
      const heard = lastHeardAtRef.current
      setSpeakingNow(
        heard !== null && Date.now() - heard <= SPEECH_SILENCE_MS
      )
    }, 400)
    return () => clearInterval(iv)
  }, [isRecording])

  /* ── webcam ──────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        // Camera not available — the preview just stays blank
      }
    }
    startCamera()
    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  /* ── attach stream once the interview UI (and <video>) exists ─ */

  useEffect(() => {
    if (loading || genError) return
    const stream = streamRef.current
    const video = videoRef.current
    if (!stream || !video || video.srcObject === stream) return
    video.srcObject = stream
    void video.play().catch(() => {
      /* autoplay is already allowed (muted element) */
    })
  }, [loading, genError])

  /* ── reset answer + transcript on question change ────────────── */

  useEffect(() => {
    const q = questions[currentIdx]
    setAnswer(q?.type === 'coding' ? (q.starterCode ?? '') : '')
    committedRef.current = ''
    setInterim('')
    stopListening()
    // Reset per-question speech accounting (stopListening flushed any
    // in-progress stretch, so zeroing afterwards drops the previous question).
    spokenMsRef.current = 0
    confidencesRef.current = []
    setSpeechError(null)
  }, [currentIdx, questions, stopListening])

  /* ── show hint after 15s on a question ───────────────────────── */

  useEffect(() => {
    setShowHint(false)
    const timeout = setTimeout(() => setShowHint(true), 15000)
    return () => clearTimeout(timeout)
  }, [currentIdx])

  /* ── auto-focus textarea (voice mode) ────────────────────────── */

  useEffect(() => {
    if (!transitioning && !loading && !isCoding) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [currentIdx, transitioning, loading, isCoding])

  /* ── handlers ────────────────────────────────────────────────── */

  const pendingVoice = !isCoding && interim ? interim : ''
  const canSubmit = (
    answer + (pendingVoice ? ` ${pendingVoice}` : '')
  ).trim().length > 0

  const submitAnswer = useCallback(async () => {
    const submittedAnswer = (
      answer + (interim ? ` ${interim}` : '')
    ).trim()
    if (!submittedAnswer) return

    stopListening()

    // Speech metrics for this question (stopListening just flushed the
    // in-progress stretch, so spokenMsRef now holds the full total).
    const currentQuestion = questions[currentIdx]
    const spokenSeconds = Math.round(spokenMsRef.current / 1000)
    const samples = confidencesRef.current
    const confidence =
      samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : null
    const speechMetric: SpeechMetric = {
      questionId: currentQuestion?.id ?? `q-${currentIdx + 1}`,
      type: currentQuestion?.type ?? 'oral',
      text: currentQuestion?.text ?? '',
      spokenSeconds,
      wordCount: submittedAnswer.split(/\s+/).filter(Boolean).length,
      confidence,
    }
    const finalSpeech =
      currentQuestion &&
      (currentQuestion.type === 'oral' ||
        spokenSeconds > 0 ||
        confidence !== null)
        ? [...speechStats, speechMetric]
        : speechStats
    setSpeechStats(finalSpeech)

    setAnswers((prev) => [...prev, submittedAnswer])
    setAnswer('')
    setInterim('')
    committedRef.current = ''

    if (isLastQuestion) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      const finalAnswers = [...answers, submittedAnswer]
      const gradeQuestions: GradeQuestion[] = questions.map((q) => ({
        id: q.id,
        text: q.text,
        skill: q.skill,
        topic: q.topic,
        type: q.type,
        difficulty: q.difficulty,
      }))
      const gradeAnswers: GradeAnswer[] = finalAnswers.map((text, i) => ({
        questionId: questions[i]?.id ?? `q-${i + 1}`,
        answer: text,
      }))
      try {
        const grading = await gradeInterviewRemote({
          role,
          questions: gradeQuestions,
          answers: gradeAnswers,
          speech: finalSpeech,
          events,
          focus: {
            sessionSeconds: Math.max(
              1,
              Math.round((Date.now() - sessionStartRef.current) / 1000)
            ),
            flaggedMs: getFocusStats().flaggedMs,
          },
        })
        localStorage.setItem('interviewly_answers', JSON.stringify(finalAnswers))
        localStorage.setItem('interviewly_result', JSON.stringify(grading.result))
        localStorage.setItem('interviewly_grading_meta', JSON.stringify({
          mode: grading.mode,
          provider: grading.provider,
          gradedAt: Date.now(),
        }))
      } catch (err) {
        console.warn('[interview] grading failed:', err)
        localStorage.setItem('interviewly_answers', JSON.stringify(finalAnswers))
        localStorage.removeItem('interviewly_result')
        localStorage.removeItem('interviewly_grading_meta')
      }
      navigate('/result')
      return
    }

    setTransitioning(true)
    setTimeout(() => {
      setCurrentIdx((i) => i + 1)
      setTransitioning(false)
    }, 500)
  }, [
    answer,
    interim,
    isLastQuestion,
    answers,
    navigate,
    stopListening,
    questions,
    currentIdx,
    speechStats,
    role,
    events,
    getFocusStats,
  ])

  function toggleMic() {
    if (isRecording) stopListening()
    else startListening()
  }

  function retryGenerate() {
    setGenAttempt((a) => a + 1)
  }

  /* ── render helpers ──────────────────────────────────────────── */

  function renderCode(text: string) {
    const parts = text.split(/(`[^`]+`)/)
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="text-accent bg-accent-light px-1.5 py-0.5 rounded text-[0.9em] font-mono"
          >
            {part.slice(1, -1)}
          </code>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  function typeBadge(type: QuestionType) {
    const meta = QUESTION_TYPE_META[type]
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${meta.bgColor} ${meta.color}`}
      >
        {TYPE_ICONS[type]}
        {meta.label}
      </span>
    )
  }

  /* ── loading state ───────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-surface flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="mx-auto h-14 w-14 rounded-full bg-accent-light flex items-center justify-center animate-pulse-soft">
            <Loader2 className="h-6 w-6 text-accent animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Generating questions…
            </p>
            <p className="text-xs text-foreground-subtle">
              Tailoring to your skills in {skills.slice(0, 3).join(', ')}
              {skills.length > 3 && ` +${skills.length - 3} more`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ── error state ─────────────────────────────────────────────── */

  if (genError) {
    return (
      <div className="fixed inset-0 z-[100] bg-surface flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in max-w-sm px-6">
          <div className="mx-auto h-14 w-14 rounded-full bg-error/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-error" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Couldn't generate questions
            </p>
            <p className="text-xs text-foreground-subtle">{genError}</p>
          </div>
          <Button
            id="interview-retry"
            variant="primary"
            size="lg"
            onClick={retryGenerate}
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!question) return null

  /* ── render ──────────────────────────────────────────────────── */

  return (
    <div className="fixed inset-0 z-[100] bg-surface flex flex-col overflow-hidden">
      {/* ── Top bar: progress + meta ───────────────────────────── */}
      <header className="shrink-0" inert={frozen}>
        <div className="h-[3px] bg-border/50">
          <div
            className="h-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--color-accent), #818CF8)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-progress-sweep" />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 h-12 border-b border-border/60 bg-surface-raised/50 backdrop-blur-sm">
          {/* Left: role + difficulty + provider mode */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-foreground-muted">
              {role}
            </span>
            <span className="h-3.5 w-px bg-border" />
            <span className="text-xs text-foreground-subtle">{difficulty}</span>
            <span
              className={[
                'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
                mode === 'ai'
                  ? 'bg-accent-light text-accent'
                  : 'bg-border/60 text-foreground-subtle',
              ].join(' ')}
              title={
                mode === 'ai'
                  ? 'Questions generated by AI'
                  : 'Questions generated in mock mode (no API key configured)'
              }
            >
              {mode === 'ai' ? 'AI' : 'Mock'}
            </span>
          </div>

          {/* Center: question step dots */}
          <div className="hidden md:flex items-center gap-1.5">
            {questions.map((q, idx) => {
              const dotMeta = QUESTION_TYPE_META[q.type]
              return (
                <button
                  key={idx}
                  className={[
                    'h-2 rounded-full transition-all duration-300 cursor-default',
                    idx === currentIdx ? 'w-6' : 'w-2',
                    idx < currentIdx
                      ? 'bg-success'
                      : idx === currentIdx
                        ? ''
                        : 'bg-border',
                  ].join(' ')}
                  style={
                    idx === currentIdx
                      ? {
                          backgroundColor:
                            q.type === 'coding'
                              ? '#059669'
                              : q.type === 'conceptual'
                                ? '#7C3AED'
                                : '#D97706',
                        }
                      : undefined
                  }
                  aria-label={`Question ${idx + 1} — ${dotMeta.label}`}
                  title={`Q${idx + 1}: ${dotMeta.label}`}
                />
              )
            })}
          </div>

          {/* Right: total elapsed */}
          <div className="flex items-center gap-2 text-foreground-subtle">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-mono tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>
      </header>

      {/* ── Three-panel workspace ─────────────────────────────── */}
      <main
        inert={frozen}
        className="flex-1 min-h-0 flex flex-col lg:grid lg:gap-5 gap-5 p-5 overflow-y-auto lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.72fr)]"
      >
        {/* ── LEFT: Question ─────────────────────────────────── */}
        <section className="lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <div
            className={[
              'space-y-4 transition-all duration-500',
              transitioning
                ? 'opacity-0 translate-y-4'
                : 'opacity-100 translate-y-0',
            ].join(' ')}
          >
            {/* Number + badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-accent text-accent-foreground text-xs font-bold shrink-0">
                {currentIdx + 1}
              </span>
              {typeBadge(question.type)}
              <span className="text-[11px] font-semibold uppercase tracking-widest text-accent bg-accent-light px-2.5 py-1 rounded-full">
                {question.topic}
              </span>
            </div>

            {/* Question card */}
            <div className="border border-border rounded-[var(--radius-lg)] bg-surface-raised p-6 shadow-sm space-y-4">
              <p className="text-base md:text-lg leading-relaxed text-foreground font-[420]">
                {renderCode(question.text)}
              </p>

              {isCoding && question.starterCode && (
                <div className="rounded-[var(--radius-md)] bg-[#0a0a0a] p-3 overflow-x-auto">
                  <pre className="text-[13px] text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap">
                    {question.starterCode}
                  </pre>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {isCoding && (
                  <p className="text-[11px] text-foreground-subtle">
                    💡 Write your solution in the editor on the right.
                  </p>
                )}
                {question.type === 'oral' && (
                  <p className="text-[11px] text-foreground-subtle">
                    🎙️ Speak naturally — your answer is transcribed live.
                  </p>
                )}
                {question.type === 'conceptual' && (
                  <p className="text-[11px] text-foreground-subtle">
                    💡 Explain clearly — speak or type your answer.
                  </p>
                )}
              </div>
            </div>

            {/* Skill tag */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-foreground-subtle">
                Skill:{' '}
                <span className="font-medium text-foreground-muted">
                  {question.skill}
                </span>
              </span>
            </div>

            {/* Hint nudge */}
            <div
              className={[
                'flex items-start gap-2 text-xs text-foreground-subtle transition-all duration-500',
                showHint
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2 pointer-events-none',
              ].join(' ')}
            >
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              Take your time — think through your answer, then type or speak.
            </div>
          </div>
        </section>

        {/* ── CENTER: Answer (code editor OR live transcript) ── */}
        <section className="flex flex-col lg:min-h-0">
          {/* Panel header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground-subtle">
              {isCoding ? 'Your solution' : 'Your answer'}
            </p>

            {!isCoding && (
              <button
                onClick={toggleMic}
                disabled={!speechSupported}
                className={[
                  'inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer',
                  !speechSupported
                    ? 'opacity-50 cursor-not-allowed bg-border/50 text-foreground-subtle'
                    : isRecording
                      ? 'bg-error/10 text-error animate-pulse-soft'
                      : 'bg-accent-light text-accent hover:bg-accent hover:text-accent-foreground',
                ].join(' ')}
                title={
                  !speechSupported
                    ? 'Speech recognition is not supported in this browser'
                    : isRecording
                      ? 'Stop transcription'
                      : 'Start voice input'
                }
              >
                {isRecording ? (
                  <>
                    <Square className="h-3 w-3" /> Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" /> Speak
                  </>
                )}
              </button>
            )}
          </div>

          {/* Answer surface */}
          <div className="relative flex-1 min-h-[300px] lg:min-h-0">
            {isCoding ? (
              <div className="h-full flex flex-col border border-border rounded-[var(--radius-md)] overflow-hidden bg-[#0a0a0a]">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                    {languageForQuestion(question)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-white/15" />
                    <span className="h-2 w-2 rounded-full bg-white/15" />
                    <span className="h-2 w-2 rounded-full bg-white/15" />
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    language={languageForQuestion(question)}
                    value={answer}
                    onChange={(v) => setAnswer(v ?? '')}
                    theme="vs-dark"
                    loading={
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
                      </div>
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 14, bottom: 14 },
                      tabSize: 2,
                      renderLineHighlight: 'line',
                      scrollbar: {
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                      },
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col border border-border rounded-[var(--radius-md)] bg-surface-raised overflow-hidden">
                {/* Live status strip */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60">
                  {isRecording ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inset-0 rounded-full bg-error animate-pulse-soft" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
                      </span>
                      <span className="text-[11px] font-medium text-error">
                        {speakingNow ? 'Speaking' : 'Listening (pause)'} ·{' '}
                        {formatTime(spokenSecondsNow())} spoken
                      </span>
                    </>
                  ) : speechError ? (
                    <span className="text-[11px] leading-snug text-error">
                      {speechError}
                    </span>
                  ) : (
                    <span className="text-[11px] text-foreground-subtle">
                      {speechSupported
                        ? 'Press Speak to dictate, or just type.'
                        : 'Speech input unavailable — type your answer.'}
                    </span>
                  )}
                </div>

                {/* Transcript / editor textarea */}
                <textarea
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value)
                    committedRef.current = e.target.value
                  }}
                  placeholder={
                    isRecording
                      ? speakingNow
                        ? 'Transcribing your speech…'
                        : 'Listening… speak your answer'
                      : 'Type or dictate your answer…'
                  }
                  className={[
                    'flex-1 min-h-0 w-full resize-none bg-transparent p-4 text-sm leading-relaxed text-foreground placeholder:text-foreground-subtle outline-none',
                    canSubmit ? 'pr-24 pb-11' : '',
                  ].join(' ')}
                />

                {/* Live interim transcript */}
                <div
                  className={[
                    'min-h-[28px] px-4 py-2 border-t border-border/60 bg-surface/50',
                    canSubmit ? 'pr-28' : '',
                  ].join(' ')}
                >
                  {interim ? (
                    <p className="text-xs text-foreground-subtle italic truncate">
                      {interim}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* In-box Next — appears as soon as an answer is typed */}
            {canSubmit && (
              <button
                type="button"
                id="interview-next"
                onClick={submitAnswer}
                className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 bg-accent text-accent-foreground text-xs font-semibold px-3.5 py-2 rounded-full shadow-md hover:opacity-90 active:opacity-80 transition-opacity cursor-pointer"
              >
                {isLastQuestion ? 'Finish' : 'Next'}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Center footer: submit */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-foreground-subtle">
              {isLastQuestion
                ? 'This is the last question.'
                : `${totalQuestions - currentIdx - 1} to go after this one.`}
            </span>
            <Button
              id="interview-submit"
              variant="primary"
              size="md"
              onClick={submitAnswer}
              disabled={!canSubmit}
            >
              {isLastQuestion ? (
                <>
                  Finish <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit &amp; next
                </>
              )}
            </Button>
          </div>
        </section>

        {/* ── RIGHT: Camera + timer ──────────────────────────── */}
        <aside className="lg:min-h-0 lg:overflow-y-auto flex flex-col gap-4">
          {/* Camera preview — always visible for the whole interview */}
          <div className="border border-border rounded-[var(--radius-md)] bg-surface-raised overflow-hidden">
            <div className="relative aspect-[4/3] bg-[#0a0a0a]">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />

              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-soft" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                REC
              </div>

              {/* Mic status overlay */}
              {isRecording && (
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                  <Mic className="h-3 w-3" />
                  MIC ON
                </div>
              )}
            </div>
          </div>

          {/* Timer card */}
          <div className="border border-border rounded-[var(--radius-md)] bg-surface-raised p-5 text-center space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-subtle">
              Time remaining
            </p>

            <p
              className={[
                'text-4xl font-mono tabular-nums font-semibold transition-colors duration-300',
                timerUrgency === 'critical'
                  ? 'text-error'
                  : timerUrgency === 'warning'
                    ? 'text-warning'
                    : 'text-foreground',
              ].join(' ')}
            >
              {formatTime(questionTime)}
            </p>

            {/* Per-question progress bar */}
            <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
              <div
                className={[
                  'h-full rounded-full transition-all duration-1000 ease-linear',
                  timerUrgency === 'critical'
                    ? 'bg-error'
                    : timerUrgency === 'warning'
                      ? 'bg-warning'
                      : 'bg-accent',
                ].join(' ')}
                style={{ width: `${questionTimerFraction * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-foreground-subtle pt-1">
              <span>
                Question{' '}
                <span className="font-medium text-foreground-muted">
                  {currentIdx + 1} / {totalQuestions}
                </span>
              </span>
              <span className="font-mono tabular-nums">
                {formatTime(elapsed)} elapsed
              </span>
            </div>
          </div>

          {/* Device status */}
          <div className="border border-border rounded-[var(--radius-md)] bg-surface-raised p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground-subtle">
              Session
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-muted">Camera</span>
              <span className="flex items-center gap-1.5 text-foreground">
                <Video className="h-3.5 w-3.5" /> Ready
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-muted">Microphone</span>
              <span className="flex items-center gap-1.5 text-foreground">
                {isRecording ? (
                  <>
                    <Mic className="h-3.5 w-3.5 text-error" /> Recording
                  </>
                ) : (
                  <>
                    <MicOff className="h-3.5 w-3.5" /> Idle
                  </>
                )}
              </span>
            </div>
          </div>
        </aside>
      </main>

      {/* ── Proctoring: gentle toast first (3s grace), freeze only if ignored ── */}
      <BehaviorWarnings active={activeWarnings} onDismiss={dismissWarnings} />
      <BehaviorOverlay active={activeViolations} onAcknowledge={acknowledge} />
    </div>
  )
}
