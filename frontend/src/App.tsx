/**
 * App.tsx - Root component. Handles auth routing and layout.
 */
import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { AuthPage } from '@/components/auth/AuthPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

function AppContent() {
  const { isAuthenticated } = useAuthStore()
  const { isDark } = useTheme()  // Applies dark class to <html>
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AuthPage />
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="app"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-screen overflow-hidden bg-white dark:bg-gray-900"
      >
        {/* Left sidebar — hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex lg:w-72 lg:shrink-0">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Mobile sidebar */}
        <div className="lg:hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
          <main className="flex-1 overflow-hidden">
            <ChatWindow />
          </main>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
