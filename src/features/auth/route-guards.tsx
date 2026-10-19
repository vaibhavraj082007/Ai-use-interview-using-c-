import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ShieldAlert, Home, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, type Role } from './auth-context'

export interface NavigationState {
  from?: { pathname?: string }
}

function homeFor(role: Role): string {
  return role === 'admin' ? '/admin' : '/upload-cv'
}

function useIntendedPath(): string | null {
  const location = useLocation()
  const state = location.state as NavigationState | null
  return state?.from?.pathname ?? null
}

function useCurrentPath(): string {
  const location = useLocation()
  return location.pathname + location.search + location.hash
}

function AuthLoading() {
  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex items-center justify-center">
      <Loader2 className="h-6 w-6 text-accent animate-spin" aria-label="Loading" />
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const currentPath = useCurrentPath()
  const intended = useIntendedPath()

  if (loading) return <AuthLoading />

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: intended ?? currentPath } }}
      />
    )
  }

  return <>{children}</>
}

function AccessDenied() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center space-y-6 animate-scale-in">
        <div className="mx-auto h-14 w-14 rounded-full bg-error-soft flex items-center justify-center">
          <ShieldAlert className="h-6 w-6 text-error" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Admin access required
          </h1>
          <p className="text-sm text-foreground-muted leading-relaxed">
            You&apos;re signed in as{' '}
            <span className="font-medium text-foreground">{user?.name}</span>{' '}
            ({user?.role}), which doesn&apos;t have permission to view this
            area.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Switch account <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="md" onClick={() => navigate('/')}>
            <Home className="h-4 w-4" /> Back home
          </Button>
        </div>
      </div>
    </div>
  )
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth()
  const currentPath = useCurrentPath()
  const intended = useIntendedPath()

  if (loading) return <AuthLoading />

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: intended ?? currentPath } }}
      />
    )
  }

  if (user?.role !== 'admin') {
    return <AccessDenied />
  }

  return <>{children}</>
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth()
  const intended = useIntendedPath()

  if (loading) return <AuthLoading />

  if (isAuthenticated && user) {
    return <Navigate to={intended ?? homeFor(user.role)} replace />
  }

  return <>{children}</>
}
