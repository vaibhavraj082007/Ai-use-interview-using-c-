/**
 * Grading model shared by every grader (AI and heuristic).
 */
import type { Difficulty, QuestionType } from './provider.js'
import { getWeights } from '../services/weights.js'

/* ── Input ─────────────────────────────────────────────────────── */

export interface GradeQuestion {
  id: string
  text: string
  skill: string
  topic: string
  type: QuestionType
  difficulty: Difficulty
}

export interface GradeAnswer {
  questionId: string
  answer: string
}

export interface GradingInput {
  role: string
  questions: GradeQuestion[]
  answers: GradeAnswer[]
}

/* ── Output ────────────────────────────────────────────────────── */

export type AnswerBand = 'excellent' | 'good' | 'average' | 'weak' | 'missing'

export type OverallBand = 'excellent' | 'strong' | 'developing' | 'needs_work'

export interface AnswerEvaluation {
  questionId: string
  score: number
  band: AnswerBand
  strengths: string[]
  improvements: string[]
  feedback: string
}

export interface SkillScore {
  skill: string
  score: number
  questions: number
}

export interface TypeScore {
  type: QuestionType
  score: number
  questions: number
}

export interface GradingResult {
  overall: number
  band: OverallBand
  summary: string
  evaluations: AnswerEvaluation[]
  skills: SkillScore[]
  types: TypeScore[]
  answered: number
  total: number
}

export type GradingMode = 'ai' | 'heuristic'

export interface Grader {
  readonly name: 'claude' | 'heuristic'
  readonly mode: GradingMode
  evaluate(input: GradingInput): Promise<{ evaluations: AnswerEvaluation[]; summary?: string }>
}

/* ── Defaults ─────────────────────────────────────────────────── */

const DEFAULT_TYPE_WEIGHT: Record<QuestionType, number> = {
  coding: 1.4,
  conceptual: 1.1,
  oral: 1.0,
}
const DEFAULT_DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  Easy: 1.0,
  Medium: 1.25,
  Hard: 1.5,
}

export const TYPE_WEIGHT: Record<QuestionType, number> = DEFAULT_TYPE_WEIGHT
export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = DEFAULT_DIFFICULTY_WEIGHT

let weightsCached: { typeWeight: Record<QuestionType, number>; difficultyWeight: Record<Difficulty, number> } | null = null
export async function refreshWeights(): Promise<void> {
  weightsCached = await getWeights()
}
export function getEffectiveWeights() {
  if (weightsCached) return weightsCached
  return { typeWeight: DEFAULT_TYPE_WEIGHT, difficultyWeight: DEFAULT_DIFFICULTY_WEIGHT }
}
export function questionWeight(q: { type: QuestionType; difficulty: Difficulty }): number {
  const w = getEffectiveWeights()
  return w.typeWeight[q.type] * w.difficultyWeight[q.difficulty]
}

/* ── Bands ───────────────────────────────────────────────────── */

export function answerBand(score: number): AnswerBand {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'average'
  return 'weak'
}
export function overallBand(overall: number): OverallBand {
  if (overall >= 85) return 'excellent'
  if (overall >= 70) return 'strong'
  if (overall >= 50) return 'developing'
  return 'needs_work'
}

/* ── Helpers ─────────────────────────────────────────────────── */

const MAX_LIST = 5
const MAX_TEXT = 600

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}
function cleanList(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 200))
    .slice(0, MAX_LIST)
}
function cleanText(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) return ''
  return value.trim().slice(0, MAX_TEXT)
}
export function missingEvaluation(questionId: string): AnswerEvaluation {
  return {
    questionId,
    score: 0,
    band: 'missing',
    strengths: [],
    improvements: ['No response was recorded — give every question a try next time.'],
    feedback: 'No answer was provided for this question, so it received no credit.',
  }
}
export function sanitizeEvaluation(raw: AnswerEvaluation): AnswerEvaluation {
  const score = clampScore(raw.score)
  const band: AnswerBand = raw.band === 'missing' && score === 0 ? 'missing' : answerBand(score)
  return {
    questionId: raw.questionId,
    score,
    band,
    strengths: cleanList(raw.strengths),
    improvements: cleanList(raw.improvements),
    feedback: cleanText(raw.feedback) || defaultFeedback(score),
  }
}
function defaultFeedback(score: number): string {
  const band = answerBand(score)
  if (band === 'excellent') return 'Strong, complete answer that fully addresses the question.'
  if (band === 'good') return 'Solid answer with the core points covered.'
  if (band === 'average') return 'Partially correct — the main idea is there but detail is missing.'
  return 'The answer needs more depth and accuracy on the key points.'
}

