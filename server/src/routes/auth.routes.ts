import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import { signToken, setAuthCookie, clearAuthCookie } from '../auth/jwt.js'
import { requireAuth } from '../auth/middleware.js'
import { httpError } from '../lib/http-error.js'
import type { Role } from '../auth/jwt.js'

const router = Router()

/* ── Validation ─────────────────────────────────────────────── */

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
})

const userSelect = { id: true, name: true, email: true, role: true } as const

/* ── POST /api/auth/register ────────────────────────────────── */

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      throw httpError.badRequest(
        parsed.error.issues[0]?.message ?? 'Invalid input.'
      )
    }
    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw httpError.conflict('An account with this email already exists.')
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'candidate' },
      select: userSelect,
    })

    setAuthCookie(res, signToken({ sub: user.id, email: user.email, role: user.role as Role }))
    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})

/* ── POST /api/auth/login ───────────────────────────────────── */

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw httpError.badRequest(
        parsed.error.issues[0]?.message ?? 'Invalid input.'
      )
    }
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    // Same message whether the email is unknown or the password is wrong,
    // so we don't leak which emails have accounts.
    if (!user) throw httpError.unauthorized('Invalid email or password.')

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) throw httpError.unauthorized('Invalid email or password.')

    setAuthCookie(res, signToken({ sub: user.id, email: user.email, role: user.role as Role }))
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    next(err)
  }
})

/* ── POST /api/auth/logout ──────────────────────────────────── */

router.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

/* ── GET /api/auth/me ───────────────────────────────────────── */

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export { router as authRouter }
