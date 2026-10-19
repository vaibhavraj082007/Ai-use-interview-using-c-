import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import { env, isProd } from '../env.js'

export type Role = 'candidate' | 'admin'

export interface JwtPayload {
  sub: string
  email: string
  role: Role
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET)

  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload')
  }

  const { sub, email, role } = decoded as Partial<JwtPayload>
  if (!sub || !email || (role !== 'candidate' && role !== 'admin')) {
    throw new Error('Invalid token payload')
  }

  return { sub, email, role }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd || env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: isProd || env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  })
}
