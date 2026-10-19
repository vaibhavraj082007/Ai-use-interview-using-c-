import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware.js'
import { httpError } from '../lib/http-error.js'
import { gradeInterview, generateQuestions } from '../interview/index.js'
import { detectSkillsForRole, labelFor } from '../interview/mock-provider.js'
import { domainForRole } from '../interview/bank.js'
import { questionHash } from '../interview/question-hash.js'
import { prisma } from '../db.js'
import type { Difficulty, QuestionType } from '../interview/provider.js'

const router = Router()

/* ── Request validation ───────────────────────────────────────── */

const GenerateBodySchema = z.object({
  cvText: z.string().max(50_000).optional().default(''),
  role: z.string().trim().min(1, 'role is required').max(60),
  skills: z.array(z.string().trim().min(1).max(60)).max(40).optional().default([]),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().default('Medium'),
  count: z.number().int().min(1).max(20).optional().default(8),
})

const DetectSkillsBodySchema = z.object({
  cvText: z.string().max(50_000).optional().default(''),
  role: z.string().trim().min(1, 'role is required').max(60),
})

const GradeQuestionSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  skill: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  type: z.enum(['coding', 'conceptual', 'oral']),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
})

const GradeAnswerSchema = z.object({
  questionId: z.string().trim().min(1),
  answer: z.string(),
})

const FlagEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  detail: z.string().optional().default(''),
  at: z.number(),
})

const SpeechMetricSchema = z.object({
  questionId: z.string().trim().min(1),
  type: z.enum(['coding', 'conceptual', 'oral']),
  text: z.string().max(4000).optional().default(''),
  spokenSeconds: z.number().int().min(0).max(3600),
  wordCount: z.number().int().min(0).max(5000),
  confidence: z.number().min(0).max(1).nullable().optional().default(null),
})

const FocusSchema = z.object({
  sessionSeconds: z.number().int().min(1).max(21600),
  /** Cumulative milliseconds each proctor flag type was active. */
  flaggedMs: z.record(z.number().int().min(0).max(86_400_000)),
})

const GradeBodySchema = z.object({
  role: z.string().trim().max(60).optional().default('Interview'),
  questions: z.array(GradeQuestionSchema).min(1).max(40),
  answers: z.array(GradeAnswerSchema).max(40).optional().default([]),
  speech: z.array(SpeechMetricSchema).max(40).optional().default([]),
  events: z.array(FlagEventSchema).optional().default([]),
  focus: FocusSchema.optional(),
  candidateName: z.string().trim().max(80).optional(),
  candidateEmail: z.string().email().trim().optional(),
})

