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

interface FieldErrors {
  name?: string
  email?: string
  password?: string
}

function validate(
  name: string,
  email: string,
  password: string
): FieldErrors {
  const errors: FieldErrors = {}

  if (!name.trim()) {
    errors.name = 'Please enter your full name.'
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }

  if (!email.trim()) {
    errors.email = 'Please enter your email address.'
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = AuthError.emailInvalid
  }

  if (!password) {
    errors.password = 'Please choose a password.'
  } else if (password.length < 8) {
    errors.password = AuthError.passwordShort
  }

  return errors
}

function passwordScore(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  return score
}

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = [
  'bg-border',
  'bg-error',
  'bg-warning',
  'bg-success',
  'bg-success',
]

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const score = passwordScore(password)
  const showStrength = password.length > 0
  const intended =
    (location.state as NavigationState | null)?.from?.pathname ?? '/upload-cv'

  function clearFieldError(field: keyof FieldErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    const fieldErrors = validate(name, email, password)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setLoading(true)
    try {
      await register({ name, email, password })
      navigate(intended, { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : AuthError.emailTaken)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md animate-scale-in">
        <form onSubmit={handleSubmit} noValidate>
          <CardHeader>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Start practising AI-powered interviews today.
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
              id="register-name"
              label="Full Name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearFieldError('name')
              }}
              error={errors.name}
              autoComplete="name"
            />

            <Input
              id="register-email"
              label="Email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearFieldError('email')
              }}
              error={errors.email}
              autoComplete="email"
            />

            <div className="space-y-2">
              <Input
                id="register-password"
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearFieldError('password')
                }}
                error={errors.password}
                hint="Use 8+ characters with a mix of cases, numbers & symbols."
                autoComplete="new-password"
              />

              {showStrength && !errors.password && (
                <div className="flex items-center gap-2.5 animate-fade-in">
                  <div className="flex-1 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          i < score
                            ? STRENGTH_COLORS[Math.min(score, 4)]
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-foreground-muted w-14 text-right">
                    {STRENGTH_LABELS[Math.min(score, 4)]}
                  </span>
                </div>
              )}
            </div>

            <Button
              id="register-submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-foreground-muted">
              Already have an account?{' '}
              <NavLink
                to="/login"
                state={
                  (location.state as NavigationState | null)?.from
                    ? { from: (location.state as NavigationState).from }
                    : undefined
                }
                className="text-accent hover:text-accent-hover font-medium"
              >
                Sign in
              </NavLink>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
