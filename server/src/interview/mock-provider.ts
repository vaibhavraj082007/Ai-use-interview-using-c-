import {
  QUESTION_BANK,
  FALLBACK_QUESTIONS,
  SKILL_DETECTORS,
  ALL_BANK_KEYS,
  domainForRole,
  type BankEntry,
} from './bank.js'
import { questionHash } from './question-hash.js'
import {
  finalizeQuestion,
  normalizeDifficulty,
  type GenerateInput,
  type InterviewQuestion,
  type QuestionProvider,
  type QuestionType,
  type Difficulty,
} from './provider.js'

/**
 * Mock question provider.
 *
 * Generates a balanced set of questions without any API key. It is CV-aware:
 * skills detected in the resume text are prioritised so the interview feels
 * tailored, even in mock mode. A reliable mix of coding and oral questions is
 * always enforced.
 */

/* ── CV skill detection ───────────────────────────────────────── */

/**
 * Scan raw CV text and return the bank skills it mentions.
 * Matching is case-insensitive and substring-based.
 */
export function detectSkillsFromCv(cvText: string): string[] {
  if (!cvText) return []
  const haystack = ` ${cvText.toLowerCase()} `
  const found: string[] = []

  for (const detector of SKILL_DETECTORS) {
    if (detector.patterns.some((p) => haystack.includes(p))) {
      found.push(detector.key)
    }
  }

  return found
}

/**
 * CV skills restricted to what the chosen role actually covers, e.g. a CV
 * mentioning Python + React under a "Frontend" role reports only React-ish
 * skills — nothing from outside the candidate's job.
 */
export function detectSkillsForRole(cvText: string, role: string): string[] {
  const domain = domainForRole(role)
  return detectSkillsFromCv(cvText).filter((key) => domain.includes(key))
}

/** Human-friendly label for a bank skill key, e.g. "node.js" → "Node.js". */
export function labelFor(skillKey: string): string {
  const special: Record<string, string> = {
    'node.js': 'Node.js',
    'rest apis': 'REST APIs',
    'ml basics': 'ML Basics',
    'data viz': 'Data Viz',
    'ci/cd': 'CI/CD',
    css: 'CSS',
    html: 'HTML',
    sql: 'SQL',
    auth: 'Auth',
    pandas: 'Pandas',
    python: 'Python',
    docker: 'Docker',
    react: 'React',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    testing: 'Testing',
    caching: 'Caching',
    webpack: 'Webpack',
    statistics: 'Statistics',
    accessibility: 'Accessibility',
    etl: 'ETL',
  }
  return special[skillKey] ?? skillKey
}

/* ── Selection helpers ────────────────────────────────────────── */

type Scored = BankEntry & { skill: string }

/** Canonical easy → hard ordering used for difficulty ranking. */
const ORDER: Difficulty[] = ['Easy', 'Medium', 'Hard']

/** Build a pool of bank entries for the prioritised skills. */
function buildPool(orderedSkills: string[]): Scored[] {
  const pool: Scored[] = []
  for (const key of orderedSkills) {
    const entries = QUESTION_BANK[key]
    if (!entries) continue
    for (const entry of entries) {
      pool.push({ ...entry, skill: labelFor(key) })
    }
  }
  return pool
}

/**
 * Rank candidates by closeness to the requested difficulty — but never
 * prefer a harder question over an easier one: at-or-below the target come
 * first (closest first), anything harder is only used as a last resort.
 */
function rankScore(d: Difficulty, targetIdx: number): number {
  const idx = ORDER.indexOf(d)
  return idx <= targetIdx ? targetIdx - idx : targetIdx + 1 + (idx - targetIdx)
}

function sortByDifficulty<T extends { difficulty: Difficulty }>(
  items: T[],
  target: Difficulty
): T[] {
  const targetIdx = ORDER.indexOf(target)
  return [...items].sort(
    (a, b) => rankScore(a.difficulty, targetIdx) - rankScore(b.difficulty, targetIdx)
  )
}

/** Fisher–Yates shuffle (in place). */
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i] as T
    arr[i] = arr[j] as T
    arr[j] = tmp
  }
}

/**
 * Target mix across question types: exactly 2 spoken (oral) questions that
 * the AI judges on duration/confidence, and the rest written — split roughly
 * evenly between coding and conceptual.
 */
function typeQuota(count: number): Record<QuestionType, number> {
  const oral = count >= 3 ? 2 : Math.max(0, count - 1)
  const written = count - oral
  const coding = Math.round(written / 2)
  const conceptual = written - coding
  return { coding, oral, conceptual }
}

/* ── Provider ─────────────────────────────────────────────────── */

