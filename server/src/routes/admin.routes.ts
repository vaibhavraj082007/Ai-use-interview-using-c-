import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../auth/middleware.js'
import { httpError } from '../lib/http-error.js'
import { prisma } from '../db.js'
import { getWeights, setWeights } from '../services/weights.js'

const router = Router()

router.use(requireAuth, requireAdmin)

const WeightsSchema = z.object({
  typeWeight: z.object({
    coding: z.number().positive(),
    conceptual: z.number().positive(),
    oral: z.number().positive(),
  }),
  difficultyWeight: z.object({
    Easy: z.number().positive(),
    Medium: z.number().positive(),
    Hard: z.number().positive(),
  }),
})

function formatZod(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(' ')
}

router.get('/weights', async (_req, res, next) => {
  try {
    res.json({ weights: await getWeights() })
  } catch (err) {
    next(err)
  }
})

router.put('/weights', async (req, res, next) => {
  try {
    const parsed = WeightsSchema.safeParse(req.body)
    if (!parsed.success) throw httpError.badRequest(formatZod(parsed.error))
    res.json({ weights: await setWeights(parsed.data) })
  } catch (err) {
    next(err)
  }
})

router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    })
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

router.get('/reports', async (_req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    })
    res.json({
      reports: reports.map((r) => ({
        id: r.id,
        userId: r.userId,
        candidateName: r.candidateName,
        candidateEmail: r.candidateEmail,
        role: r.role,
        gradedAt: r.gradedAt.getTime(),
        createdAt: r.createdAt.getTime(),
        overall: safeOverall(r.resultJson),
        answered: safeAnswered(r.resultJson),
        total: safeTotal(r.resultJson),
      })),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/reports/:id', async (req, res, next) => {
  try {
    const r = await prisma.report.findUnique({ where: { id: req.params.id } })
    if (!r) throw httpError.notFound('Report not found')
    let result: any
    let events: any[] = []
    try { result = JSON.parse(r.resultJson) } catch { result = null }
    try { events = JSON.parse(r.eventsJson) } catch { events = [] }
    res.json({
      report: {
        id: r.id,
        userId: r.userId,
        candidateName: r.candidateName,
        candidateEmail: r.candidateEmail,
        role: r.role,
        gradedAt: r.gradedAt.getTime(),
        createdAt: r.createdAt.getTime(),
        result,
        events,
      },
    })
  } catch (err) {
    next(err)
  }
})

router.get('/stats', async (_req, res, next) => {
  try {
    const [totalCandidates, reports, interviewsToday, pendingReviews] = await Promise.all([
      prisma.user.count(),
      prisma.report.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
      prisma.report.count({ where: { gradedAt: { gte: new Date(Date.now() - 24*3600*1000) } } }),
      prisma.report.count({ where: { createdAt: { gte: new Date(Date.now() - 7*24*3600*1000) } } }), // dummy
    ])
    const avgScore = reports.length > 0 ? Math.round(reports.reduce((a,r)=>a+(safeOverall(r.resultJson)||0),0)/reports.length) : 0
    res.json({ stats: { totalCandidates, interviewsToday, avgScore, pendingReviews: Math.max(0, pendingReviews-reports.length) } })
  } catch (err) {
    next(err)
  }
})

function safeOverall(s: string): number | null {
  try { const o = JSON.parse(s); return typeof o.overall==='number'?o.overall:null } catch { return null }
}
function safeAnswered(s: string): number | null {
  try { const o = JSON.parse(s); return typeof o.answered==='number'?o.answered:null } catch { return null }
}
function safeTotal(s: string): number | null {
  try { const o = JSON.parse(s); return typeof o.total==='number'?o.total:null } catch { return null }
}

export { router as adminRouter }