function formatZod(err: z.ZodError): string {
  return err.issues
    .map((i) => (i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join(' ')
}

/**
 * Camera-confidence meter: 100 minus the share of the session spent inside a
 * proctor flag (looking away, no face, head turned, tab left). Clamped to
 * 0–100; flags are informational and never touch the graded score.
 */
function computeProctorSummary(
  focus: z.infer<typeof FocusSchema>,
  flagCount: number,
): {
  confidence: number
  sessionSeconds: number
  flaggedSeconds: number
  byType: Record<string, number>
  flags: number
} {
  const byType: Record<string, number> = {}
  let flaggedMs = 0
  for (const [type, ms] of Object.entries(focus.flaggedMs)) {
    if (ms > 0) {
      byType[type] = Math.round(ms / 1000)
      flaggedMs += ms
    }
  }
  const sessionMs = focus.sessionSeconds * 1000
  const ratio = sessionMs > 0 ? 1 - flaggedMs / sessionMs : 1
  const confidence = Math.max(0, Math.min(100, Math.round(ratio * 100)))
  return {
    confidence,
    sessionSeconds: focus.sessionSeconds,
    flaggedSeconds: Math.round(flaggedMs / 1000),
    byType,
    flags: flagCount,
  }
}

/* ── POST /api/interview/detect-skills ─────────────────────────── */

/**
 * Reads the uploaded CV text and returns the skills it actually mentions,
 * filtered to the chosen role's domain — so the Setup screen never shows a
 * skill that doesn't belong to the candidate's job.
 */
router.post('/detect-skills', requireAuth, (req, res, next) => {
  try {
    const parsed = DetectSkillsBodySchema.safeParse(req.body)
    if (!parsed.success) throw httpError.badRequest(formatZod(parsed.error))
    const { cvText, role } = parsed.data

    const matched = detectSkillsForRole(cvText, role)
    const domain = domainForRole(role)
    // CV mentions role-relevant skills → show exactly those; otherwise fall
    // back to the role's own skill set (still job-relevant, never empty).
    const source = matched.length > 0 ? 'cv' : 'role'
    const keys = matched.length > 0 ? matched : domain

    res.json({
      role,
      source,
      skills: keys.map(labelFor),
      roleDomain: domain.map(labelFor),
    })
  } catch (err) {
    next(err)
  }
})

/* ── POST /api/interview/generate ─────────────────────────────── */

/**
 * Serves fresh questions: everything this user has ever been served
 * (SeenQuestion table) is excluded, so a question never repeats once it
 * has been shown — across sessions and devices. Served questions are
 * marked seen immediately (the candidate has seen them whether or not
 * the interview is finished). If the unseen pool runs dry, the provider
 * relaxes rather than returning a short interview.
 */
router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const parsed = GenerateBodySchema.safeParse(req.body)
    if (!parsed.success) throw httpError.badRequest(formatZod(parsed.error))
    const userId = req.user?.id
    if (!userId) throw httpError.unauthorized('Not signed in')

    const seenRows = await prisma.seenQuestion.findMany({
      where: { userId },
      select: { questionHash: true },
    })
    const exclude = seenRows.map((s) => s.questionHash)

    const { questions, provider } = await generateQuestions({
      ...parsed.data,
      exclude,
    })

    // Persist what was served — best effort, never blocks the response.
    try {
      await Promise.all(
        questions.map((q) => {
          const questionHashValue = questionHash(q.text)
          return prisma.seenQuestion.upsert({
            where: {
              userId_questionHash: { userId, questionHash: questionHashValue },
            },
            update: {},
            create: { userId, questionHash: questionHashValue },
          })
        })
      )
    } catch (e) {
      console.warn('[seen] failed to persist served questions:', e)
    }

    res.json({ mode: provider.mode, provider: provider.name, questions })
  } catch (err) {
    next(err)
  }
})

/* ── POST /api/interview/grade ─────────────────────────────────── */

router.post('/grade', requireAuth, async (req, res, next) => {
  try {
    const parsed = GradeBodySchema.safeParse(req.body)
    if (!parsed.success) throw httpError.badRequest(formatZod(parsed.error))
    const { questions, answers, speech, events, focus, candidateName, candidateEmail } =
      parsed.data
    const { result, provider } = await gradeInterview({
      role: parsed.data.role,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        skill: q.skill,
        topic: q.topic,
        type: q.type as QuestionType,
        difficulty: q.difficulty as Difficulty,
      })),
      answers: answers.map((a) => ({ questionId: a.questionId, answer: a.answer })),
    })
    // Merge speech metrics (duration + confidence) and the camera-confidence
    // meter so both are persisted with the report and shown in the PDF.
    const finalResult = {
      ...result,
      ...(speech.length > 0 ? { speech } : {}),
      ...(focus ? { proctor: computeProctorSummary(focus, events.length) } : {}),
    }
    try {
      await prisma.report.create({
        data: {
          userId: req.user?.id ?? null,
          candidateName: candidateName?.trim() || req.user?.name || 'Candidate',
          candidateEmail: candidateEmail?.trim() || req.user?.email || null,
          role: parsed.data.role,
          resultJson: JSON.stringify(finalResult),
          eventsJson: JSON.stringify(events || []),
          gradedAt: new Date(),
        },
      })
    } catch (e) {
      console.warn('[report] failed to persist:', e)
    }
    res.json({ mode: provider.mode, provider: provider.name, result: finalResult })
  } catch (err) {
    next(err)
  }
})

export { router as interviewRouter }
