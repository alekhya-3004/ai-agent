/**
 * Header.tsx - Top navigation bar with theme toggle and user actions.
 */
import { Moon, Sun, Menu, LogOut, Bot } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { logout, user } = useAuthStore()
  const { isDark, toggleTheme } = useTheme()

  return (
    <header className={clsx(
      'h-14 flex items-center justify-between px-4',
      'bg-white dark:bg-gray-900',
      'border-b border-gray-200 dark:border-gray-700/50',
      'shrink-0 z-10'
    )}>
      {/* Left: Menu toggle + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <Bot className="w-5 h-5 text-primary-500" />
          <span className="font-semibold text-gray-900 dark:text-white">AI Agent</span>
        </div>
      </div>

      {/* Right: Theme toggle + logout */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.9 }}
          className={clsx(
            'p-2 rounded-xl transition-all duration-200',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'hover:text-gray-700 dark:hover:text-gray-200'
          )}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </motion.button>

        {/* User avatar + logout */}
        {user && (
          <div className="flex items-center gap-2 ml-1">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
              {user.username[0].toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className={clsx(
                'p-2 rounded-xl transition-all duration-200',
                'text-gray-500 dark:text-gray-400',
                'hover:bg-red-50 dark:hover:bg-red-900/20',
                'hover:text-red-600 dark:hover:text-red-400'
              )}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
