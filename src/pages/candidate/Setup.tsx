import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, FileText, ArrowRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/* ── simulated skill detection per role ────────────────────────── */

const SKILL_MAP: Record<string, string[]> = {
  Frontend: ['React', 'TypeScript', 'CSS', 'HTML', 'Accessibility', 'Webpack', 'Testing'],
  Backend: ['Node.js', 'REST APIs', 'SQL', 'Auth', 'Caching', 'Docker', 'Testing'],
  Data: ['Python', 'SQL', 'Pandas', 'Statistics', 'ML Basics', 'Data Viz', 'ETL'],
  'Full Stack': ['React', 'Node.js', 'TypeScript', 'SQL', 'REST APIs', 'Docker', 'CI/CD'],
}

const QUESTION_COUNT: Record<string, number> = {
  Easy: 8,
  Medium: 12,
  Hard: 15,
}

type Phase = 'reviewing' | 'ready' | 'deferred'

/* ── component ─────────────────────────────────────────────────── */

export default function Setup() {
  const navigate = useNavigate()

  // Read what UploadCV persisted
  const stored = localStorage.getItem('interviewly_cv')
  const cvData = stored
    ? (JSON.parse(stored) as {
        fileName: string
        fileSize: number
        role: string
        difficulty: string
      })
    : null

  const role = cvData?.role ?? 'Frontend'
  const difficulty = cvData?.difficulty ?? 'Medium'
  const fileName = cvData?.fileName ?? 'resume.pdf'
  const skills = SKILL_MAP[role] ?? SKILL_MAP['Frontend']
  const questionCount = QUESTION_COUNT[difficulty] ?? 12

  /* ── phase state machine ─────────────────────────────────────── */

  const [phase, setPhase] = useState<Phase>('reviewing')
  const [progress, setProgress] = useState(0)

  // Simulate a 3-second review
  useEffect(() => {
    if (phase !== 'reviewing') return

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          return 100
        }
        return p + 2
      })
    }, 50)

    const timeout = setTimeout(() => {
      setPhase('ready')
    }, 2800)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [phase])

  /* ── handlers ────────────────────────────────────────────────── */

  function handleStart() {
    localStorage.setItem(
      'interviewly_setup',
      JSON.stringify({ role, difficulty, skills, questionCount })
    )
    navigate('/pre-check')
  }

  function handleDefer() {
    localStorage.setItem(
      'interviewly_setup',
      JSON.stringify({ role, difficulty, skills, questionCount, deferred: true })
    )
    setPhase('deferred')
  }

  function handleResume() {
    navigate('/interview')
  }

  /* ── PHASE 1: Reviewing ──────────────────────────────────────── */

  if (phase === 'reviewing') {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center space-y-8 animate-fade-in">
        {/* Pulsing icon */}
        <div className="mx-auto h-16 w-16 rounded-full bg-accent-light flex items-center justify-center animate-pulse-soft">
          <Sparkles className="h-7 w-7 text-accent" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Reviewing your CV
          </h1>
          <p className="text-sm text-foreground-muted">
            Analysing <span className="font-medium text-foreground">{fileName}</span> to
            tailor your interview…
          </p>
        </div>

        {/* Progress bar */}
        <div className="mx-auto max-w-xs">
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-150 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* shimmer sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-progress-sweep" />
            </div>
          </div>
          <p className="mt-2 text-xs text-foreground-subtle tabular-nums">
            {Math.min(progress, 100)}%
          </p>
        </div>
      </div>
    )
  }

  /* ── PHASE 3: Deferred / Resume later ────────────────────────── */

  if (phase === 'deferred') {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center space-y-6 animate-fade-in">
        <div className="mx-auto h-14 w-14 rounded-full bg-accent-light flex items-center justify-center">
          <Clock className="h-6 w-6 text-accent" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Progress saved
          </h1>
          <p className="text-sm text-foreground-muted leading-relaxed max-w-xs mx-auto">
            Your session is ready whenever you are. Come back any time to pick
            up where you left off.
          </p>
        </div>

        <Button
          id="setup-resume"
          variant="primary"
          size="lg"
          onClick={handleResume}
        >
          Resume interview <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  /* ── PHASE 2: Summary + Ready to begin ───────────────────────── */

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Interview Setup
        </h1>
        <p className="text-foreground-muted">
          We've analysed your CV — here's what we found.
        </p>
      </div>

      {/* Summary card */}
      <div className="border border-border rounded-[var(--radius-md)] bg-surface-raised divide-y divide-border animate-slide-up">
        {/* File row */}
        <div className="p-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-[var(--radius-sm)] bg-accent-light flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {fileName}
            </p>
            <p className="text-xs text-foreground-subtle">
              Uploaded resume
            </p>
          </div>
        </div>

        {/* Detected skills */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground-subtle">
            Detected skills
          </p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="default" size="md">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Role + questions row */}
        <div className="p-5 flex items-center gap-6">
          <div>
            <p className="text-xs text-foreground-subtle">Role</p>
            <p className="text-sm font-medium text-foreground">{role}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-xs text-foreground-subtle">Difficulty</p>
            <p className="text-sm font-medium text-foreground">{difficulty}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-xs text-foreground-subtle">Questions</p>
            <p className="text-sm font-medium text-foreground">
              {questionCount}
            </p>
          </div>
        </div>
      </div>

      {/* Ready to begin prompt */}
      <div className="border border-border rounded-[var(--radius-md)] bg-surface-raised p-6 text-center space-y-4 animate-slide-up">
        <p className="text-lg font-semibold text-foreground">
          Ready to begin?
        </p>
        <p className="text-sm text-foreground-muted max-w-sm mx-auto">
          The interview will take roughly {Math.round(questionCount * 1.5)} minutes.
          You can't pause once you start.
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button
            id="setup-start"
            variant="primary"
            size="lg"
            onClick={handleStart}
          >
            <Sparkles className="h-4 w-4" />
            Start interview
          </Button>
          <Button
            id="setup-defer"
            variant="secondary"
            size="lg"
            onClick={handleDefer}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
