/**
 * Heuristic grader — deterministic answer scoring with no API key.
 *
 * Used when AI_PROVIDER=mock (or as the fallback whenever Claude fails), so
 * the result page always works. Scoring blends three signals:
 *
 *   1. coverage  — did the candidate write enough for the question type?
 *   2. relevance — does the answer contain the question's key concepts?
 *   3. substance — reasoning connectors, examples, code/structure signals?
 *
 * It is intentionally conservative and transparent; with ANTHROPIC_API_KEY
 * configured the Claude grader replaces it entirely.
 */

import {
  answerBand,
  missingEvaluation,
  type AnswerEvaluation,
  type Grader,
  type GradeQuestion,
  type GradingInput,
} from './grading.js'

const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'are', 'was', 'were', 'this', 'that',
  'these', 'those', 'with', 'from', 'into', 'when', 'what', 'which', 'how',
  'why', 'who', 'whom', 'have', 'has', 'had', 'but', 'not', 'can', 'could',
  'would', 'should', 'will', 'shall', 'may', 'might', 'must', 'about', 'does',
  'did', 'done', 'than', 'then', 'them', 'they', 'their', 'there', 'here',
  'been', 'being', 'its', 'our', 'out', 'get', 'got', 'set', 'use', 'used',
  'using', 'one', 'two', 'own', 'same', 'also', 'any', 'all', 'each', 'per',
  'via', 'etc', 'please', 'answer', 'question', 'candidate', 'explain',
])

const CONNECTORS = [
  'because', 'therefore', 'hence', 'example', 'instance', 'first', 'second',
  'finally', 'however', 'since', 'tradeoff', 'means', 'approach',
  'reason', 'result', 'benefit', 'drawback', 'instead', 'otherwise', 'step',
  'order', 'ensures', 'allows', 'handles',
]

const EXAMPLE_PHRASES = [
  'for example', 'e.g.', 'such as', 'for instance', 'in other words',
  'imagine', 'suppose', 'consider',
]

const CODE_TOKENS = [
  'function', 'return', 'const', 'let', 'var', '=>', 'class', 'import',
  'export', 'interface', 'type', 'async', 'await', 'if', 'else', 'for',
  'while', 'def', 'print', 'select', 'from', 'where', 'join', 'group',
  'create', 'insert', 'update', 'index', 'props', 'state', 'hook',
  'component', 'api', 'http', 'json', 'sql', 'css', 'html', 'dom',
]

const EXPECTED_WORDS: Record<GradeQuestion['type'], number> = {
  coding: 70,
  conceptual: 50,
  oral: 40,
}

const MAX_QUESTION_KEYS = 14

/* ── Text helpers ──────────────────────────────────────────────── */

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 0)
}

function keyTerms(question: GradeQuestion): string[] {
  const source = `${question.text} ${question.skill} ${question.topic}`
  const seen = new Set<string>()
  const keys: string[] = []
  for (const word of wordsOf(source)) {
    if (word.length < 3 || STOPWORDS.has(word)) continue
    if (seen.has(word)) continue
    seen.add(word)
    keys.push(word)
    if (keys.length >= MAX_QUESTION_KEYS) break
  }
  return keys
}

function countMatches(haystack: Set<string>, needles: string[]): string[] {
  return needles.filter((n) => haystack.has(n))
}

function countPhrases(lower: string, phrases: string[]): number {
  return phrases.filter((p) => lower.includes(p)).length
}

/** Code tokens match as whole words; symbols (=>, { … ) match as substrings. */
function countCodeTokens(answerSet: Set<string>, lower: string): number {
  return CODE_TOKENS.filter((token) =>
    /^[a-z0-9]+$/.test(token) ? answerSet.has(token) : lower.includes(token)
  ).length
}

/* ── Scoring ───────────────────────────────────────────────────── */

