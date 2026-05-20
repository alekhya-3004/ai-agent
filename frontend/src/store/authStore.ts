/**
 * authStore.ts - Global authentication state using Zustand.
 * Persists token in localStorage so the user stays logged in on refresh.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  // Actions
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (token, user) => {
        set({ token, user, isAuthenticated: true })
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
      },

      setUser: (user) => {
        set({ user })
      },
    }),
    {
      name: 'ai-agent-auth',  // localStorage key
      // Only persist these fields (don't persist derived state)
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
