import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAdminReports, type AdminReportListItem } from '@/lib/api'

export default function Reports() {
  const [reports, setReports] = useState<AdminReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await getAdminReports()
        if (!mounted) return
        setReports(res.reports)
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load reports')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        <p className="text-foreground-muted mt-1">Interview results and analytics.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>All Reports</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading && <div className="px-6 py-4 text-sm text-foreground-muted">Loading...</div>}
          {error && <div className="px-6 py-4 text-sm text-error">{error}</div>}
          {!loading && !error && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 font-medium text-foreground-muted">Candidate</th>
                  <th className="px-6 py-3 font-medium text-foreground-muted">Email</th>
                  <th className="px-6 py-3 font-medium text-foreground-muted">Role</th>
                  <th className="px-6 py-3 font-medium text-foreground-muted">Score</th>
                  <th className="px-6 py-3 font-medium text-foreground-muted">Graded At</th>
                  <th className="px-6 py-3 font-medium text-foreground-muted" />
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent-light/30">
                    <td className="px-6 py-4 font-medium text-foreground">{r.candidateName}</td>
                    <td className="px-6 py-4 text-foreground-muted">{r.candidateEmail || '—'}</td>
                    <td className="px-6 py-4 text-foreground-muted">{r.role}</td>
                    <td className="px-6 py-4">{r.overall != null ? `${r.overall}%` : '—'}</td>
                    <td className="px-6 py-4 text-foreground-muted">{new Date(r.gradedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <NavLink to={`/admin/reports/${r.id}`}><Button variant="ghost" size="sm">View</Button></NavLink>
                    </td>
                  </tr>
                ))}
                {reports.length===0 && (
                  <tr><td colSpan={6} className="px-6 py-4 text-foreground-muted">No reports found.</td></tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
