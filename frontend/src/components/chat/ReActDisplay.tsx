/**
 * ReActDisplay.tsx - Shows the ReAct reasoning steps (Thought → Tool → Result).
 * Collapsed by default, expandable to show full reasoning chain.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Wrench, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import type { ReActStep } from '@/types'
import clsx from 'clsx'

interface ReActDisplayProps {
  steps: ReActStep[]
  isStreaming?: boolean
  currentThought?: string | null
}

export function ReActDisplay({ steps, isStreaming, currentThought }: ReActDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Only show if there are steps or an active thought
  const hasContent = steps.length > 0 || (isStreaming && currentThought)
  if (!hasContent) return null

  // Count tool calls for the summary
  const toolCount = steps.filter((s) => s.type === 'tool_start').length

  return (
    <div className="my-2 rounded-xl border border-primary-500/20 bg-primary-950/30 dark:bg-primary-950/50 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-primary-900/20 transition-colors"
      >
        <Brain className="w-4 h-4 text-primary-400 shrink-0" />
        <span className="text-sm font-medium text-primary-300 flex-1">
          {isStreaming && !steps.find(s => s.type === 'tool_start') ? (
            <span className="flex items-center gap-2">
              Thinking<span className="inline-flex gap-0.5">{[0,1,2].map(i => (
                <motion.span key={i} className="inline-block w-1 h-1 rounded-full bg-primary-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}</span>
            </span>
          ) : (
            `Reasoning${toolCount > 0 ? ` · ${toolCount} tool${toolCount > 1 ? 's' : ''} used` : ''}`
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-primary-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-primary-400" />
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2 border-t border-primary-500/20">
              {steps.map((step, i) => (
                <StepItem key={i} step={step} />
              ))}

              {/* Currently streaming thought */}
              {isStreaming && currentThought && (
                <div className="flex gap-2 mt-2">
                  <Brain className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-primary-200/70 italic">{currentThought}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StepItem({ step }: { step: ReActStep }) {
  if (step.type === 'thought') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex gap-2"
      >
        <Brain className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 italic leading-relaxed">{step.content}</p>
      </motion.div>
    )
  }

  if (step.type === 'tool_start') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-lg bg-amber-900/20 border border-amber-500/20 p-2"
      >
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-mono font-semibold text-amber-300">{step.tool_name}</span>
        </div>
        {step.tool_input && (
          <pre className="text-xs text-amber-200/60 overflow-x-auto">
            {JSON.stringify(step.tool_input, null, 2)}
          </pre>
        )}
      </motion.div>
    )
  }

  if (step.type === 'tool_end') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex gap-2"
      >
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 font-mono leading-relaxed line-clamp-3">
          {step.tool_output}
        </p>
      </motion.div>
    )
  }

  return null
}
