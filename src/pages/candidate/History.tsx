import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { History as HistoryIcon, ChevronRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMyReports, type MyReportListItem } from '@/lib/api'

function dateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dateHeading(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000)
  if (dateKey(d.getTime()) === dateKey(today.getTime())) return 'Today'
  if (dateKey(d.getTime()) === dateKey(yesterday.getTime())) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function timeHeading(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Group the (newest-first) list under date headings. */
function groupByDate(items: MyReportListItem[]): Array<{
  date: string
  ts: number
  items: MyReportListItem[]
}> {
  const groups: Array<{
    date: string
    ts: number
    items: MyReportListItem[]
  }> = []
  for (const item of items) {
    const key = dateKey(item.gradedAt)
    const last = groups[groups.length - 1]
    if (last && last.date === key) last.items.push(item)
    else groups.push({ date: key, ts: item.gradedAt, items: [item] })
  }
  return groups
}

export default function History() {
  const [reports, setReports] = useState<MyReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await getMyReports()
        if (mounted) setReports(res.reports)
      } catch (e) {
        if (mounted)
          setError(e instanceof Error ? e.message : 'Failed to load history')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const groups = groupByDate(reports)

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HistoryIcon className="h-6 w-6 text-accent" />
            Report History
          </h1>
          <p className="text-sm text-foreground-muted">
            Every interview you have completed, newest first — open any report
            to view or download it as a PDF.
          </p>
        </div>
      </div>

      {loading && (
        <p className="py-10 text-center text-sm text-foreground-muted">
          Loading your history…
        </p>
      )}

      {error && (
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-error">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="py-12 text-center space-y-3 border border-border rounded-[var(--radius-lg)] bg-surface-raised">
          <FileText className="h-8 w-8 mx-auto text-foreground-subtle" />
          <p className="text-sm text-foreground-muted">
            No reports yet — completed interviews will be saved here by date
            and time.
          </p>
          <NavLink to="/setup">
            <Button variant="primary">Start Your First Interview</Button>
          </NavLink>
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.date} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground-subtle border-b border-border pb-2">
                {dateHeading(group.ts)}
              </h2>
              <ul className="space-y-2">
                {group.items.map((r) => (
                  <li key={r.id}>
                    <NavLink
                      to={`/history/${r.id}`}
                      className="flex items-center gap-4 px-4 py-3 border border-border rounded-[var(--radius-md)] bg-surface-raised hover:border-accent/60 hover:bg-accent-light/40 transition-colors group"
                    >
                      <span className="text-sm font-mono tabular-nums text-foreground-muted w-20 shrink-0">
                        {timeHeading(r.gradedAt)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.role}
                        </p>
                        <p className="text-[11px] text-foreground-subtle">
                          {r.answered != null && r.total != null
                            ? `${r.answered}/${r.total} answered`
                            : 'Interview report'}
                        </p>
                      </div>
                      {r.overall != null && (
                        <span className="shrink-0 px-2 py-0.5 text-xs font-semibold border border-foreground/70 text-foreground">
                          {r.overall}%
                          {r.band ? ` ${r.band.replace('_', ' ')}` : ''}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-foreground-subtle group-hover:text-accent transition-colors" />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
