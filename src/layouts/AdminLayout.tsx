import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sidebarLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/candidates', label: 'Candidates', icon: Users, end: false },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
]

export default function AdminLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface flex">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-surface-raised border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-14 px-5 flex items-center gap-2 border-b border-border shrink-0">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-semibold text-foreground tracking-tight">
            Interviewly
          </span>
          <span className="ml-auto text-[10px] font-medium text-accent bg-accent-light px-1.5 py-0.5 rounded-[var(--radius-sm)]">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 text-sm rounded-[var(--radius-md)] transition-colors duration-150',
                    isActive
                      ? 'text-accent bg-accent-light font-medium'
                      : 'text-foreground-muted hover:text-foreground hover:bg-accent-light/50'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Back to app */}
        <div className="px-3 py-4 border-t border-border">
          <NavLink
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground rounded-[var(--radius-md)] transition-colors duration-150"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to App
          </NavLink>
        </div>
      </aside>

      {/* ── Main Area ──────────────────────────────────────── */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-surface-raised/80 backdrop-blur-md border-b border-border px-8 flex items-center justify-between shrink-0">
          <h1 className="text-sm font-medium text-foreground">
            {sidebarLinks.find(
              (l) =>
                (l.end && location.pathname === l.to) ||
                (!l.end && location.pathname.startsWith(l.to))
            )?.label ?? 'Admin'}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground-subtle">Admin User</span>
            <div className="h-7 w-7 rounded-full bg-accent-light flex items-center justify-center">
              <span className="text-xs font-semibold text-accent">A</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
