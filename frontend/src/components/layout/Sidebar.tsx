/**
 * Sidebar.tsx - Left navigation panel with conversation history.
 * Shows all past conversations and allows creating new chats.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, Trash2, MessageSquare, X, Bot } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { chatAPI } from '@/services/api'
import type { Conversation } from '@/types'
import clsx from 'clsx'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { conversations, activeConversationId, setConversations, setActiveConversation, removeConversation, setMessages } = useChatStore()
  const { user } = useAuthStore()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load conversations on mount
  useEffect(() => {
    chatAPI.getConversations()
      .then(setConversations)
      .catch(console.error)
  }, [setConversations])

  const handleNewChat = () => {
    setActiveConversation(null)
    onClose()
  }

  const handleSelectConversation = async (conv: Conversation) => {
    setActiveConversation(conv.id)
    // Load messages for this conversation
    try {
      const messages = await chatAPI.getMessages(conv.id)
      setMessages(conv.id, messages)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
    onClose()
  }

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setDeletingId(convId)
    try {
      await chatAPI.deleteConversation(convId)
      removeConversation(convId)
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={clsx(
          'fixed left-0 top-0 h-full w-72 z-30',
          'bg-gray-900 dark:bg-gray-950 border-r border-gray-700/50',
          'flex flex-col shadow-2xl',
          'lg:relative lg:translate-x-0 lg:shadow-none',
          // On large screens, always show
          !isOpen && 'lg:flex'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary-400" />
            <span className="font-bold text-white text-lg">AI Agent</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl',
              'bg-primary-600 hover:bg-primary-500 text-white',
              'transition-all duration-200 font-medium',
              'hover:shadow-lg hover:shadow-primary-600/25 active:scale-95'
            )}
          >
            <MessageSquarePlus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 text-sm mt-8 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No conversations yet.</p>
              <p>Start a new chat!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => handleSelectConversation(conv)}
                    className={clsx(
                      'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1',
                      'transition-all duration-150 group relative',
                      activeConversationId === conv.id
                        ? 'bg-gray-700/80 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-primary-400 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{conv.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(conv.updated_at)}</p>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className={clsx(
                        'opacity-0 group-hover:opacity-100 p-1 rounded',
                        'text-gray-500 hover:text-red-400 transition-all',
                        deletingId === conv.id && 'opacity-100 animate-spin'
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* User Info Footer */}
        {user && (
          <div className="p-4 border-t border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                {user.username[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.username}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  )
}
