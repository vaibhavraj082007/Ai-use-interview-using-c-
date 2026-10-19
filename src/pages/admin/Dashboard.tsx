import { useEffect, useState } from 'react'
import { Users, FileText, TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getAdminStats } from '@/lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState({ totalCandidates: 0, interviewsToday: 0, avgScore: 0, pendingReviews: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await getAdminStats()
        if (!mounted) return
        setStats(res.stats)
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load stats')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const cards = [
    { label: 'Total Candidates', value: String(stats.totalCandidates), icon: Users, change: '' },
    { label: 'Interviews Today', value: String(stats.interviewsToday), icon: FileText, change: '' },
    { label: 'Avg. Score', value: `${stats.avgScore}%`, icon: TrendingUp, change: '' },
    { label: 'Pending Reviews', value: String(stats.pendingReviews), icon: Clock, change: '' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-foreground-muted mt-1">Overview of interview activity and key metrics.</p>
      </div>
      {error && <div className="text-sm text-error">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-foreground-muted">{s.label}</span>
                  <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-accent-light flex items-center justify-center">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? '—' : s.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
