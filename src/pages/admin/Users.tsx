import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAdminUsers, type AdminUser } from '@/lib/api'

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await getAdminUsers()
        if (!mounted) return
        setUsers(res.users)
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load users')
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
        <h2 className="text-2xl font-bold text-foreground">Users</h2>
        <p className="text-foreground-muted mt-1">Manage users and roles.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="px-6 py-4 text-sm text-foreground-muted">Loading...</div>}
          {error && <div className="px-6 py-4 text-sm text-error">{error}</div>}
          {!loading && !error && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 font-medium text-foreground-muted">Name</th>
                  <th className="px-6 py-3 font-medium text-foreground-muted">Email</th>
                  <th className="px-6 py-3 font-medium text-foreground-muted">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent-light/30">
                    <td className="px-6 py-4 font-medium text-foreground">{u.name}</td>
                    <td className="px-6 py-4 text-foreground-muted">{u.email}</td>
                    <td className="px-6 py-4"><Badge variant={u.role==='admin'?'success':'outline'} size="sm">{u.role}</Badge></td>
                  </tr>
                ))}
                {users.length===0 && (
                  <tr><td colSpan={3} className="px-6 py-4 text-foreground-muted">No users found.</td></tr>
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
