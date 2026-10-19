/**
 * Claude grader — AI answer evaluation via the Anthropic Messages API.
 *
 * The API key is only ever read on the server. Every answer the candidate
 * actually gave is sent in one batched request; if the call fails for any
 * reason (network, bad key, malformed output) the grader logs a warning and
 * falls back to the heuristic grader, so results are always produced.
 * Individual questions the model skips are also filled in heuristically.
 */

import { z } from 'zod'
import {
  answerBand,
  sanitizeEvaluation,
  type AnswerEvaluation,
  type Grader,
  type GradingInput,
} from './grading.js'
import { evaluateAnswer, heuristicGrader } from './heuristic-grader.js'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

/** Bound each answer to keep the batched prompt within token limits. */
const MAX_ANSWER_CHARS = 3000

/* ── Response schema ──────────────────────────────────────────── */

const RawEvaluationSchema = z.object({
  questionId: z.string(),
  score: z.number(),
  strengths: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  feedback: z.string().optional(),
})

const RawGradingSchema = z.object({
  summary: z.string().optional(),
  evaluations: z.array(RawEvaluationSchema),
})

/* ── Prompt building ──────────────────────────────────────────── */

function buildSystemPrompt(): string {
  return [
    'You are an expert technical interviewer grading a candidate interview.',
    'You will receive a list of questions and the candidate answer for each.',
    'Return ONLY a JSON object. Do not wrap it in markdown fences and do not add any prose before or after the JSON.',
    'The object must have exactly these keys:',
    '- "summary": 2-3 sentences of overall, encouraging but honest feedback for the candidate',
    '- "evaluations": an array with one object per question, each having:',
    '  - "questionId": the exact id you were given',
    '  - "score": an integer from 0 to 100',
    '  - "strengths": 1-3 short strings about what the candidate did well',
    '  - "improvements": 1-3 short, actionable strings on what to fix',
    '  - "feedback": 1-3 sentences assessing this specific answer',
    'Grading rubric: 90-100 = exceptional, complete and insightful; 70-89 = solid, correct with minor gaps; 50-69 = partial, right idea but missing key detail; 0-49 = weak, irrelevant, or incorrect.',
    'Judge the substance of each answer, not its length. Be specific — reference what the candidate actually wrote. Never reward verbosity alone.',
  ].join('\n')
}

function buildUserPrompt(input: GradingInput): string {
  const blocks = input.questions.map((q) => {
    const answer =
      input.answers.find((a) => a.questionId === q.id)?.answer?.trim() ?? ''
    return [
      `### ${q.id}`,
      `type=${q.type} | difficulty=${q.difficulty} | skill=${q.skill}`,
      `Question: ${q.text}`,
      'Candidate answer:',
      '---',
      answer.slice(0, MAX_ANSWER_CHARS) || '(empty)',
      '---',
    ].join('\n')
  })

  return [
    input.role ? `Target role: ${input.role}` : 'Target role: (unspecified)',
    '',
    ...blocks,
    '',
    `Grade every one of the ${input.questions.length} questions listed above and return the JSON object now.`,
  ].join('\n\n')
}

/* ── Parsing helpers ──────────────────────────────────────────── */

/** Pull a JSON object out of model output, tolerating stray fences/text. */
function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in model output.')
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}

/* ── Grader factory ───────────────────────────────────────────── */

interface ClaudeConfig {
  apiKey: string
  model: string
}

export function createClaudeGrader(config: ClaudeConfig): Grader {
  return {
    name: 'claude',
    mode: 'ai',
    evaluate: async (input: GradingInput) => {
      try {
        const raw = await requestGrading(config, input)
        const evaluations = mergeEvaluations(input, raw)
        if (evaluations.evaluations.length === 0) {
          throw new Error('Model returned no usable evaluations.')
        }
        return evaluations
      } catch (err) {
        // Never let a model failure block the result page — use heuristics.
        console.warn(
          '[interview] Claude grading failed, falling back to heuristic grader:',
          err instanceof Error ? err.message : err
        )
        return heuristicGrader.evaluate(input)
      }
    },
  }
}

/** Map, de-duplicate and complete the model's evaluations for the input set. */
function mergeEvaluations(
  input: GradingInput,
  raw: z.infer<typeof RawGradingSchema>
): { evaluations: AnswerEvaluation[]; summary?: string } {
  const knownIds = new Set(input.questions.map((q) => q.id))
  const answerByQuestion = new Map(input.answers.map((a) => [a.questionId, a.answer]))
  const questionById = new Map(input.questions.map((q) => [q.id, q]))

  const byId = new Map<string, AnswerEvaluation>()
  for (const item of raw.evaluations) {
    if (!knownIds.has(item.questionId) || byId.has(item.questionId)) continue
    byId.set(
      item.questionId,
      sanitizeEvaluation({
        questionId: item.questionId,
        score: item.score,
        band: answerBand(item.score),
        strengths: item.strengths ?? [],
        improvements: item.improvements ?? [],
        feedback: item.feedback ?? '',
      })
    )
  }

  // Fill anything the model skipped so every answered question is graded.
  const evaluations = input.questions.map((q) => {
    const existing = byId.get(q.id)
    if (existing) return existing
    const question = questionById.get(q.id)
    if (!question) {
      return {
        questionId: q.id,
        score: 0,
        band: 'weak' as const,
        strengths: [],
        improvements: ['This answer could not be graded automatically.'],
        feedback: 'No evaluation was returned for this answer.',
      }
    }
    return evaluateAnswer(question, answerByQuestion.get(q.id) ?? '')
  })

  return {
    evaluations,
    ...(typeof raw.summary === 'string' && raw.summary.trim()
      ? { summary: raw.summary.trim() }
      : {}),
  }
}

async function requestGrading(
  { apiKey, model }: ClaudeConfig,
  input: GradingInput
): Promise<z.infer<typeof RawGradingSchema>> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(
      `Anthropic API ${res.status}: ${detail.slice(0, 200) || res.statusText}`
    )
  }

  const data = (await res.json()) as {
    content?: { type?: string; text?: string }[]
  }

  const textBlock = data.content?.find((b) => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text content in model response.')

  return RawGradingSchema.parse(extractJsonObject(textBlock.text))
}
