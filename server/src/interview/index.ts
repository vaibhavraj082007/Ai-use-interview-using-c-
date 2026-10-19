import { env } from '../env.js'
import { createClaudeProvider } from './claude-provider.js'
import { createClaudeGrader } from './claude-grader.js'
import { evaluateAnswer, heuristicGrader } from './heuristic-grader.js'
import { finalizeGrading, missingEvaluation, refreshWeights } from './grading.js'
import { mockProvider } from './mock-provider.js'
import { questionHash } from './question-hash.js'
import { easeOneTier } from './provider.js'
import type { GenerateInput, InterviewQuestion, QuestionProvider } from './provider.js'
import type { GradingInput, GradingResult, Grader } from './grading.js'

export type {
  Difficulty,
  GenerateInput,
  InterviewQuestion,
  QuestionMode,
  QuestionProvider,
  QuestionType,
} from './provider.js'

export type {
  AnswerBand,
  AnswerEvaluation,
  GradeAnswer,
  GradeQuestion,
  Grader,
  GradingInput,
  GradingMode,
  GradingResult,
  OverallBand,
  SkillScore,
  TypeScore,
} from './grading.js'

export { questionWeight, TYPE_WEIGHT, DIFFICULTY_WEIGHT } from './grading.js'

/**
 * Whether to use Claude for a request.
 *
 *   AI_PROVIDER=auto   → Claude when ANTHROPIC_API_KEY is set, otherwise local.
 *   AI_PROVIDER=claude → Always Claude (falls back locally if the key missing).
 *   AI_PROVIDER=mock   → Always local (no API key required).
 */
function prefersClaude(): boolean {
  return (
    env.AI_PROVIDER === 'claude' ||
    (env.AI_PROVIDER === 'auto' && Boolean(env.ANTHROPIC_API_KEY))
  )
}

function warnMissingKey(feature: string): void {
  console.warn(
    `[interview] AI_PROVIDER=claude but ANTHROPIC_API_KEY is not set — using local ${feature}.`
  )
}

/* ── Question generation ───────────────────────────────────────── */

/** Choose the active question provider. */
export function getQuestionProvider(): QuestionProvider {
  if (prefersClaude() && env.ANTHROPIC_API_KEY) {
    return createClaudeProvider({
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL,
    })
  }
  if (env.AI_PROVIDER === 'claude') warnMissingKey('mock provider')
  return mockProvider
}

/** Generate a set of interview questions using the active provider. */
export async function generateQuestions(
  input: GenerateInput
): Promise<{ questions: InterviewQuestion[]; provider: QuestionProvider }> {
  const provider = getQuestionProvider()
  const eased = { ...input, difficulty: easeOneTier(input.difficulty) }
  let questions = await provider.generate(eased)

  // "Never show a question twice" guarantee: providers may treat `exclude`
  // as advisory (AI generation cannot be hard-filtered), so re-check every
  // question here and top up from the mock bank if anything slipped through.
  const excluded = new Set(input.exclude ?? [])
  if (excluded.size > 0) {
    const unseen = questions.filter((q) => !excluded.has(questionHash(q.text)))
    if (unseen.length < questions.length) {
      const topUp = await mockProvider.generate({
        ...eased,
        count: questions.length - unseen.length,
        exclude: [
          ...excluded,
          ...unseen.map((q) => questionHash(q.text)),
        ],
      })
      questions = [...unseen, ...topUp]
    }
  }

  return { questions, provider }
}

/* ── Answer grading ────────────────────────────────────────────── */

/** Choose the active answer grader. */
export function getGrader(): Grader {
  if (prefersClaude() && env.ANTHROPIC_API_KEY) {
    return createClaudeGrader({
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL,
    })
  }
  if (env.AI_PROVIDER === 'claude') warnMissingKey('heuristic grader')
  return heuristicGrader
}

/**
 * Grade a full interview session.
 *
 * Unanswered questions are recorded as "missing" (zero credit) without being
 * sent to the grader, so the AI only evaluates what the candidate actually
 * wrote. Any question the grader skips is filled in heuristically, and the
 * weighted total is computed centrally in `finalizeGrading`.
 */
export async function gradeInterview(
  input: GradingInput
): Promise<{ result: GradingResult; provider: Grader }> {
  await refreshWeights()
  const provider = getGrader()
  const answerText = new Map(input.answers.map((a) => [a.questionId, a.answer]))
  const hasAnswer = (id: string) => (answerText.get(id) ?? '').trim().length > 0

  const answered = input.questions.filter((q) => hasAnswer(q.id))
  const answeredAnswers = answered.map((q) => ({
    questionId: q.id,
    answer: answerText.get(q.id) ?? '',
  }))

  let evaluations: Parameters<typeof finalizeGrading>[1] = []
  let summary: string | undefined

  if (answered.length > 0) {
    const out = await provider.evaluate({
      role: input.role,
      questions: answered,
      answers: answeredAnswers,
    })
    evaluations = out.evaluations
    summary = out.summary
  }

  // Guarantee exactly one evaluation per answered question.
  const byId = new Map(evaluations.map((e) => [e.questionId, e]))
  const gradedAnswered = answered.map(
    (q) => byId.get(q.id) ?? evaluateAnswer(q, answerText.get(q.id) ?? '')
  )

  const unanswered = input.questions
    .filter((q) => !hasAnswer(q.id))
    .map((q) => missingEvaluation(q.id))

  const result = finalizeGrading(
    input.questions,
    [...gradedAnswered, ...unanswered],
    summary
  )

  return { result, provider }
}
