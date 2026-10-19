import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Login from '@/pages/candidate/Login'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/auth-context'
import { ToastProvider } from '@/components/ui/toast'

vi.mock('@/lib/api', () => ({
  api: vi.fn((path: string) => {
    if (path === '/api/auth/me') return Promise.reject(new Error('unauthorized'))
    if (path === '/api/auth/login') return Promise.reject(new Error('Invalid email or password'))
    return Promise.reject(new Error('unknown'))
  })
}))

function renderLogin() {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

describe('login', () => {
  it('shows error on invalid credentials', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText(/Email/i), 'bad@example.com')
    await user.type(screen.getByLabelText(/Password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /Sign in/i }))
    await waitFor(() => expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument(), { timeout: 3000 })
  })
})
