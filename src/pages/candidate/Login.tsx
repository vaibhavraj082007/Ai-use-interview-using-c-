import { useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { AuthError } from '@/features/auth/errors'
import type { NavigationState } from '@/features/auth/route-guards'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DEMO_ADMIN = { email: 'admin@interviewly.ai', password: 'admin1234' }

interface FieldErrors {
  email?: string
  password?: string
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}

  if (!email.trim()) {
    errors.email = 'Please enter your email address.'
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = AuthError.emailInvalid
  }

  if (!password) {
    errors.password = 'Please enter your password.'
  }

  return errors
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const intended =
    (location.state as NavigationState | null)?.from?.pathname ?? '/upload-cv'

  function clearFieldError(field: keyof FieldErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    const fieldErrors = validate(email, password)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'admin' ? '/admin' : intended, { replace: true })
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : AuthError.invalidCredentials
      )
      setPassword('')
      setLoading(false)
    }
  }

  function fillAdminDemo() {
    setEmail(DEMO_ADMIN.email)
    setPassword(DEMO_ADMIN.password)
    setErrors({})
    setFormError('')
  }

  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md animate-scale-in">
        <form onSubmit={handleSubmit} noValidate>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to continue your interview prep.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-error-soft border border-error/20 px-3.5 py-2.5 text-sm text-error animate-fade-in"
              >
                <span className="shrink-0 mt-0.5" aria-hidden="true">
                  ⚠
                </span>
                <div className="flex-1">
                  <span>{formError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormError('')
                      setPassword('')
                    }}
                    className="block mt-1 text-xs font-medium underline underline-offset-2 hover:no-underline cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            <Input
              id="login-email"
              label="Email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearFieldError('email')
                if (formError) setFormError('')
              }}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              id="login-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearFieldError('password')
                if (formError) setFormError('')
              }}
              error={errors.password}
              autoComplete="current-password"
            />

            <Button
              id="login-submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>

            <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-surface px-3.5 py-2.5 text-xs text-foreground-muted flex items-center justify-between gap-3">
              <span>
                Admin demo:{' '}
                <span className="font-mono text-foreground-subtle">
                  {DEMO_ADMIN.email}
                </span>
              </span>
              <button
                type="button"
                onClick={fillAdminDemo}
                className="shrink-0 font-medium text-accent hover:text-accent-hover underline underline-offset-2 cursor-pointer"
              >
                Use
              </button>
            </div>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-foreground-muted">
              Don&apos;t have an account?{' '}
              <NavLink
                to="/register"
                state={
                  (location.state as NavigationState | null)?.from
                    ? { from: (location.state as NavigationState).from }
                    : undefined
                }
                className="text-accent hover:text-accent-hover font-medium"
              >
                Register
              </NavLink>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
