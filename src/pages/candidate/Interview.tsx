import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic,
  MicOff,
  Send,
  Clock,
  ChevronRight,
  AlertCircle,
  Video,
  VideoOff,
  Loader2,
  Code2,
  BookOpen,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  generateQuestions,
  QUESTION_TYPE_META,
  type InterviewQuestion,
  type QuestionType,
  type Difficulty,
} from '@/lib/questionEngine'

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

/* ── Component ─────────────────────────────────────────────────── */

export default function Interview() {
  const navigate = useNavigate()

  /* ── read setup data ─────────────────────────────────────────── */

  const stored = localStorage.getItem('interviewly_setup')
  const setup = stored
    ? (JSON.parse(stored) as {
        role: string
        difficulty: string
        skills: string[]
        questionCount: number
      })
    : null

  const role = setup?.role ?? 'Frontend'
  const difficulty = (setup?.difficulty ?? 'Medium') as Difficulty
  const skills = setup?.skills ?? ['React', 'TypeScript', 'CSS']
  const questionCount = setup?.questionCount ?? 8

  /* ── state ───────────────────────────────────────────────────── */

  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [questionTime, setQuestionTime] = useState(120)
  const [transitioning, setTransitioning] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [camVisible, setCamVisible] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  /* ── generate questions on mount ─────────────────────────────── */

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const qs = await generateQuestions({
        role,
        skills,
        difficulty,
        count: questionCount,
      })
      if (!cancelled) {
        setQuestions(qs)
        if (qs.length > 0) {
          setQuestionTime(qs[0].timeLimitSeconds ?? 120)
        }
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  /* ── per-question countdown timer ────────────────────────────── */

  const maxTime = question?.timeLimitSeconds ?? 120
  const questionTimerFraction = maxTime > 0 ? questionTime / maxTime : 1
  const timerUrgency =
    questionTime <= 15
      ? 'critical'
      : questionTime <= 30
        ? 'warning'
        : 'normal'

  /* ── global elapsed timer ────────────────────────────────────── */

  useEffect(() => {
    if (loading) return
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  /* ── per-question countdown ──────────────────────────────────── */

  useEffect(() => {
    if (!question) return
    setQuestionTime(question.timeLimitSeconds ?? 120)
  }, [currentIdx, question])

  useEffect(() => {
    if (loading || questionTime <= 0) return
    const interval = setInterval(() => {
      setQuestionTime((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading, questionTime])

  /* ── webcam ──────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 160, height: 120, facingMode: 'user' },
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
        // Camera not available — that's okay, the preview just stays blank
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

  /* ── show hint after 15s on a question ───────────────────────── */

  useEffect(() => {
    setShowHint(false)
    const timeout = setTimeout(() => setShowHint(true), 15000)
    return () => clearTimeout(timeout)
  }, [currentIdx])

  /* ── auto-focus textarea ─────────────────────────────────────── */

  useEffect(() => {
    if (!transitioning && !loading) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [currentIdx, transitioning, loading])

  /* ── handlers ────────────────────────────────────────────────── */

  const submitAnswer = useCallback(() => {
    if (!answer.trim() && !isRecording) return

    const submittedAnswer = answer.trim()
    setAnswers((prev) => [...prev, submittedAnswer])
    setAnswer('')

    if (isLastQuestion) {
      // Cleanup camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      localStorage.setItem(
        'interviewly_answers',
        JSON.stringify([...answers, submittedAnswer])
      )
      navigate('/result')
      return
    }

    // Transition to next question
    setTransitioning(true)
    setTimeout(() => {
      setCurrentIdx((i) => i + 1)
      setTransitioning(false)
    }, 500)
  }, [answer, isRecording, isLastQuestion, answers, navigate])

  function toggleMic() {
    setIsRecording((r) => !r)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitAnswer()
    }
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

  /* ── loading state ──────────────────────────────────────────── */

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

  if (!question) return null

  /* ── render ──────────────────────────────────────────────────── */

  return (
    <div className="fixed inset-0 z-[100] bg-surface flex flex-col">
      {/* ── Top bar: thin progress + info ──────────────────────── */}
      <div className="shrink-0">
        {/* Ultra-thin progress bar */}
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

        {/* Minimal info bar */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-border/60 bg-surface-raised/50 backdrop-blur-sm">
          {/* Left: role + difficulty */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-foreground-muted">
              {role}
            </span>
            <span className="h-3.5 w-px bg-border" />
            <span className="text-xs text-foreground-subtle">
              {difficulty}
            </span>
          </div>

          {/* Center: question step dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {questions.map((q, idx) => {
              const dotMeta = QUESTION_TYPE_META[q.type]
              return (
                <button
                  key={idx}
                  className={[
                    'h-2 rounded-full transition-all duration-300 cursor-default',
                    idx === currentIdx
                      ? 'w-6'
                      : 'w-2',
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

          {/* Right: per-question timer + total elapsed */}
          <div className="flex items-center gap-3">
            {/* Per-question countdown */}
            <div
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono tabular-nums transition-colors duration-300',
                timerUrgency === 'critical'
                  ? 'bg-error/10 text-error'
                  : timerUrgency === 'warning'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-accent-light text-accent',
              ].join(' ')}
            >
              <Clock className="h-3 w-3" />
              {formatTime(questionTime)}
            </div>

            {/* Total elapsed — very subtle */}
            <span className="text-[11px] text-foreground-subtle font-mono tabular-nums hidden md:block">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main content area ──────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* ── Webcam PiP — top right ──────────────────────────── */}
        <div
          className={[
            'absolute top-4 right-4 z-10 transition-all duration-300',
            camVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none',
          ].join(' ')}
        >
          <div className="relative group">
            <div className="w-[130px] aspect-[4/3] rounded-[var(--radius-md)] overflow-hidden bg-[#0a0a0a] border border-border/60 shadow-lg shadow-black/10">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* REC indicator */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-soft" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                REC
              </div>
            </div>
            {/* Toggle cam visibility */}
            <button
              onClick={() => setCamVisible(false)}
              className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-surface-raised border border-border shadow-sm
                         flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer
                         hover:bg-accent-light hover:text-accent text-foreground-subtle"
              title="Hide preview"
            >
              <VideoOff className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Cam restore button — shown when hidden */}
        {!camVisible && (
          <button
            onClick={() => setCamVisible(true)}
            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-[var(--radius-sm)] bg-surface-raised border border-border shadow-sm
                       flex items-center justify-center text-foreground-subtle hover:text-accent hover:bg-accent-light
                       transition-all duration-200 cursor-pointer animate-fade-in"
            title="Show camera preview"
          >
            <Video className="h-4 w-4" />
          </button>
        )}

        {/* ── Centered question area ──────────────────────────── */}
        <div className="h-full flex items-center justify-center px-6 py-16">
          <div
            className={[
              'max-w-2xl w-full space-y-5 transition-all duration-500',
              transitioning
                ? 'opacity-0 translate-y-6 scale-[0.97]'
                : 'opacity-100 translate-y-0 scale-100',
            ].join(' ')}
          >
            {/* Question number + type badge + topic */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-accent text-accent-foreground text-xs font-bold shrink-0">
                {currentIdx + 1}
              </span>
              {typeBadge(question.type)}
              <span className="text-[11px] font-semibold uppercase tracking-widest text-accent bg-accent-light px-2.5 py-1 rounded-full">
                {question.topic}
              </span>
              <span className="text-[11px] text-foreground-subtle sm:hidden tabular-nums">
                {currentIdx + 1} / {totalQuestions}
              </span>
            </div>

            {/* Question card */}
            <div className="border border-border rounded-[var(--radius-lg)] bg-surface-raised p-8 md:p-10 shadow-sm space-y-5">
              <p className="text-lg md:text-xl leading-relaxed text-foreground font-[420]">
                {renderCode(question.text)}
              </p>

              {/* Starter code block for coding questions */}
              {question.type === 'coding' && question.starterCode && (
                <div className="rounded-[var(--radius-md)] bg-[#0a0a0a] p-4 overflow-x-auto">
                  <pre className="text-sm text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap">
                    {question.starterCode}
                  </pre>
                </div>
              )}

              {/* Type-specific hint */}
              <div className="flex items-center gap-2 pt-1">
                {question.type === 'coding' && (
                  <p className="text-[11px] text-foreground-subtle">
                    💡 Write your solution below or explain your approach step by step.
                  </p>
                )}
                {question.type === 'oral' && (
                  <p className="text-[11px] text-foreground-subtle">
                    🎙️ Speak naturally — articulate your thought process clearly.
                  </p>
                )}
                {question.type === 'conceptual' && (
                  <p className="text-[11px] text-foreground-subtle">
                    💡 Explain the concept clearly, use examples where helpful.
                  </p>
                )}
              </div>
            </div>

            {/* Skill + time info row */}
            <div className="flex items-center justify-between px-1">
              {/* Skill tag */}
              <span className="text-[11px] text-foreground-subtle">
                Skill: <span className="font-medium text-foreground-muted">{question.skill}</span>
              </span>

              {/* Per-question time bar */}
              <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                <div className="flex-1 h-1 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className={[
                      'h-full rounded-full transition-all duration-1000 ease-linear',
                      timerUrgency === 'critical'
                        ? 'bg-error'
                        : timerUrgency === 'warning'
                          ? 'bg-warning'
                          : 'bg-accent/40',
                    ].join(' ')}
                    style={{ width: `${questionTimerFraction * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Hint nudge */}
            <div
              className={[
                'flex items-center gap-2 text-xs text-foreground-subtle transition-all duration-500',
                showHint
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2 pointer-events-none',
              ].join(' ')}
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              Take your time — think through your answer, then type or speak.
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom input dock ──────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/60 bg-surface-raised/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-end gap-3 border border-border rounded-[var(--radius-md)] bg-surface-raised p-3 focus-within:border-accent/40 transition-colors duration-200 shadow-sm">
            {/* Mic toggle */}
            <button
              onClick={toggleMic}
              className={[
                'h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer',
                isRecording
                  ? 'bg-error/10 text-error animate-pulse-soft'
                  : 'text-foreground-muted hover:bg-accent-light hover:text-accent',
              ].join(' ')}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? 'Listening… speak your answer'
                  : question.type === 'coding'
                    ? 'Write your code or explain your approach…'
                    : 'Type your answer… (Shift+Enter for new line)'
              }
              rows={1}
              className={[
                'flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-subtle outline-none resize-none leading-relaxed min-h-[36px] max-h-[120px] py-1.5',
                question.type === 'coding' ? 'font-mono' : '',
              ].join(' ')}
              style={{
                height: 'auto',
                overflow: answer.split('\n').length > 4 ? 'auto' : 'hidden',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />

            {/* Submit */}
            <Button
              id="interview-submit"
              variant="primary"
              size="sm"
              onClick={submitAnswer}
              disabled={!answer.trim() && !isRecording}
              className="shrink-0"
            >
              {isLastQuestion ? (
                <>
                  Finish <ChevronRight className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Send
                </>
              )}
            </Button>
          </div>

          {/* Recording indicator bar */}
          {isRecording && (
            <div className="mt-2 flex items-center gap-2 text-xs text-error animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-error animate-pulse-soft" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
              </span>
              Recording in progress…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
