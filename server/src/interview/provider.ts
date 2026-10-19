/**
 * Question provider contract.
 *
 * The provider interface lives on the server so an AI API key is never
 * exposed to the browser. Two implementations exist:
 *
 *   - ClaudeProvider — real AI generation via the Anthropic Messages API.
 *   - MockProvider   — deterministic, CV-aware generation with no API key.
 *
 * The active provider is chosen at request time (see ./index.ts), so the
 * app works out of the box in mock mode and upgrades to AI automatically
 * once ANTHROPIC_API_KEY is configured.
 */

export type QuestionType = 'coding' | 'conceptual' | 'oral'

export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface InterviewQuestion {
  id: string
  text: string
  skill: string
  topic: string
  type: QuestionType
  difficulty: Difficulty
  /** Optional starter code shown for 'coding' questions. */
  starterCode?: string
  /** Time limit override in seconds. */
  timeLimitSeconds?: number
}

/** Everything a provider needs to generate a set of questions. */
export interface GenerateInput {
  /** Raw CV text extracted from the uploaded resume (may be empty). */
  cvText: string
  /** Target job role, e.g. "Frontend". */
  role: string
  /** Preferred skills (already normalised by the caller). */
  skills: string[]
  difficulty: Difficulty
  /** How many questions to produce. */
  count: number
  /**
   * SHA-256 hashes (see ./question-hash.ts) of questions this user has
   * already been served — providers must avoid them whenever the bank has
   * unseen alternatives left. Providers may ignore this as a hard filter;
   * the caller re-checks and tops up.
   */
  exclude?: string[]
}

export type QuestionProviderName = 'mock' | 'claude'

/** 'ai' when backed by a model, 'mock' when generated locally. */
export type QuestionMode = 'mock' | 'ai'

export interface QuestionProvider {
  readonly name: QuestionProviderName
  readonly mode: QuestionMode
  generate(input: GenerateInput): Promise<InterviewQuestion[]>
}

/** Default per-question time limits by question type (seconds). */
export const TIME_LIMIT_SECONDS: Record<QuestionType, number> = {
  coding: 180,
  oral: 120,
  conceptual: 120,
}

const DIFFICULTY_ORDER: Difficulty[] = ['Easy', 'Medium', 'Hard']

/** Clamp an arbitrary string to a valid difficulty, defaulting to Medium. */
export function normalizeDifficulty(value: unknown): Difficulty {
  return (DIFFICULTY_ORDER as string[]).includes(value as string)
    ? (value as Difficulty)
    : 'Medium'
}

/**
 * Shift a requested difficulty one tier easier (Easy stays Easy).
 *
 * The candidate's selected label is preserved in the UI; only the questions
 * actually served move down a tier (Medium → Easy questions, Hard → Medium
 * questions) so interviews feel more approachable.
 */
export function easeOneTier(value: Difficulty): Difficulty {
  const shifted: Record<Difficulty, Difficulty> = {
    Easy: 'Easy',
    Medium: 'Easy',
    Hard: 'Medium',
  }
  return shifted[value]
}

/** Clamp an arbitrary string to a valid question type, defaulting to oral. */
export function normalizeType(value: unknown): QuestionType {
  return value === 'coding' || value === 'conceptual' || value === 'oral'
    ? value
    : 'oral'
}

/** Assign a stable id and default time limit to a partially-built question. */
export function finalizeQuestion(
  index: number,
  q: Omit<InterviewQuestion, 'id' | 'timeLimitSeconds'> & {
    timeLimitSeconds?: number
  }
): InterviewQuestion {
  return {
    ...q,
    id: `q-${index + 1}`,
    timeLimitSeconds: q.timeLimitSeconds ?? TIME_LIMIT_SECONDS[q.type],
  }
}
