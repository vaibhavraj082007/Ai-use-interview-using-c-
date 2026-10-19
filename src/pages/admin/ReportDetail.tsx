import { useEffect, useRef, useState } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { Download, RotateCcw } from 'lucide-react'
import { exportElementAsPdf } from '@/lib/pdf'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminReport, type AdminReportDetail } from '@/lib/api'

const TYPE_LABEL: Record<string, string> = { coding: 'Coding', conceptual: 'Conceptual', oral: 'Oral' }
const BAND_COLORS: Record<string, string> = { excellent: 'success', strong: 'default', developing: 'warning', needs_work: 'error' }

function formatDate(ts: number | null): string {
  if (!ts) return 'Recently'
  try { return new Date(ts).toLocaleString() } catch { return 'Recently' }
}

export default function ReportDetail() {
  const params = useParams<{ id: string }>()
  const id = params.id || ''
  const reportRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<AdminReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    async function load() {
      try {
        const res = await getAdminReport(id)
        if (!mounted) return
        setData(res.report)
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load report')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  const exportPdf = async () => {
    if (!reportRef.current) return
    await exportElementAsPdf(
      reportRef.current,
      `interviewly-report-${String(id)}-${Date.now()}.pdf`
    )
  }

  if (loading) return <div className="py-12 text-center text-foreground-muted">Loading...</div>
  if (error) return <div className="py-12 text-center text-error">{error}</div>
  if (!data || !data.result) return <div className="py-12 text-center text-foreground-muted">Report not found</div>

  const { result, events } = data
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interview Report</h1>
          <p className="text-sm text-foreground-muted">{data.role} — {formatDate(data.gradedAt)}</p>
          <p className="text-sm text-foreground-muted">Candidate: {data.candidateName || 'Candidate'} {data.candidateEmail ? `(${data.candidateEmail})` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={exportPdf}><Download className="h-4 w-4" /> Download PDF</Button>
          <NavLink to="/admin/reports"><Button variant="secondary"><RotateCcw className="h-4 w-4" /> Back to Reports</Button></NavLink>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-white text-black p-6 rounded-lg border border-gray-200 print:bg-white print:text-black">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Interviewly — Candidate Report</h2>
            <p className="text-sm opacity-70">{data.role} | Graded: {formatDate(data.gradedAt)}</p>
          </div>
          <Badge variant={BAND_COLORS[result.band] as any} size="lg">{result.overall}% {result.band}</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle>Score Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {result.skills.map((s: any) => (
              <div key={s.skill} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm"><span>{s.skill}</span><span className="font-medium">{s.score}%</span></div>
                <div className="h-2 bg-gray-200 dark:bg-border rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${s.score}%` }} /></div>
                <p className="text-[11px] opacity-70">{s.questions} questions</p>
              </div>
            ))}
            {result.types.map((t: any) => (
              <div key={t.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm"><span>{TYPE_LABEL[t.type] ?? t.type}</span><span className="font-medium">{t.score}%</span></div>
                <div className="h-2 bg-gray-200 dark:bg-border rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${t.score}%` }} /></div>
                <p className="text-[11px] opacity-70">{t.questions} questions</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Speaking Performance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(result.speech ?? []).length === 0 ? (
              <p className="text-sm opacity-70">No spoken answers were recorded for this interview.</p>
            ) : (
              (result.speech ?? []).map((m: any) => {
                const ev = result.evaluations.find((e: any) => e.questionId === m.questionId)
                return (
                  <div key={m.questionId} className="space-y-1.5 border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium">{m.text || m.questionId}</span>
                      {ev && (
                        <Badge className="bg-success-soft text-success shrink-0" size="sm">{ev.score}%</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs opacity-80">
                      <span>Spoken: {Math.floor((m.spokenSeconds ?? 0) / 60)}:{String((m.spokenSeconds ?? 0) % 60).padStart(2, '0')}</span>
                      <span>Words: {m.wordCount ?? 0}</span>
                      <span>Confidence: {m.confidence === null || m.confidence === undefined ? '—' : `${Math.round(m.confidence * 100)}%`}</span>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {result.proctor && (
          <Card>
            <CardHeader><CardTitle>Camera Confidence</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Confidence (out of 100%)</span>
                <span className="font-semibold">{result.proctor.confidence}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${result.proctor.confidence}%` }} />
              </div>
              <p className="text-[11px] opacity-70">
                Session: {result.proctor.sessionSeconds}s • Flagged: {result.proctor.flaggedSeconds}s • Events: {result.proctor.flags}
              </p>
              {result.proctor.byType && Object.keys(result.proctor.byType).length > 0 && (
                <p className="text-[11px] opacity-70">
                  By type:{' '}
                  {Object.entries(result.proctor.byType)
                    .map(([k, v]) => `${k.replace('_', ' ')} ${v}s`)
                    .join(' • ')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Per-question Feedback</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {result.evaluations.map((e: any, idx: number) => (
              <div key={e.questionId} className="space-y-2 border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Q{idx + 1} — {e.questionId}</span>
                  <Badge className={e.band === 'missing' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'} size="sm">
                    {e.band === 'missing' ? 'No answer' : `${e.score}%`}
                  </Badge>
                </div>
                <p className="text-sm opacity-80">{e.feedback}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Flagged Events Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm opacity-70">No flagged proctoring events were recorded.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {events.map((ev: any) => (
                  <li key={ev.id} className="flex justify-between border-b border-gray-100 pb-1 last:border-0">
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
