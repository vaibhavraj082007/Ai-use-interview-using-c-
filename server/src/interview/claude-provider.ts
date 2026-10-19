import { z } from 'zod'
import { labelFor, mockProvider } from './mock-provider.js'
import { domainForRole } from './bank.js'
import {
  finalizeQuestion,
  normalizeDifficulty,
  normalizeType,
  type GenerateInput,
  type InterviewQuestion,
  type QuestionProvider,
} from './provider.js'

/**
 * Claude question provider.
 *
 * Generates questions with the Anthropic Messages API. The API key is only
 * ever read on the server, so it is never exposed to the browser. If the call
 * fails for any reason (network, bad key, malformed output) the provider
 * logs a warning and transparently falls back to the mock provider, so the
 * interview always has questions to show.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

/** Bound how much of the CV we send to keep token usage sane. */
const MAX_CV_CHARS = 6000

/* ── Response schema ──────────────────────────────────────────── */

const RawQuestionSchema = z.object({
  text: z.string().min(1),
  skill: z.string().optional(),
  topic: z.string().optional(),
  type: z.string().optional(),
  difficulty: z.string().optional(),
  starterCode: z.string().optional(),
})

const RawQuestionsSchema = z.array(RawQuestionSchema)

/* ── Prompt building ──────────────────────────────────────────── */

function buildSystemPrompt(): string {
  return [
    'You are an expert technical interviewer creating a tailored, balanced interview.',
    'You will be given a candidate CV, a target role, and a difficulty.',
    'Return ONLY a JSON array of question objects. Do not wrap it in markdown fences and do not add any prose before or after the JSON.',
    'Each object must have these keys:',
    '- "text": the question (a string)',
    '- "skill": a short skill label tied to the CV or role',
    '- "topic": a short topic label',
    '- "type": one of "coding", "conceptual", "oral"',
    '- "difficulty": one of "Easy", "Medium", "Hard"',
    '- "starterCode": for "coding" questions only, a short starter snippet or schema; omit it for others.',
    'Ground every question in the CV so it tests what the candidate actually claims to know.',
    'Question mix: exactly 2 "oral" (spoken-answer) questions when the count is 3 or more; every other question must be written ("coding" or "conceptual").',
  ].join('\n')
}

function buildUserPrompt(input: GenerateInput): string {
  const cvExcerpt = (input.cvText || '(no CV provided)').slice(0, MAX_CV_CHARS)
  const skills =
    input.skills.length > 0 ? input.skills.join(', ') : '(derive from the CV)'
  const domainLabels = domainForRole(input.role)
    .map((k) => labelFor(k))
    .join(', ')

  return [
    `Role: ${input.role}`,
    `Difficulty: ${input.difficulty}`,
    `Number of questions: ${input.count}`,
    `Preferred skills: ${skills}`,
    '',
    `Role domain: this is a ${input.role} interview. Every question must stay inside these skills: ${domainLabels}. Never mention or test a skill outside this list (e.g. no backend or data topics in a Frontend interview) — if the CV mentions unrelated skills, ignore them.`,
    '',
    'Required mix: exactly 2 oral questions (spoken answers the AI listens to), all others written — split evenly between coding and conceptual. Never return more than 2 oral questions when the count is 3 or more.',
    '',
    'Candidate CV:',
    '---',
    cvExcerpt,
    '---',
    '',
    'Return the JSON array now.',
  ].join('\n')
}

/* ── Parsing helpers ──────────────────────────────────────────── */

/** Pull a JSON array out of the model output, tolerating stray fences/text. */
function extractJsonArray(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON array found in model output.')
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}

/** Normalise validated-but-loose model items into InterviewQuestions. */
function toQuestions(raw: z.infer<typeof RawQuestionsSchema>): InterviewQuestion[] {
  return raw.map((q, idx) => {
    const type = normalizeType(q.type)
    return finalizeQuestion(idx, {
      text: q.text.trim(),
      skill: (q.skill ?? 'General').trim() || 'General',
      topic: (q.topic ?? q.skill ?? 'General').trim() || 'General',
      type,
      difficulty: normalizeDifficulty(q.difficulty),
      ...(q.starterCode ? { starterCode: q.starterCode } : {}),
    })
  })
}

/* ── Type-mix enforcement ─────────────────────────────────────── */

/**
 * The interview format requires exactly 2 spoken (oral) questions — the AI
 * judges them on duration, confidence and correctness. Models drift, so we
 * enforce the quota deterministically: surplus oral → conceptual, and (if the
 * model under-delivers) top up from conceptual questions at the end.
 */
function enforceTypeMix(questions: InterviewQuestion[]): InterviewQuestion[] {
  const count = questions.length
  const targetOral = count >= 3 ? 2 : Math.max(0, count - 1)
  const out = questions.map((q) => ({ ...q }))
  let oral = out.filter((q) => q.type === 'oral').length

  for (let i = out.length - 1; i >= 0 && oral > targetOral; i--) {
    const q = out[i]
    if (q && q.type === 'oral') {
      q.type = 'conceptual'
      oral--
    }
  }
  for (let i = out.length - 1; i >= 0 && oral < targetOral; i--) {
    const q = out[i]
    if (q && q.type === 'conceptual') {
      q.type = 'oral'
      oral++
    }
  }
  return out
}

/* ── Provider factory ─────────────────────────────────────────── */

interface ClaudeConfig {
  apiKey: string
  model: string
}

export function createClaudeProvider(config: ClaudeConfig): QuestionProvider {
  return {
    name: 'claude',
    mode: 'ai',
    generate: async (input: GenerateInput): Promise<InterviewQuestion[]> => {
      try {
        const questions = await requestQuestions(config, input)
        if (questions.length > 0) return questions
        throw new Error('Model returned no usable questions.')
      } catch (err) {
        // Never let a model failure break the interview — fall back to mock.
        console.warn(
          '[interview] Claude generation failed, falling back to mock provider:',
          err instanceof Error ? err.message : err
        )
        return mockProvider.generate(input)
      }
    },
  }
}

async function requestQuestions(
  { apiKey, model }: ClaudeConfig,
  input: GenerateInput
): Promise<InterviewQuestion[]> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
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

  const parsed = RawQuestionsSchema.parse(extractJsonArray(textBlock.text))
  return enforceTypeMix(toQuestions(parsed))
}
