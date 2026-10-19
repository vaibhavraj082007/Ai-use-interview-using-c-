import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search } from 'lucide-react'
import { getAdminUsers, type AdminUser } from '@/lib/api'

export default function Candidates() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await getAdminUsers()
        if (!mounted) return
        setUsers(res.users.filter((u) => u.role !== 'admin'))
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load candidates')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Candidates</h2>
          <p className="text-foreground-muted mt-1">Manage and review interview candidates.</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
        <input
          type="text"
          placeholder="Search candidates…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search candidates"
          className="w-full h-10 pl-9 pr-4 text-sm bg-surface-raised border border-border rounded-[var(--radius-md)] placeholder:text-foreground-subtle outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors duration-150"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && <div className="px-6 py-4 text-sm text-foreground-muted" role="status">Loading candidates…</div>}
          {error && <div className="px-6 py-4 text-sm text-error" role="alert">{error}</div>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 font-medium text-foreground-muted">Name</th>
                    <th className="px-6 py-3 font-medium text-foreground-muted">Email</th>
                    <th className="px-6 py-3 font-medium text-foreground-muted">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent-light/30 transition-colors duration-100">
                      <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                      <td className="px-6 py-4 text-foreground-muted">{c.email}</td>
                      <td className="px-6 py-4"><Badge variant="outline" size="sm">{c.role}</Badge></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-4 text-foreground-muted">No candidates found.</td></tr>
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
