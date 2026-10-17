import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

const candidates = [
  { name: 'Jane Doe', email: 'jane@example.com', score: 85, status: 'Completed' as const },
  { name: 'John Smith', email: 'john@example.com', score: 0, status: 'In Progress' as const },
  { name: 'Alice Chen', email: 'alice@example.com', score: 72, status: 'Completed' as const },
  { name: 'Bob Wilson', email: 'bob@example.com', score: 0, status: 'Pending' as const },
  { name: 'Eve Martinez', email: 'eve@example.com', score: 91, status: 'Completed' as const },
]

const statusVariant = {
  Completed: 'success' as const,
  'In Progress': 'warning' as const,
  Pending: 'outline' as const,
}

export default function Candidates() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Candidates</h2>
          <p className="text-foreground-muted mt-1">
            Manage and review interview candidates.
          </p>
        </div>
        <Button variant="primary" size="sm">
          + Invite Candidate
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
        <input
          type="text"
          placeholder="Search candidates…"
          className="w-full h-10 pl-9 pr-4 text-sm bg-surface-raised border border-border rounded-[var(--radius-md)] placeholder:text-foreground-subtle outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors duration-150"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-3 font-medium text-foreground-muted">Name</th>
                <th className="px-6 py-3 font-medium text-foreground-muted">Email</th>
                <th className="px-6 py-3 font-medium text-foreground-muted">Score</th>
                <th className="px-6 py-3 font-medium text-foreground-muted">Status</th>
                <th className="px-6 py-3 font-medium text-foreground-muted" />
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr
                  key={c.email}
                  className="border-b border-border last:border-0 hover:bg-accent-light/30 transition-colors duration-100"
                >
                  <td className="px-6 py-4 font-medium text-foreground">
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-foreground-muted">{c.email}</td>
                  <td className="px-6 py-4 text-foreground">
                    {c.score > 0 ? `${c.score}%` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant[c.status]} size="sm">
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
