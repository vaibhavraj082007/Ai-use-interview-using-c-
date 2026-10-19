import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  getAdminReport: vi.fn().mockResolvedValue({ report: { id: '1', candidateName: 'Test', role: 'Frontend', gradedAt: Date.now(), result: { overall: 85, band: 'excellent', summary: '', evaluations: [], skills: [], types: [], answered: 5, total: 5 }, events: [] } }),
  getAdminReports: vi.fn().mockResolvedValue({ reports: [{ id: '1', candidateName: 'Test', role: 'Frontend', gradedAt: Date.now(), overall: 85 }] }),
}))

import { getAdminReport, getAdminReports } from '@/lib/api'

describe('report generation', () => {
  it('fetches admin report detail', async () => {
    const res = await getAdminReport('1')
    expect(res.report.result?.overall).toBe(85)
  })
  it('fetches admin reports list', async () => {
    const res = await getAdminReports()
    expect(res.reports.length).toBe(1)
  })
})
