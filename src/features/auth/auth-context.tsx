import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api } from '@/lib/api'

export type Role = 'candidate' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  /** True while the initial session (cookie) is being restored. */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the session from the httpOnly cookie on mount.
  useEffect(() => {
    let active = true

    api<{ user: User }>('/api/auth/me')
      .then((data) => {
        if (active) setUser(data.user)
      })
      .catch(() => {
        // 401 (not logged in) or network failure — treat as signed out.
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const data = await api<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      setUser(data.user)
      return data.user
    },
    []
  )

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      const data = await api<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: input,
      })
      setUser(data.user)
      return data.user
    },
    []
  )

  const logout = useCallback(async (): Promise<void> => {
    // Clear local state immediately for a snappy UI.
    setUser(null)
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {
      // The cookie may already be gone; local state is cleared regardless.
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      loading,
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
