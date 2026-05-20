/**
 * InputBar.tsx - Message input area at the bottom of the chat.
 * Supports text input, file attachment, and keyboard shortcuts.
 */
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, X, Square } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/store/chatStore'
import { FileUpload } from '@/components/shared/FileUpload'
import clsx from 'clsx'

export function InputBar() {
  const [message, setMessage] = useState('')
  const [showFileUpload, setShowFileUpload] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, isStreaming } = useChat()
  const { pendingFiles } = useChatStore()

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || isStreaming) return
    const text = message
    setMessage('')
    setShowFileUpload(false)
    // Auto-resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await sendMessage(text)
  }, [message, isStreaming, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const canSend = message.trim().length > 0 && !isStreaming

  return (
    <div className="border-t border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900 px-4 py-3">
      {/* File Upload Panel */}
      <AnimatePresence>
        {showFileUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <FileUpload />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending files preview */}
      <AnimatePresence>
        {!showFileUpload && pendingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap gap-2 mb-2"
          >
            {pendingFiles.map((f) => (
              <span
                key={f.file_id}
                className="inline-flex items-center gap-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full"
              >
                <Paperclip className="w-3 h-3" />
                {f.filename}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className={clsx(
        'flex items-end gap-2 rounded-2xl border px-4 py-2',
        'bg-gray-50 dark:bg-gray-800',
        'border-gray-200 dark:border-gray-600',
        'focus-within:border-primary-400 dark:focus-within:border-primary-500',
        'transition-colors duration-200'
      )}>
        {/* File attach button */}
        <button
          onClick={() => setShowFileUpload((v) => !v)}
          className={clsx(
            'p-1.5 rounded-lg transition-colors mb-0.5 shrink-0',
            showFileUpload || pendingFiles.length > 0
              ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/30'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          )}
          title="Attach file"
        >
          {showFileUpload ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
          {pendingFiles.length > 0 && !showFileUpload && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full text-white text-[10px] flex items-center justify-center">
              {pendingFiles.length}
            </span>
          )}
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'AI is thinking...' : 'Message AI Agent... (Enter to send, Shift+Enter for new line)'}
          disabled={isStreaming}
          rows={1}
          className={clsx(
            'flex-1 resize-none bg-transparent outline-none text-sm',
            'text-gray-900 dark:text-gray-100 placeholder-gray-400',
            'max-h-[200px] overflow-y-auto',
            'disabled:opacity-50'
          )}
        />

        {/* Send / Stop button */}
        <motion.button
          onClick={handleSubmit}
          disabled={!canSend}
          whileTap={{ scale: 0.9 }}
          className={clsx(
            'p-2 rounded-xl transition-all duration-200 shrink-0 mb-0.5',
            canSend
              ? 'bg-primary-600 text-white hover:bg-primary-500 shadow-md shadow-primary-600/30'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
          title={isStreaming ? 'Stop' : 'Send message'}
        >
          {isStreaming ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
        AI can make mistakes. Verify important information.
      </p>
    </div>
  )
}
