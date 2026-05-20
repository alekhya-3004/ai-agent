/**
 * MessageBubble.tsx - Renders a single chat message (user or assistant).
 * Assistant messages support markdown + syntax highlighting + ReAct steps.
 */
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { User, Bot, Copy, Check, Paperclip } from 'lucide-react'
import { useState } from 'react'
import type { Message, ReActStep } from '@/types'
import { ReActDisplay } from './ReActDisplay'
import { TypingIndicator } from './TypingIndicator'
import clsx from 'clsx'

interface MessageBubbleProps {
  message: Message
  isStreamingMessage?: boolean
  streamingContent?: string
  streamingReactSteps?: ReActStep[]
  currentThought?: string | null
}

export function MessageBubble({
  message,
  isStreamingMessage,
  streamingContent,
  streamingReactSteps,
  currentThought,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const displayContent = isStreamingMessage ? streamingContent || '' : message.content
  const displaySteps = isStreamingMessage ? streamingReactSteps || [] : message.react_steps || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={clsx('flex gap-3 px-4 py-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1',
        isUser
          ? 'bg-primary-600 text-white'
          : 'bg-gray-700 dark:bg-gray-800 text-primary-400'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message content */}
      <div className={clsx('flex flex-col max-w-[80%] min-w-0', isUser ? 'items-end' : 'items-start')}>

        {/* ReAct reasoning steps (only for assistant) */}
        {!isUser && (displaySteps.length > 0 || (isStreamingMessage && currentThought)) && (
          <div className="w-full mb-1">
            <ReActDisplay
              steps={displaySteps}
              isStreaming={isStreamingMessage}
              currentThought={currentThought}
            />
          </div>
        )}

        {/* Bubble */}
        <div className={clsx(
          'rounded-2xl px-4 py-3 relative',
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
        )}>
          {/* File attachments indicator */}
          {message.file_ids && message.file_ids.length > 0 && (
            <div className="flex items-center gap-1 mb-2 text-xs opacity-70">
              <Paperclip className="w-3 h-3" />
              <span>{message.file_ids.length} file{message.file_ids.length > 1 ? 's' : ''} attached</span>
            </div>
          )}

          {/* Typing indicator while waiting for first token */}
          {isStreamingMessage && !displayContent && (
            <TypingIndicator />
          )}

          {/* Message text */}
          {displayContent && (
            isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const inline = !match
                      return inline ? (
                        <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-sm font-mono" {...props}>
                          {children}
                        </code>
                      ) : (
                        <div className="relative group/code">
                          <CopyButton text={String(children)} />
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            className="!rounded-xl !text-sm !my-0"
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      )
                    },
                    // Style tables
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2">
                        <table className="min-w-full border-collapse text-sm">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 font-semibold text-left">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
                {/* Streaming cursor */}
                {isStreamingMessage && (
                  <motion.span
                    className="inline-block w-0.5 h-4 bg-primary-400 ml-0.5 -mb-0.5"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                )}
              </div>
            )
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

/** Copy-to-clipboard button for code blocks */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover/code:opacity-100 transition-all z-10"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}
