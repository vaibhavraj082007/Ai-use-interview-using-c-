import { useState, type FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
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

/* ── tiny helpers ──────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  name?: string
  email?: string
  password?: string
}

function validate(name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!name.trim()) errors.name = 'Name is required.'
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < 8)
    errors.password = 'Must be at least 8 characters.'
  return errors
}

/* ── component ─────────────────────────────────────────────────── */

export default function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    const fieldErrors = validate(name, email, password)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setLoading(true)

    // Simulate a tiny network delay so the UI feels real
    setTimeout(() => {
      // Check for duplicate email
      const existing = localStorage.getItem('interviewly_users')
      const users: Record<string, { name: string; password: string }> =
        existing ? JSON.parse(existing) : {}

      if (users[email]) {
        setFormError('An account with this email already exists.')
        setLoading(false)
        return
      }

      // Persist
      users[email] = { name: name.trim(), password }
      localStorage.setItem('interviewly_users', JSON.stringify(users))
      localStorage.setItem(
        'interviewly_session',
        JSON.stringify({ email, name: name.trim() })
      )

      navigate('/upload-cv')
    }, 400)
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
            {/* ── form-level error ─────────────────────────────── */}
            {formError && (
              <div className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-error/5 border border-error/20 px-3.5 py-2.5 text-sm text-error animate-fade-in">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{formError}</span>
              </div>
            )}

            <Input
              id="register-name"
              label="Full Name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
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
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
              }}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              id="register-password"
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }))
              }}
              error={errors.password}
              autoComplete="new-password"
            />

            <Button
              id="register-submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create Account'}
            </Button>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-foreground-muted">
              Already have an account?{' '}
              <NavLink
                to="/login"
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
