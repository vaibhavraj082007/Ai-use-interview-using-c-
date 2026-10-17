import { Users, FileText, TrendingUp, Clock } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'

const stats = [
  { label: 'Total Candidates', value: '1,284', icon: Users, change: '+12%' },
  { label: 'Interviews Today', value: '47', icon: FileText, change: '+8%' },
  { label: 'Avg. Score', value: '76%', icon: TrendingUp, change: '+3%' },
  { label: 'Pending Reviews', value: '23', icon: Clock, change: '-5%' },
]

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-foreground-muted mt-1">
          Overview of interview activity and key metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-foreground-muted">
                    {s.label}
                  </span>
                  <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-accent-light flex items-center justify-center">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-foreground-subtle mt-1">
                  <span
                    className={
                      s.change.startsWith('+')
                        ? 'text-success'
                        : 'text-error'
                    }
                  >
                    {s.change}
                  </span>{' '}
                  from last week
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Placeholder recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              'Jane Doe completed Frontend Interview — 85%',
              'John Smith started Backend Interview',
              'Alice Chen uploaded a new CV',
              'Bob Wilson completed Full-Stack Interview — 72%',
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-foreground-muted"
              >
                <div className="h-2 w-2 rounded-full bg-accent shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
