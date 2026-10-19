import { describe, it, expect } from 'vitest'
import {
  QUESTION_BANK,
  BANK_SIZE,
  FALLBACK_QUESTIONS,
  domainForRole,
} from '../../server/src/interview/bank'
import { mockProvider } from '../../server/src/interview/mock-provider'
import { questionHash } from '../../server/src/interview/question-hash'
import type { GenerateInput } from '../../server/src/interview/provider'

const baseInput: GenerateInput = {
  cvText: '',
  role: 'Frontend',
  skills: [],
  difficulty: 'Medium',
  count: 10,
}

function hashesOf(texts: string[]): Set<string> {
  return new Set(texts.map(questionHash))
}

describe('question bank size & quality', () => {
  it('holds at least 2000 unique questions', () => {
    const all = Object.values(QUESTION_BANK).flat().map((q) => q.text)
    expect(all.length).toBeGreaterThanOrEqual(2000)
    expect(new Set(all).size).toBe(all.length)
    expect(BANK_SIZE).toBe(all.length)
  })

  it('every entry has a valid type, difficulty, text and topic', () => {
    for (const entry of Object.values(QUESTION_BANK).flat()) {
      expect(['coding', 'conceptual', 'oral']).toContain(entry.type)
      expect(['Easy', 'Medium', 'Hard']).toContain(entry.difficulty)
      expect(entry.text.trim().length).toBeGreaterThan(20)
      expect(entry.topic.trim().length).toBeGreaterThan(0)
      if (entry.type === 'coding' && entry.starterCode !== undefined) {
        expect(entry.starterCode.length).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the hand-curated questions first (they are still present)', () => {
    const react = QUESTION_BANK.react ?? []
    expect(react.length).toBeGreaterThan(8)
    expect(react[0]?.text).toContain('Virtual DOM')
  })

  it('fallback questions are unique against the bank', () => {
    const bankTexts = hashesOf(Object.values(QUESTION_BANK).flat().map((q) => q.text))
    for (const fb of FALLBACK_QUESTIONS) {
      expect(bankTexts.has(questionHash(fb.text))).toBe(false)
    }
  })

  it('every role domain is fully covered by the bank', () => {
    for (const role of ['Frontend', 'Backend', 'Data', 'Full Stack']) {
      for (const key of domainForRole(role)) {
        expect(QUESTION_BANK[key]?.length ?? 0).toBeGreaterThan(0)
      }
    }
  })
})

describe('fresh questions per user (no repeats)', () => {
  it('two consecutive generations never overlap', async () => {
    const first = await mockProvider.generate(baseInput)
    const second = await mockProvider.generate({
      ...baseInput,
      exclude: [...hashesOf(first.map((q) => q.text))],
    })
    expect(first).toHaveLength(10)
    expect(second).toHaveLength(10)
    const firstHashes = hashesOf(first.map((q) => q.text))
    for (const q of second) expect(firstHashes.has(questionHash(q.text))).toBe(false)
  })

  it('keeps excluding across many sessions without ever shorting the interview', async () => {
    const served = new Set<string>()
    for (let round = 0; round < 5; round++) {
      const batch = await mockProvider.generate({ ...baseInput, exclude: [...served] })
      expect(batch).toHaveLength(10)
      const batchHashes = hashesOf(batch.map((q) => q.text))
      for (const h of batchHashes) {
        expect(served.has(h)).toBe(false)
        served.add(h)
      }
    }
    expect(served.size).toBe(50)
  })

  it('relaxes exclusion instead of returning a short set when the unseen pool is dry', async () => {
    // Exclude EVERYTHING the bank can offer — provider must still return 10.
    const everything = [
      ...Object.values(QUESTION_BANK).flat().map((q) => questionHash(q.text)),
      ...FALLBACK_QUESTIONS.map((q) => questionHash(q.text)),
    ]
    const batch = await mockProvider.generate({ ...baseInput, exclude: everything })
    expect(batch).toHaveLength(10)
    // Repeats are expected here — the set just must not be short.
    expect(new Set(batch.map((q) => q.text)).size).toBeGreaterThan(0)
  })

  it('maintains the 8-written + 2-oral mix while excluding', async () => {
    const first = await mockProvider.generate(baseInput)
    const second = await mockProvider.generate({
      ...baseInput,
      exclude: [...hashesOf(first.map((q) => q.text))],
    })
    const oral = second.filter((q) => q.type === 'oral').length
    expect(oral).toBe(2)
    expect(second.filter((q) => q.type !== 'oral')).toHaveLength(8)
  })
})

describe('question hashing', () => {
  it('is stable for cosmetic differences', () => {
    expect(questionHash('  What is React? ')).toBe(questionHash('what is react?'))
  })
  it('differs for different questions', () => {
    expect(questionHash('Q1')).not.toBe(questionHash('Q2'))
  })
})