export function evaluateAnswer(
  question: GradeQuestion,
  rawAnswer: string
): AnswerEvaluation {
  const answer = rawAnswer.trim()
  if (!answer) return missingEvaluation(question.id)

  const lower = answer.toLowerCase()
  const answerWords = wordsOf(answer)
  const answerSet = new Set(answerWords)
  const wordCount = answerWords.length
  const expected = EXPECTED_WORDS[question.type]

  // 1. Coverage — depth of the write-up for this question type (0–30).
  const coverage = Math.min(1, wordCount / expected) * 30

  // 2. Relevance — key question concepts actually present (0–40).
  const keys = keyTerms(question)
  const matched = countMatches(answerSet, keys)
  const relevanceRatio =
    keys.length > 0 ? matched.length / Math.max(4, keys.length) : 0.4
  const relevance = Math.min(1, relevanceRatio) * 40

  // 3. Substance — reasoning, examples, code/structure (0–30).
  let substance = 0
  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  if (sentences.length >= 2) substance += 6
  if (wordCount >= expected) substance += 4

  const connectorHits = countMatches(new Set(answerWords), CONNECTORS)
  if (connectorHits.length >= 2) substance += 6

  const skillTerms = wordsOf(`${question.skill} ${question.topic}`)
  const skillMentioned = countMatches(answerSet, skillTerms)
  if (skillMentioned.length > 0) substance += 6

  const codeHits =
    question.type === 'coding' ? countCodeTokens(answerSet, lower) : 0

  if (question.type === 'coding') {
    if (codeHits >= 4) substance += 8
    else if (codeHits >= 2) substance += 4
  } else if (countPhrases(lower, EXAMPLE_PHRASES) > 0) {
    substance += 8
  }

  const score = Math.max(0, Math.min(100, Math.round(coverage + relevance + substance)))
  const band = answerBand(score)

  // ── Feedback strings ─────────────────────────────────────────
  const strengths: string[] = []
  const improvements: string[] = []

  if (wordCount >= expected) {
    strengths.push('Answered at a depth appropriate for this question type.')
  } else if (wordCount < Math.round(expected * 0.35)) {
    improvements.push(
      `Very short answer (${wordCount} words) — add detail, steps, and an example.`
    )
  } else {
    improvements.push('Expand the answer with more detail and a concrete example.')
  }

  if (relevanceRatio >= 0.6) {
    strengths.push(
      `Addresses the question directly (covered ${matched.length}/${keys.length} key concepts: ${matched
        .slice(0, 3)
        .join(', ')}).`
    )
  } else if (relevanceRatio >= 0.35) {
    strengths.push('Touches on the main concepts of the question.')
    improvements.push('Keep the answer anchored to the exact question asked.')
  } else {
    improvements.push(
      'The answer drifts from the question — restate the key terms and answer what was asked.'
    )
  }

  if (question.type === 'coding') {
    if (codeHits >= 4) {
      strengths.push('Includes concrete code/implementation detail.')
    } else {
      improvements.push('Add a short code snippet or pseudocode to make the solution concrete.')
    }
  } else if (countPhrases(lower, EXAMPLE_PHRASES) > 0) {
    strengths.push('Backs the explanation up with a concrete example.')
  } else {
    improvements.push('Support the explanation with a concrete example or scenario.')
  }

  if (connectorHits.length >= 2) {
    strengths.push('Explains the reasoning, not just the conclusion.')
  }
  if (skillMentioned.length > 0) {
    strengths.push(`Uses ${question.skill} terminology.`)
  }
  if (strengths.length === 0) strengths.push('Submitted a response for this question.')
  if (improvements.length === 0) {
    improvements.push('Structure the answer: approach first, then the details.')
  }

  const tip =
    band === 'excellent'
      ? 'The answer is complete and well structured — keep this level of detail.'
      : band === 'good'
        ? 'Solid answer; add one more example or edge case to make it excellent.'
        : band === 'average'
          ? 'The core idea is present, but important detail or reasoning is missing.'
          : 'The response misses key parts of the question and needs substantial depth.'

  return {
    questionId: question.id,
    score,
    band,
    strengths: strengths.slice(0, 5),
    improvements: improvements.slice(0, 5),
    feedback: `Covered ${Math.round(relevanceRatio * 100)}% of the question's key concepts in ${wordCount} words. ${tip}`,
  }
}

/* ── Grader ────────────────────────────────────────────────────── */

export const heuristicGrader: Grader = {
  name: 'heuristic',
  mode: 'heuristic',
  evaluate: async (input: GradingInput) => {
    const answerByQuestion = new Map(input.answers.map((a) => [a.questionId, a.answer]))
    const evaluations = input.questions.map(
      (q) => evaluateAnswer(q, answerByQuestion.get(q.id) ?? '')
    )
    return { evaluations }
  },
}
