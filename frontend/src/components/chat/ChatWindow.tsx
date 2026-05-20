/**
 * ChatWindow.tsx - Main chat area showing messages and the input bar.
 * Handles scroll-to-bottom on new messages.
 */
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Bot, Zap, Calculator, Search } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'

export function ChatWindow() {
  const {
    activeConversationId,
    messages,
    streamingMessageId,
    streamingContent,
    streamingReactSteps,
    currentThought,
  } = useChatStore()

  const bottomRef = useRef<HTMLDivElement>(null)
  const activeMessages = activeConversationId ? (messages[activeConversationId] || []) : []

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length, streamingContent])

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {activeMessages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="max-w-3xl mx-auto w-full py-4">
            {activeMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreamingMessage={msg.id === streamingMessageId}
                streamingContent={msg.id === streamingMessageId ? streamingContent : undefined}
                streamingReactSteps={msg.id === streamingMessageId ? streamingReactSteps : undefined}
                currentThought={msg.id === streamingMessageId ? currentThought : undefined}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <InputBar />
      </div>
    </div>
  )
}

/** Welcome screen shown when no conversation is active */
function WelcomeScreen() {
  const suggestions = [
    { icon: Calculator, text: 'Calculate compound interest on $10,000 at 7% for 10 years' },
    { icon: Search, text: 'Search for the latest trends in AI development' },
    { icon: Zap, text: 'Explain the ReAct reasoning framework in AI agents' },
    { icon: Bot, text: 'Help me write a Python function to parse JSON files' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full px-4 py-12"
    >
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-primary-500/30">
        <Bot className="w-8 h-8 text-white" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        How can I help you today?
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-center mb-8 max-w-md">
        I'm an AI assistant with tools for calculation, web search, and file analysis.
        I'll show you my reasoning process step by step.
      </p>

      {/* Suggestion chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md transition-all text-left group"
            onClick={() => {
              // Fill the textarea with this suggestion
              const textarea = document.querySelector('textarea')
              if (textarea) {
                const nativeInputSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
                nativeInputSetter.call(textarea, s.text)
                textarea.dispatchEvent(new Event('input', { bubbles: true }))
                textarea.focus()
              }
            }}
          >
            <s.icon className="w-5 h-5 text-primary-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-gray-600 dark:text-gray-300">{s.text}</span>
          </motion.button>
        ))}
      </div>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-2 mt-8 justify-center">
        {['ReAct Reasoning', 'Tool Calling', 'Streaming', 'File Analysis', 'Memory'].map((feat) => (
          <span key={feat} className="px-3 py-1 rounded-full text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
            {feat}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
