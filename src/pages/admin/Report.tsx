import React, { useEffect, useRef, useState } from 'react'
import { Download, Mail, RotateCcw } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { GradingResult } from '@/lib/api'
import { exportElementAsPdf } from '@/lib/pdf'

const TYPE_LABEL: Record<string, string> = {
  coding: 'Coding',
  conceptual: 'Conceptual',
  oral: 'Oral',
}

const BAND_COLORS: Record<string, string> = {
  excellent: 'success',
  strong: 'default',
  developing: 'warning',
  needs_work: 'error',
}

function formatDate(ts: number | null): string {
  if (!ts) return 'Recently'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return 'Recently'
  }
}

interface ProctorEvent {
  id: string
  type: string
  detail: string
  at: number
}

export default function ReportPage() {
  const reportRef = useRef<HTMLDivElement>(null)
  const [result, setResult] = useState<GradingResult | null>(null)
  const [gradedAt, setGradedAt] = useState<number | null>(null)
  const [role, setRole] = useState<string>('Interview')
  const [events, setEvents] = useState<ProctorEvent[]>([])
  const [emailTo, setEmailTo] = useState<string>('')
  const [candidateName, setCandidateName] = useState<string>('Candidate')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<string>('')

  useEffect(() => {
    const rawResult = localStorage.getItem('interviewly_result')
    if (rawResult) {
      try {
        setResult(JSON.parse(rawResult) as GradingResult)
      } catch {
        setResult(null)
      }
    }
    const rawMeta = localStorage.getItem('interviewly_grading_meta')
    if (rawMeta) {
      try {
        const m = JSON.parse(rawMeta) as { gradedAt?: number }
        if (typeof m.gradedAt === 'number') setGradedAt(m.gradedAt)
      } catch {}
    }
    const rawSetup = localStorage.getItem('interviewly_setup')
    if (rawSetup) {
      try {
        const s = JSON.parse(rawSetup) as { role?: string }
        if (s.role) setRole(s.role)
      } catch {}
    }
    const rawPro = localStorage.getItem('interviewly_proctor_events')
    if (rawPro) {
      try {
        setEvents(JSON.parse(rawPro) as ProctorEvent[])
      } catch {}
    }
  }, [])

  const exportPdf = async () => {
    if (!reportRef.current) return
    await exportElementAsPdf(
      reportRef.current,
      `interviewly-report-${Date.now()}.pdf`
    )
  }

  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!result) return
    setSending(true)
    setSendMsg('')
    try {
      const res = await api<{ ok: boolean; sent: boolean; message?: string }>(
        '/api/report/email-report',
        {
          method: 'POST',
          body: {
            to: emailTo,
            candidateName,
            role,
            gradedAt: gradedAt ?? undefined,
            result,
            events,
          },
        }
      )
      if (res.sent) setSendMsg('Email sent successfully.')
      else setSendMsg(res.message ?? 'Email not sent.')
    } catch (err) {
      setSendMsg(err instanceof Error ? err.message : 'Failed to send email.')
    } finally {
      setSending(false)
    }
  }

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-4 animate-fade-in text-center">
        <h1 className="text-2xl font-bold text-foreground">Interview Report</h1>
        <p className="text-foreground-muted">No grading results found.</p>
        <NavLink to="/setup">
          <Button variant="primary">
            <RotateCcw className="h-4 w-4" /> Start New Interview
          </Button>
        </NavLink>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interview Report</h1>
          <p className="text-sm text-foreground-muted">
            {role} — {formatDate(gradedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={exportPdf}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Report (Admin)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendEmail} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-foreground-subtle">Candidate Name</label>
              <input
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                required
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-foreground-subtle">Candidate Email</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                required
              />
            </div>
            <Button type="submit" variant="secondary" disabled={sending}>
              <Mail className="h-4 w-4" /> {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </form>
          {sendMsg && (
            <p className="mt-2 text-xs text-foreground-subtle">{sendMsg}</p>
          )}
        </CardContent>
      </Card>

      <div ref={reportRef} className="space-y-6 bg-white text-black p-6 rounded-lg border border-gray-200 print:bg-white print:text-black">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Interviewly — Candidate Report</h2>
            <p className="text-sm opacity-70">
              {role} | Graded: {formatDate(gradedAt)}
            </p>
            <p className="text-sm opacity-70">Candidate: {candidateName || 'Candidate'}</p>
          </div>
          <Badge variant={BAND_COLORS[result.band] as any} size="lg">
            {result.overall}% {result.band}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.skills.map((s) => (
              <div key={s.skill} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{s.skill}</span>
                  <span className="font-medium">{s.score}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${s.score}%` }}
                  />
                </div>
                <p className="text-[11px] opacity-70">{s.questions} questions</p>
              </div>
            ))}
            {result.types.map((t) => (
              <div key={t.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{TYPE_LABEL[t.type] ?? t.type}</span>
                  <span className="font-medium">{t.score}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${t.score}%` }}
                  />
                </div>
                <p className="text-[11px] opacity-70">{t.questions} questions</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per-question Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.evaluations.map((e, idx) => (
              <div key={e.questionId} className="space-y-2 border-b border-gray-200 dark:border-border/60 pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Q{idx + 1} — {e.questionId}</span>
                  <Badge className={e.band === 'missing' ? 'bg-border/60 text-foreground-subtle' : 'bg-success-soft text-success'} size="sm">
                    {e.band === 'missing' ? 'No answer' : `${e.score}%`}
                  </Badge>
                </div>
                <p className="text-sm opacity-80">{e.feedback}</p>
                {e.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-success">Strengths</p>
                    <ul className="list-disc pl-4 text-xs opacity-80">
                      {e.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {e.improvements.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-warning">Improvements</p>
                    <ul className="list-disc pl-4 text-xs opacity-80">
                      {e.improvements.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flagged Events Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm opacity-70">No flagged proctoring events were recorded.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {events.map((ev) => (
                  <li key={ev.id} className="flex justify-between border-b border-gray-100 dark:border-border/40 pb-1 last:border-0">
                    <span>{ev.type} {ev.detail ? `— ${ev.detail}` : ''}</span>
                    <span className="opacity-70">{new Date(ev.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
