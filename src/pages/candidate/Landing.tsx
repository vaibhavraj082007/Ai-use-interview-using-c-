import { NavLink } from 'react-router-dom'
import { FileUp, Mic, BarChart3, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const steps = [
  {
    icon: FileUp,
    label: 'Upload your CV',
    desc: 'Drop your resume and we tailor every question to you.',
  },
  {
    icon: Mic,
    label: 'AI interview',
    desc: 'Conversational, real-time session with adaptive follow-ups.',
  },
  {
    icon: BarChart3,
    label: 'Get your score',
    desc: 'Detailed competency breakdown with actionable feedback.',
  },
]

export default function Landing() {
  return (
    <div className="max-w-3xl mx-auto px-6">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 text-center space-y-6 animate-fade-in">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
          Practice interviews
          <br />
          <span className="text-accent">that actually help</span>
        </h1>

        <p className="text-lg text-foreground-muted leading-relaxed max-w-md mx-auto">
          AI-generated questions matched to your resume.
          <br className="hidden sm:block" />
          Honest feedback in minutes, not days.
        </p>

        <div className="pt-2">
          <NavLink to="/register">
            <Button variant="primary" size="lg" id="landing-start-interview">
              Start interview <ArrowRight className="h-4 w-4" />
            </Button>
          </NavLink>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="pb-28 animate-slide-up">
        <p className="text-xs font-semibold uppercase tracking-widest text-foreground-subtle text-center mb-10">
          How it works
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {steps.map((s, i) => (
            <div key={s.label} className="space-y-3">
              {/* Step number + icon */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-foreground-subtle tracking-widest">
                  0{i + 1}
                </span>
                <s.icon
                  className="h-6 w-6 text-accent"
                  strokeWidth={1.5}
                />
              </div>

              <h3 className="text-sm font-semibold text-foreground">
                {s.label}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
