import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Setup from '@/pages/candidate/Setup'
import { detectSkillsRemote } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  detectSkillsRemote: vi.fn(async () => ({
    role: 'Frontend',
    source: 'cv',
    skills: ['React', 'CSS'],
    roleDomain: ['React', 'TypeScript', 'CSS', 'HTML'],
  })),
}))

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/upload-cv" element={<p>Upload CV page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('setup CV requirement', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(detectSkillsRemote).mockClear()
  })

  it('redirects to upload when no CV is stored', () => {
    renderSetup()
    expect(screen.getByText('Upload CV page')).toBeInTheDocument()
  })

  it('redirects when the stored CV data is corrupt', () => {
    localStorage.setItem('interviewly_cv', 'not-json{')
    renderSetup()
    expect(screen.getByText('Upload CV page')).toBeInTheDocument()
  })

  it('proceeds with review when a CV is stored', async () => {
    localStorage.setItem(
      'interviewly_cv',
      JSON.stringify({
        fileName: 'resume.pdf',
        fileSize: 1024,
        role: 'Frontend',
        difficulty: 'Medium',
        text: 'React developer',
      })
    )
    renderSetup()
    // let the skill-detection request settle inside act
    await act(async () => {})
    expect(screen.getByText(/Reviewing your CV/i)).toBeInTheDocument()
    expect(screen.getByText('resume.pdf')).toBeInTheDocument()
    expect(screen.queryByText('Upload CV page')).not.toBeInTheDocument()
  })

  it('shows only the server-detected, role-relevant skills from the CV', async () => {
    vi.useFakeTimers()
    try {
      localStorage.setItem(
        'interviewly_cv',
        JSON.stringify({
          fileName: 'resume.pdf',
          fileSize: 1024,
          role: 'Frontend',
          difficulty: 'Medium',
          text: 'React developer who also cooks',
        })
      )
      renderSetup()

      // Flush the detection request and the simulated review phase.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3200)
      })

      expect(detectSkillsRemote).toHaveBeenCalledWith({
        cvText: 'React developer who also cooks',
        role: 'Frontend',
      })

      // CV-matched skills are shown…
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('CSS')).toBeInTheDocument()
      // …and nothing else: no whole-domain extras, no off-role skills.
      expect(screen.queryByText('TypeScript')).not.toBeInTheDocument()
      expect(screen.queryByText('Python')).not.toBeInTheDocument()
      expect(screen.queryByText('Node.js')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
