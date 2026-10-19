import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Interview from '@/pages/candidate/Interview'
import { gradeInterviewRemote } from '@/lib/api'
import type { InterviewQuestion } from '@/features/interview/questionEngine'

const QUESTIONS: InterviewQuestion[] = [
  {
    id: 'q-1',
    text: 'What is a closure in JavaScript?',
    skill: 'JavaScript',
    topic: 'Basics',
    type: 'conceptual',
    difficulty: 'Easy',
    timeLimitSeconds: 120,
  },
  {
    id: 'q-2',
    text: 'Tell me about a challenging bug you fixed.',
    skill: 'JavaScript',
    topic: 'Basics',
    type: 'oral',
    difficulty: 'Easy',
    timeLimitSeconds: 120,
  },
]

vi.mock('@/features/interview/questionEngine', () => ({
  generateQuestions: vi.fn(async () => ({
    mode: 'mock',
    provider: 'mock',
    questions: QUESTIONS,
  })),
  QUESTION_TYPE_META: {
    coding: { label: 'Coding', color: '', bgColor: '', icon: '', description: '' },
    conceptual: { label: 'Conceptual', color: '', bgColor: '', icon: '', description: '' },
    oral: { label: 'Oral', color: '', bgColor: '', icon: '', description: '' },
  },
}))

vi.mock('@/lib/api', () => ({
  gradeInterviewRemote: vi.fn(async () => ({ mode: 'mock', provider: 'mock', result: {} })),
}))

vi.mock('@monaco-editor/react', () => ({ default: () => null }))

function renderInterview() {
  return render(
    <MemoryRouter>
      <Interview />
    </MemoryRouter>
  )
}

describe('interview next button', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(
      'interviewly_setup',
      JSON.stringify({
        role: 'Frontend',
        difficulty: 'Easy',
        skills: ['React'],
        questionCount: 2,
      })
    )
  })

  it('shows the in-box Next button once an answer is typed and advances', async () => {
    const user = userEvent.setup()
    renderInterview()

    const textarea = await screen.findByPlaceholderText(/Type or dictate your answer/i)
    expect(screen.queryByRole('button', { name: /^Next/ })).not.toBeInTheDocument()

    await user.type(textarea, 'A closure is a function bundled with its scope.')
    const next = screen.getByRole('button', { name: /^Next/ })
    expect(next).toBeInTheDocument()

    await user.click(next)
    await waitFor(() =>
      expect(screen.getByText('Tell me about a challenging bug you fixed.')).toBeInTheDocument()
    )
  })

  it('sends speech metrics and proctoring events when grading on Finish', async () => {
    vi.mocked(gradeInterviewRemote).mockClear()
    const user = userEvent.setup()
    renderInterview()

    const textarea = await screen.findByPlaceholderText(/Type or dictate your answer/i)
    await user.type(textarea, 'A closure is a function bundled with its scope.')
    await user.click(screen.getAllByRole('button', { name: /^Next/ })[0])
    await waitFor(() =>
      expect(screen.getByText('Tell me about a challenging bug you fixed.')).toBeInTheDocument()
    )

    const spoken = screen.getByPlaceholderText(/Type or dictate your answer/i)
    await user.type(spoken, 'I tracked a race condition in our data loader.')
    await user.click(screen.getAllByRole('button', { name: /Finish/ })[0])

    await waitFor(() =>
      expect(gradeInterviewRemote).toHaveBeenCalledTimes(1)
    )
    const input = vi.mocked(gradeInterviewRemote).mock.calls[0]![0]

    // Written answers are excluded; the oral question always reports speech.
    expect(input.speech).toHaveLength(1)
    expect(input.speech?.[0]).toMatchObject({
      questionId: 'q-2',
      type: 'oral',
      confidence: null,
    })
    expect(input.speech?.[0]?.wordCount).toBeGreaterThan(0)
    expect(input.speech?.[0]?.spokenSeconds).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(input.events)).toBe(true)
  })
})
