import { Download, RotateCcw } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'

const scores = [
  { label: 'Technical Knowledge', score: 82 },
  { label: 'Problem Solving', score: 74 },
  { label: 'Communication', score: 91 },
  { label: 'Code Quality', score: 68 },
]

export default function Result() {
  const overall = Math.round(
    scores.reduce((a, s) => a + s.score, 0) / scores.length
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Interview Results
          </h1>
          <p className="text-foreground-muted">
            Frontend Interview — Completed Oct 14, 2026
          </p>
        </div>
        <Badge variant="success" size="lg">
          {overall}% Overall
        </Badge>
      </div>

      {/* Score breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {scores.map((s) => (
            <div key={s.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{s.label}</span>
                <span className="font-medium text-foreground">{s.score}%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${s.score}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <NavLink to="/setup">
          <Button variant="primary">
            <RotateCcw className="h-4 w-4" /> Retry Interview
          </Button>
        </NavLink>
        <Button variant="secondary">
          <Download className="h-4 w-4" /> Download Report
        </Button>
      </div>
    </div>
  )
}
