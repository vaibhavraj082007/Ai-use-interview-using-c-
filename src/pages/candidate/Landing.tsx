import { NavLink } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Brain,
  Camera,
  Clock,
  FileUp,
  LayoutDashboard,
  Mic,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'

/* ── Content ──────────────────────────────────────────────────── */

const CURRENT_YEAR = new Date().getFullYear()

const steps = [
  {
    icon: FileUp,
    label: 'Upload your CV',
    desc: 'Drop your resume and we tailor every question to your experience.',
  },
  {
    icon: Settings2,
    label: 'Configure the session',
    desc: 'Pick your role, skills, and difficulty, then run a quick device check.',
  },
  {
    icon: Mic,
    label: 'Take the interview',
    desc: 'Answer timed questions by text or voice in a realistic session.',
  },
  {
    icon: BarChart3,
    label: 'Review your report',
    desc: 'Get a competency breakdown with clear, actionable feedback.',
  },
]

const features = [
  {
    icon: Brain,
    title: 'Tailored questions',
    desc: 'Generated from your CV, target role, and skill level — never generic.',
  },
  {
    icon: Clock,
    title: 'Timed sessions',
    desc: 'Realistic per-question countdowns keep you sharp under pressure.',
  },
  {
    icon: Mic,
    title: 'Text or voice',
    desc: 'Answer however you are most comfortable, with live transcription.',
  },
  {
    icon: BarChart3,
    title: 'Instant scoring',
    desc: 'A detailed competency breakdown the moment you finish.',
  },
  {
    icon: Camera,
    title: 'Device pre-check',
    desc: 'Camera, microphone, and network tested before you ever begin.',
  },
  {
    icon: LayoutDashboard,
    title: 'Recruiter insights',
    desc: 'Admins track candidates and reports from a single dashboard.',
  },
]

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', to: '#how-it-works' },
      { label: 'Features', to: '#features' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
    ],
  },
]

/* ── Page ─────────────────────────────────────────────────────── */

export default function Landing() {
  const { user } = useAuth()

  const primaryTo = user
    ? user.role === 'admin'
      ? '/admin'
      : '/upload-cv'
    : '/register'

  return (
    <div className="overflow-hidden">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative">
        {/* Decorative accent glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-6rem] h-[26rem] w-[42rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center animate-fade-in">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-foreground-muted">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-powered interview practice
          </span>

          <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
            Practice interviews
            <br />
            <span className="text-accent">that actually help</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-foreground-muted leading-relaxed max-w-xl mx-auto">
            Upload your CV, sit a realistic AI interview tailored to your
            experience, and get a detailed competency report in minutes.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <NavLink to={primaryTo} className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                {user ? 'Continue' : 'Start interview'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </NavLink>
            {!user && (
              <NavLink to="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </NavLink>
            )}
          </div>

          <p className="mt-5 text-xs text-foreground-subtle">
            Free to try · No credit card · Webcam-ready
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-t border-border bg-surface-raised/40"
      >
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-24 animate-slide-up">
          <div className="text-center max-w-lg mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              How it works
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              From resume to results in four steps
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div
                key={s.label}
                className="relative text-center sm:text-left animate-slide-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-light">
                    <s.icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground sm:mt-4">
                    {s.label}
                  </h3>
                </div>
                <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
          <div className="text-center max-w-lg mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Features
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Everything you need to prepare
            </h2>
            <p className="mt-4 text-sm text-foreground-muted leading-relaxed">
              A complete practice loop — from device checks to a scored,
              shareable report.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Card
                key={f.title}
                className="hover:shadow-md hover:border-accent/30 animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-accent-light">
                    <f.icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface-raised/40">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Ready for your next interview?
          </h2>
          <p className="mt-4 text-sm text-foreground-muted">
            Set up in under a minute. No credit card required.
          </p>
          <div className="mt-8">
            <NavLink to={primaryTo}>
              <Button variant="primary" size="lg">
                {user ? 'Continue' : 'Start your interview'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </NavLink>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            {/* Brand */}
            <div className="max-w-xs">
              <NavLink to="/" className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="font-semibold text-foreground tracking-tight">
                  Interviewly
                </span>
              </NavLink>
              <p className="mt-4 text-sm text-foreground-muted leading-relaxed">
                AI-powered technical interview practice for candidates and
                hiring teams.
              </p>
            </div>

            {/* Link columns */}
            <div className="flex gap-16">
              {footerLinks.map((col) => (
                <div key={col.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground-subtle">
                    {col.title}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {link.to.startsWith('#') ? (
                          <a
                            href={link.to}
                            className="text-sm text-foreground-muted hover:text-accent transition-colors duration-150"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <NavLink
                            to={link.to}
                            className="text-sm text-foreground-muted hover:text-accent transition-colors duration-150"
                          >
                            {link.label}
                          </NavLink>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-6 text-xs text-foreground-subtle">
            © {CURRENT_YEAR} Interviewly. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
