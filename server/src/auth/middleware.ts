import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { HttpError, httpError } from '../lib/http-error.js'
import { verifyToken, type Role } from './jwt.js'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * Requires a valid JWT auth cookie. Loads the user from the database so the
 * role/name are always fresh, and rejects sessions whose user no longer exists.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[env.COOKIE_NAME] as string | undefined
    if (!token) throw httpError.unauthorized()

    const payload = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) throw httpError.unauthorized('Session is no longer valid.')

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.role === 'admin' ? 'admin' : 'candidate') as Role,
    }

    next()
  } catch (err) {
    // Only forward known HttpErrors as-is; everything else is a bad token.
    if (err instanceof HttpError) return next(err)
    return next(httpError.unauthorized('Invalid or expired session.'))
  }
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    next(httpError.forbidden('Admin access required.'))
    return
  }
  next()
}
