import { prisma } from '../db.js'
import type { Difficulty, QuestionType } from '../interview/provider.js'

export interface WeightsConfig {
  typeWeight: Record<QuestionType, number>
  difficultyWeight: Record<Difficulty, number>
}

const DEFAULT_WEIGHTS: WeightsConfig = {
  typeWeight: { coding: 1.4, conceptual: 1.1, oral: 1.0 },
  difficultyWeight: { Easy: 1.0, Medium: 1.25, Hard: 1.5 },
}

function mergeNumber(a: number, b: unknown): number {
  const n = typeof b === 'number' ? b : parseFloat(String(b))
  return Number.isFinite(n) && n > 0 ? n : a
}

export async function getWeights(): Promise<WeightsConfig> {
  try {
    const rec = await prisma.setting.findUnique({ where: { key: 'weights' } })
    if (!rec) return DEFAULT_WEIGHTS
    const parsed = JSON.parse(rec.value)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_WEIGHTS
    return {
      typeWeight: {
        coding: mergeNumber(DEFAULT_WEIGHTS.typeWeight.coding, parsed.typeWeight?.coding),
        conceptual: mergeNumber(DEFAULT_WEIGHTS.typeWeight.conceptual, parsed.typeWeight?.conceptual),
        oral: mergeNumber(DEFAULT_WEIGHTS.typeWeight.oral, parsed.typeWeight?.oral),
      },
      difficultyWeight: {
        Easy: mergeNumber(DEFAULT_WEIGHTS.difficultyWeight.Easy, parsed.difficultyWeight?.Easy),
        Medium: mergeNumber(DEFAULT_WEIGHTS.difficultyWeight.Medium, parsed.difficultyWeight?.Medium),
        Hard: mergeNumber(DEFAULT_WEIGHTS.difficultyWeight.Hard, parsed.difficultyWeight?.Hard),
      },
    }
  } catch {
    return DEFAULT_WEIGHTS
  }
}

export async function setWeights(cfg: Partial<WeightsConfig>): Promise<WeightsConfig> {
  const current = await getWeights()
  const next: WeightsConfig = {
    typeWeight: { ...current.typeWeight, ...(cfg.typeWeight || {}) },
    difficultyWeight: { ...current.difficultyWeight, ...(cfg.difficultyWeight || {}) },
  }
  await prisma.setting.upsert({
    where: { key: 'weights' },
    update: { value: JSON.stringify(next) },
    create: { key: 'weights', value: JSON.stringify(next) },
  })
  return next
}
