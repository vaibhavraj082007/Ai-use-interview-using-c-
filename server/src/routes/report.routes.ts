import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../auth/middleware.js'
import { httpError } from '../lib/http-error.js'
import { prisma } from '../db.js'
import nodemailer from 'nodemailer'

const router = Router()

/* ── Validation ───────────────────────────────────────────────── */

const FlagEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  detail: z.string().optional().default(''),
  at: z.number(),
})

const AnswerEvalSchema = z.object({
  questionId: z.string(),
  score: z.number(),
  band: z.string(),
  strengths: z.array(z.string()).optional().default([]),
  improvements: z.array(z.string()).optional().default([]),
  feedback: z.string().optional().default(''),
})

const SkillSchema = z.object({
  skill: z.string(),
  score: z.number(),
  questions: z.number(),
})

const TypeSchema = z.object({
  type: z.string(),
  score: z.number(),
  questions: z.number(),
})

const GradingResultSchema = z.object({
  overall: z.number(),
  band: z.string(),
  summary: z.string().optional().default(''),
  evaluations: z.array(AnswerEvalSchema),
  skills: z.array(SkillSchema),
  types: z.array(TypeSchema),
  answered: z.number(),
  total: z.number(),
})

const EmailReportSchema = z.object({
  to: z.string().email('to must be a valid email').trim().min(1),
  candidateName: z.string().trim().min(1).max(80),
  role: z.string().trim().max(60).optional().default('Interview'),
  gradedAt: z.number().optional(),
  result: GradingResultSchema,
  events: z.array(FlagEventSchema).optional().default([]),
})

function formatZod(err: z.ZodError): string {
  return err.issues
    .map((i) => (i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join(' ')
}

/* ── Helpers ─────────────────────────────────────────────────── */

function buildEmailBody(payload: z.infer<typeof EmailReportSchema>): string {
  const { candidateName, role, gradedAt, result, events, to } = payload
  const when = gradedAt ? new Date(gradedAt).toISOString() : new Date().toISOString()
  const lines: string[] = []
  lines.push('Subject: Interviewly — Interview Results')
  lines.push('')
  lines.push(`Dear ${candidateName},`)
  lines.push('')
  lines.push('Your recent interview has been reviewed. Below is a summary of your performance and any recorded flags.')
  lines.push('')
  lines.push(`Overall: ${result.overall}% (${result.band})`)
  lines.push(`Answered: ${result.answered}/${result.total}`)
  lines.push(`Role: ${role}`)
  lines.push(`Graded at: ${when}`)
  if (result.summary) {
    lines.push('')
    lines.push('Summary:')
    lines.push(result.summary)
  }
  lines.push('')
  lines.push('Skills:')
  for (const s of result.skills) {
    lines.push(`- ${s.skill}: ${s.score}% (${s.questions} question${s.questions === 1 ? '' : 's'})`)
  }
  lines.push('')
  lines.push('By question type:')
  for (const t of result.types) {
    lines.push(`- ${t.type}: ${t.score}% (${t.questions} question${t.questions === 1 ? '' : 's'})`)
  }
  lines.push('')
  lines.push('Per-question feedback:')
  for (const ev of result.evaluations) {
    lines.push(`- ${ev.questionId}: ${ev.score}% (${ev.band})`)
    if (ev.feedback) lines.push(`  Feedback: ${ev.feedback}`)
    if (ev.strengths.length > 0) lines.push(`  Strengths: ${ev.strengths.join('; ')}`)
    if (ev.improvements.length > 0) lines.push(`  Improvements: ${ev.improvements.join('; ')}`)
  }
  if (events.length > 0) {
    lines.push('')
    lines.push('Flagged events timeline:')
    for (const e of events) {
      const at = new Date(e.at).toISOString()
      lines.push(`- ${at} | ${e.type}${e.detail ? ` | ${e.detail}` : ''}`)
    }
  } else {
    lines.push('')
    lines.push('No flagged proctoring events were recorded.')
  }
  lines.push('')
  lines.push('Best regards,')
  lines.push('Interviewly Team')
  lines.push('')
  lines.push(`Sent to: ${to}`)
  return lines.join('\n')
}

/* ── POST /api/interview/email-report ──────────────────────────── */

router.post('/email-report', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const parsed = EmailReportSchema.safeParse(req.body)
    if (!parsed.success) throw httpError.badRequest(formatZod(parsed.error))

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM ?? 'Interviewly <no-reply@interviewly.ai>'

    if (!smtpHost || !smtpPort) {
      return res.json({
        ok: true,
        sent: false,
        message:
          'Email not configured (SMTP_HOST/SMTP_PORT missing). Report not emailed; use the PDF download instead.',
      })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    })

    await transporter.sendMail({
      from,
      to: parsed.data.to,
      subject: 'Interviewly — Interview Results',
      text: buildEmailBody(parsed.data),
    })

    res.json({ ok: true, sent: true })
  } catch (err) {
    next(err)
  }
})

/* ── GET /api/report/mine ───────────────────────────────────────── */
/**
 * The signed-in user's own report history — every graded interview, newest
 * first, so the History page can list them by date and time.
 */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id
    if (!userId) throw httpError.unauthorized('Not signed in')
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: [{ gradedAt: 'desc' }],
      take: 200,
    })
    res.json({
      reports: reports.map((r) => ({
        id: r.id,
        role: r.role,
        candidateName: r.candidateName,
        gradedAt: r.gradedAt.getTime(),
        createdAt: r.createdAt.getTime(),
        overall: safeOverall(r.resultJson),
        band: safeBand(r.resultJson),
        answered: safeAnswered(r.resultJson),
        total: safeTotal(r.resultJson),
      })),
    })
  } catch (err) {
    next(err)
  }
})

/* ── GET /api/report/mine/:id ───────────────────────────────────── */
/** One report owned by the signed-in user (404 for anything else). */
router.get('/mine/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id
    if (!userId) throw httpError.unauthorized('Not signed in')
    const reportId = String(req.params.id ?? '')
    const r = await prisma.report.findUnique({ where: { id: reportId } })
    if (!r || r.userId !== userId) throw httpError.notFound('Report not found')
    let result: unknown = null
    let events: unknown[] = []
    try { result = JSON.parse(r.resultJson) } catch { result = null }
    try { events = JSON.parse(r.eventsJson) } catch { events = [] }
    res.json({
      report: {
        id: r.id,
        role: r.role,
        candidateName: r.candidateName,
        candidateEmail: r.candidateEmail,
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

function safeOverall(s: string): number | null {
  try { const o = JSON.parse(s); return typeof o.overall === 'number' ? o.overall : null } catch { return null }
}
function safeBand(s: string): string | null {
  try { const o = JSON.parse(s); return typeof o.band === 'string' ? o.band : null } catch { return null }
}
function safeAnswered(s: string): number | null {
  try { const o = JSON.parse(s); return typeof o.answered === 'number' ? o.answered : null } catch { return null }
}
function safeTotal(s: string): number | null {
  try { const o = JSON.parse(s); return typeof o.total === 'number' ? o.total : null } catch { return null }
}

export { router as reportRouter }
