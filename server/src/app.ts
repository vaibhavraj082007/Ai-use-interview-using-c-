import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './env.js'
import { authRouter } from './routes/auth.routes.js'
import { cvRouter } from './routes/cv.routes.js'
import { interviewRouter } from './routes/interview.routes.js'
import { reportRouter } from './routes/report.routes.js'
import { adminRouter } from './routes/admin.routes.js'
import { HttpError, httpError } from './lib/http-error.js'

export function createApp(): express.Express {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.get('/api/health', (_req, res) => { res.json({ ok: true, service: 'interviewly-api' }) })
  app.use('/api/auth', authRouter)
  app.use('/api/cv', cvRouter)
  app.use('/api/interview', interviewRouter)
  app.use('/api/report', reportRouter)
  app.use('/api/admin', adminRouter)
  app.use((_req, _res, next) => { next(httpError.notFound('Route not found.')) })
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const isKnown = err instanceof HttpError
    const status = isKnown ? err.status : 500
    const message = isKnown ? err.message : 'Something went wrong.'
    if (status >= 500) console.error(err)
    res.status(status).json({ error: message })
  })
  return app
}
