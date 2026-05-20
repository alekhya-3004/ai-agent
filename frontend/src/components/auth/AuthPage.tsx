/**
 * AuthPage.tsx - Login and registration page.
 * Toggles between login and register forms.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { authAPI } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import clsx from 'clsx'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let result: { access_token: string; user_id: string; username: string }

      if (mode === 'register') {
        result = await authAPI.register(email, username, password)
      } else {
        result = await authAPI.login(email, password)
      }

      // Fetch full user profile
      const user: User = {
        id: result.user_id,
        email,
        username: result.username,
        created_at: new Date().toISOString(),
      }

      login(result.access_token, user)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setError(Array.isArray(msg) ? msg[0]?.msg || 'Validation error' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative"
      >
        {/* Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700/50 shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">AI Agent</h1>
            <p className="text-gray-400 text-sm mt-1">
              {mode === 'login' ? 'Welcome back!' : 'Create your account'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl bg-gray-800 p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={clsx(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  mode === m
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <InputField
                    label="Username"
                    type="text"
                    value={username}
                    onChange={setUsername}
                    placeholder="cooluser123"
                    required
                    minLength={3}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={clsx(
                    'w-full px-4 py-3 pr-10 rounded-xl',
                    'bg-gray-800 border border-gray-600',
                    'text-white placeholder-gray-500 text-sm',
                    'focus:outline-none focus:border-primary-500',
                    'transition-colors duration-200'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className={clsx(
                'w-full py-3 rounded-xl font-semibold text-white',
                'bg-primary-600 hover:bg-primary-500',
                'transition-all duration-200 shadow-lg shadow-primary-600/30',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

function InputField({
  label, type, value, onChange, placeholder, required, minLength
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={clsx(
          'w-full px-4 py-3 rounded-xl',
          'bg-gray-800 border border-gray-600',
          'text-white placeholder-gray-500 text-sm',
          'focus:outline-none focus:border-primary-500',
          'transition-colors duration-200'
        )}
      />
    </div>
  )
}