export const mockProvider: QuestionProvider = {
  name: 'mock',
  mode: 'mock',
  generate: async (input: GenerateInput): Promise<InterviewQuestion[]> => {
    const { cvText, skills, difficulty, count } = input

    // 1. Determine skill priority: CV-detected skills first, then requested —
    //    both strictly restricted to what the chosen role covers.
    const domain = domainForRole(input.role)
    const inDomain = (key: string) => domain.includes(key)
    const detected = detectSkillsForRole(cvText, input.role)
    const requested = skills
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && inDomain(s))

    const ordered: string[] = []
    const seen = new Set<string>()
    for (const key of [...detected, ...requested]) {
      if (seen.has(key) || !ALL_BANK_KEYS.includes(key)) continue
      seen.add(key)
      ordered.push(key)
    }
    // If nothing matched (empty CV / unknown skills), fall back to the role's
    // own skill set — never to skills outside the candidate's job.
    if (ordered.length === 0) ordered.push(...domain)

    // 2. Rank candidates: questions at or below the target difficulty come
    //    first (easiest of that band before anything harder), so an "Easy"
    //    interview only reaches for harder questions as a last resort.
    const target = normalizeDifficulty(difficulty)
    const targetIdx = ORDER.indexOf(target)
    const inBand = (q: { difficulty: Difficulty }) =>
      ORDER.indexOf(q.difficulty) <= targetIdx

    const poolFull = sortByDifficulty(buildPool(ordered), target)
    const restFull = sortByDifficulty(
      buildPool(domain.filter((k) => !ordered.includes(k))),
      target
    )

    /**
     * Run the full balanced selection over the given candidate lists.
     * Extracted so exclusion can be attempted first and the same steps
     * re-run unfiltered when the unseen pool runs dry.
     */
    function select(
      pool: Scored[],
      rest: Scored[],
      fallback: BankEntry[]
    ): Scored[] {
      const used = new Set<string>()
      const selected: Scored[] = []

      /** Take up to `n` unused candidates from a pre-ranked list. */
      function take(candidates: Scored[], n: number): void {
        for (const q of candidates) {
          if (selected.length >= count || n <= 0) return
          if (used.has(q.text)) continue
          selected.push(q)
          used.add(q.text)
          n--
        }
      }

      // 3. Balanced type mix drawn from questions inside the band.
      const quota = typeQuota(count)
      for (const qType of ['coding', 'oral', 'conceptual'] as QuestionType[]) {
        take(
          pool.filter((q) => q.type === qType && inBand(q)),
          quota[qType]
        )
      }

      // 3b. Top up any unfilled oral quota (spoken questions are mandatory):
      //     in-band first, then anywhere in the bank, closer difficulties first.
      const oralMissing = () =>
        Math.max(0, quota.oral - selected.filter((q) => q.type === 'oral').length)
      take(pool.filter((q) => q.type === 'oral' && inBand(q)), oralMissing())
      take(rest.filter((q) => q.type === 'oral' && inBand(q)), oralMissing())
      take(pool.filter((q) => q.type === 'oral' && !inBand(q)), oralMissing())
      take(rest.filter((q) => q.type === 'oral' && !inBand(q)), oralMissing())

      // 3c. Top up any unfilled coding quota so the written half stays split
      //     evenly between coding and conceptual (in band first).
      const codingMissing = () =>
        Math.max(
          0,
          quota.coding - selected.filter((q) => q.type === 'coding').length
        )
      take(pool.filter((q) => q.type === 'coding' && inBand(q)), codingMissing())
      take(rest.filter((q) => q.type === 'coding' && inBand(q)), codingMissing())

      // 4. Fill remaining slots from the per-skill pool with written questions
      //    (keeps the mix at exactly `quota.oral` oral), still in band…
      take(
        pool.filter((q) => inBand(q) && q.type !== 'oral'),
        count - selected.length
      )

      // 5. …then widen to the whole bank (in band) so a thin per-skill pool
      //    never forces harder questions into an easy interview.
      take(
        rest.filter((q) => inBand(q) && q.type !== 'oral'),
        count - selected.length
      )

      // 6. Only if the bank runs dry: the closest questions above the band.
      take(
        pool.filter((q) => !inBand(q) && q.type !== 'oral'),
        count - selected.length
      )
      take(
        rest.filter((q) => !inBand(q) && q.type !== 'oral'),
        count - selected.length
      )

      // 7. Still short? Top up with generic fallbacks, easier ones first.
      take(
        sortByDifficulty(
          fallback.map((fb) => ({ ...fb, skill: 'General' })),
          target
        ),
        count - selected.length
      )

      // 8. Safety net: if even the written pool ran completely dry, accept any
      //    remaining question rather than returning fewer than `count`.
      take(pool, count - selected.length)
      take(rest, count - selected.length)

      return selected
    }

    // 9. Prefer questions the user has never been served. If excluding them
    //    would leave too few to fill the interview (user has effectively
    //    exhausted the bank for this role), relax the filter and repeat —
    //    always better to repeat than to return a short interview.
    const excluded = new Set(input.exclude ?? [])
    const isExcluded = (q: { text: string }) => excluded.has(questionHash(q.text))

    let selected = select(
      poolFull.filter((q) => !isExcluded(q)),
      restFull.filter((q) => !isExcluded(q)),
      FALLBACK_QUESTIONS.filter((q) => !isExcluded(q))
    )
    if (selected.length < count) selected = select(poolFull, restFull, FALLBACK_QUESTIONS)

    // 10. Shuffle so coding/oral/conceptual are interleaved, then finalise.
    shuffle(selected)
    return selected
      .slice(0, count)
      .map((q, idx) =>
        finalizeQuestion(idx, {
          text: q.text,
          skill: q.skill,
          topic: q.topic,
          type: q.type,
          difficulty: q.difficulty,
          ...(q.starterCode !== undefined ? { starterCode: q.starterCode } : {}),
        })
      )
  },
}
