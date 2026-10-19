import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, LogOut, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/components/ui/button'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/upload-cv', label: 'Upload CV' },
  { to: '/setup', label: 'Setup' },
  { to: '/interview', label: 'Interview' },
  { to: '/result', label: 'Result' },
  { to: '/history', label: 'History' },
]

export default function CandidateLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/register'
  const ownsFooter = location.pathname === '/'

  async function handleSignOut() {
    await logout()
    navigate('/login', { replace: true })
  }

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

          {/* Center links — only when signed in */}
          {user && (
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
            <ThemeToggle />

            {user ? (
              <>
                {user.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    className="inline-flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-accent px-2 py-1 rounded-[var(--radius-sm)] transition-colors duration-150"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin
                  </NavLink>
                )}
                <div className="w-px h-5 bg-border mx-1" />
                <div
                  className="flex items-center gap-2"
                  title={`${user.name} · ${user.role}`}
                >
                  <div className="h-7 w-7 rounded-full bg-accent-light flex items-center justify-center">
                    <span className="text-xs font-semibold text-accent">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm text-foreground-muted max-w-[10rem] truncate">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-foreground-subtle hover:text-foreground p-1.5 rounded-[var(--radius-sm)] transition-colors duration-150 cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              !isAuthPage && (
                <div className="flex items-center gap-2">
                  <NavLink
                    to="/login"
                    className="text-sm text-foreground-muted hover:text-foreground font-medium transition-colors duration-150 px-2"
                  >
                    Sign in
                  </NavLink>
                  <NavLink to="/register">
                    <Button variant="primary" size="sm">
                      Get started
                    </Button>
                  </NavLink>
                </div>
              )
            )}
          </div>
        </div>
      </nav>

      {/* ── Page content ───────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      {!ownsFooter && (
        <footer className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-foreground-subtle">
            Interviewly — AI-powered technical interviews
          </div>
        </footer>
      )}
    </div>
  )
}
