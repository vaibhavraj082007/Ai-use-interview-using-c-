import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Sparkles, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/upload-cv', label: 'Upload CV' },
  { to: '/setup', label: 'Setup' },
  { to: '/interview', label: 'Interview' },
  { to: '/result', label: 'Result' },
]

export default function CandidateLayout() {
  const location = useLocation()
  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/register'

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-surface-raised/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <Sparkles className="h-5 w-5 text-accent" />
            <span className="font-semibold text-foreground tracking-tight">
              Interviewly
            </span>
          </NavLink>

          {/* Center links — hidden on auth pages */}
          {!isAuthPage && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'px-3 py-1.5 text-sm rounded-[var(--radius-sm)] transition-colors duration-150',
                      isActive
                        ? 'text-accent bg-accent-light font-medium'
                        : 'text-foreground-muted hover:text-foreground hover:bg-accent-light/50'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthPage ? (
              <NavLink
                to={location.pathname === '/login' ? '/register' : '/login'}
                className="text-sm text-accent hover:text-accent-hover font-medium transition-colors duration-150"
              >
                {location.pathname === '/login' ? 'Register' : 'Sign in'}
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/admin"
                  className="text-xs text-foreground-subtle hover:text-foreground-muted px-2 py-1 rounded-[var(--radius-sm)] transition-colors duration-150"
                >
                  Admin
                </NavLink>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                  className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground px-2 py-1.5 rounded-[var(--radius-sm)] transition-colors duration-150 cursor-pointer"
                  title="Profile"
                >
                  <div className="h-7 w-7 rounded-full bg-accent-light flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-accent" />
                  </div>
                </button>
                <button
                  className="text-foreground-subtle hover:text-foreground p-1.5 rounded-[var(--radius-sm)] transition-colors duration-150 cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page content ───────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-foreground-subtle">
          Interviewly — AI-powered technical interviews
        </div>
      </footer>
    </div>
  )
}
