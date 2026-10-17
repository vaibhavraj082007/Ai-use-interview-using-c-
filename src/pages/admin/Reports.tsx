import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Reports() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        <p className="text-foreground-muted mt-1">
          Interview analytics and performance trends.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>
              Average scores across all interviews this month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { range: '90 – 100', pct: 15 },
              { range: '70 – 89', pct: 45 },
              { range: '50 – 69', pct: 28 },
              { range: 'Below 50', pct: 12 },
            ].map((r) => (
              <div key={r.range} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-muted">{r.range}</span>
                  <span className="font-medium text-foreground">{r.pct}%</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Competencies</CardTitle>
            <CardDescription>
              Strongest areas across all candidates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { skill: 'Communication', avg: 84 },
              { skill: 'Problem Solving', avg: 78 },
              { skill: 'Technical Knowledge', avg: 75 },
              { skill: 'System Design', avg: 71 },
              { skill: 'Code Quality', avg: 68 },
            ].map((s, i) => (
              <div
                key={s.skill}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground-subtle w-4">{i + 1}</span>
                  <span className="text-foreground">{s.skill}</span>
                </div>
                <Badge variant={s.avg >= 75 ? 'success' : 'outline'} size="sm">
                  {s.avg}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