/* ── Aggregation ─────────────────────────────────────────────── */

function averageFor(
  questions: GradeQuestion[],
  evaluations: Map<string, AnswerEvaluation>,
  key: (q: GradeQuestion) => string
): { key: string; score: number; questions: number }[] {
  const buckets = new Map<string, { weighted: number; weight: number; count: number }>()
  for (const q of questions) {
    const eval_ = evaluations.get(q.id)
    if (!eval_) continue
    const weight = questionWeight(q)
    const bucket = buckets.get(key(q)) ?? { weighted: 0, weight: 0, count: 0 }
    bucket.weighted += eval_.score * weight
    bucket.weight += weight
    bucket.count += 1
    buckets.set(key(q), bucket)
  }
  return [...buckets.entries()].map(([name, b]) => ({
    key: name,
    score: b.weight > 0 ? Math.round(b.weighted / b.weight) : 0,
    questions: b.count,
  }))
}

export function finalizeGrading(
  questions: GradeQuestion[],
  rawEvaluations: AnswerEvaluation[],
  summary?: string
): GradingResult {
  const provided = new Map<string, AnswerEvaluation>()
  for (const raw of rawEvaluations) {
    if (!raw || typeof raw.questionId !== 'string') continue
    provided.set(raw.questionId, sanitizeEvaluation(raw))
  }
  const evaluations: AnswerEvaluation[] = questions.map((q) => provided.get(q.id) ?? missingEvaluation(q.id))
  const byId = new Map(evaluations.map((e) => [e.questionId, e]))
  let weightedTotal = 0
  let weightSum = 0
  let answered = 0
  for (const q of questions) {
    const eval_ = byId.get(q.id) ?? missingEvaluation(q.id)
    const weight = questionWeight(q)
    weightedTotal += eval_.score * weight
    weightSum += weight
    if (eval_.band !== 'missing') answered += 1
  }
  const overall = weightSum > 0 ? Math.round(weightedTotal / weightSum) : 0
  const skills: SkillScore[] = averageFor(questions, byId, (q) => q.skill)
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ skill: s.key, score: s.score, questions: s.questions }))
  const typeOrder: QuestionType[] = ['coding', 'conceptual', 'oral']
  const types: TypeScore[] = averageFor(questions, byId, (q) => q.type)
    .sort((a, b) => typeOrder.indexOf(a.key as QuestionType) - typeOrder.indexOf(b.key as QuestionType))
    .map((t) => ({ type: t.key as QuestionType, score: t.score, questions: t.questions }))
  const result: GradingResult = {
    overall,
    band: overallBand(overall),
    summary: '',
    evaluations,
    skills,
    types,
    answered,
    total: questions.length,
  }
  result.summary = cleanText(summary) || buildSummary(result, skills)
  return result
}
function buildSummary(result: GradingResult, skills: SkillScore[]): string {
  if (result.total === 0) return 'No questions were graded.'
  if (result.answered === 0) {
    return `No answers were recorded, so the session scored 0% across ${result.total} questions.`
  }
  const strongest = skills[0]
  const focus = skills[skills.length - 1]
  const base = `Answered ${result.answered} of ${result.total} questions for a weighted total of ${result.overall}%.`
  if (!strongest || !focus || skills.length < 2) {
    return `${base} ${strongest ? `Main area assessed: ${strongest.skill} (${strongest.score}%).` : ''}`
  }
  return `${base} Strongest area: ${strongest.skill} (${strongest.score}%) — focus area to improve: ${focus.skill} (${focus.score}%).`
}
