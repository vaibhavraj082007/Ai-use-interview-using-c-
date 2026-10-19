import { describe, it, expect, vi, beforeEach } from 'vitest'

// uploadCv uses fetch directly, not api. So we need to mock global fetch
beforeEach(() => {
  vi.restoreAllMocks()
})

describe('cv upload', () => {
  it('uploads and returns parsed result', async () => {
    const mockResult = { text: 'hello world', wordCount: 2, charCount: 11, format: 'pdf', fileName: 'cv.pdf', fileSize: 100 }
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ cv: mockResult }),
    } as any)

    const { uploadCv } = await import('@/lib/api')
    const result = await uploadCv({} as any)
    expect(result.text).toContain('hello')
  })
})
