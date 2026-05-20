/**
 * useTheme.ts - Dark/light mode toggle hook.
 * Persists preference in localStorage and applies 'dark' class to <html>.
 */
import { useState, useEffect } from 'react'
import type { Theme } from '@/types'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check saved preference first, then system preference
    const saved = localStorage.getItem('ai-agent-theme') as Theme | null
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('ai-agent-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
