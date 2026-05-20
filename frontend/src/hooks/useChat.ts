/**
 * useChat.ts - Core chat hook.
 * Handles sending messages, processing SSE streams, and updating the store.
 */
import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { sendMessageStream } from '@/services/api'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import type { Message, ReActStep, SSEEvent } from '@/types'

export function useChat() {
  const {
    activeConversationId,
    isStreaming,
    streamingContent,
    streamingReactSteps,
    currentThought,
    addMessage,
    setActiveConversation,
    addConversation,
    updateConversationTitle,
    startStreaming,
    stopStreaming,
    appendToken,
    addReActStep,
    setCurrentThought,
    finalizeStreamingMessage,
    clearPendingFiles,
    pendingFiles,
  } = useChatStore()

  const { token } = useAuthStore()

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isStreaming || !token) return

      const fileIds = pendingFiles.map((f) => f.file_id)
      clearPendingFiles()

      // Add user message immediately (optimistic UI)
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: messageText,
        file_ids: fileIds.length > 0 ? fileIds : undefined,
        created_at: new Date().toISOString(),
      }

      const convId = activeConversationId
      if (convId) {
        addMessage(convId, userMessage)
      }

      // Create a temporary streaming assistant message
      const tempAssistantId = `streaming-${uuidv4()}`
      const streamingMessage: Message = {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        created_at: new Date().toISOString(),
      }

      startStreaming(tempAssistantId)

      let resolvedConvId = convId

      try {
        const reader = await sendMessageStream(messageText, convId, fileIds, token)
        const decoder = new TextDecoder()
        let buffer = ''

        // If no active conversation, we need to wait for the backend to create one
        if (!resolvedConvId) {
          // We'll add the user message after we get the conversation_id event
        } else {
          addMessage(resolvedConvId, streamingMessage)
        }

        // Process the SSE stream
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE events are separated by double newlines
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''  // Keep incomplete line in buffer

          for (const chunk of lines) {
            const line = chunk.trim()
            if (!line.startsWith('data: ')) continue

            const jsonStr = line.slice(6)  // Remove "data: " prefix
            try {
              const event: SSEEvent = JSON.parse(jsonStr)
              await handleSSEEvent(event, resolvedConvId, userMessage, streamingMessage, tempAssistantId, (id) => {
                resolvedConvId = id
              })
            } catch {
              // Ignore parse errors for malformed events
            }
          }
        }
      } catch (error) {
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Something went wrong. Please try again.'}`,
          created_at: new Date().toISOString(),
        }
        if (resolvedConvId) {
          addMessage(resolvedConvId, errorMessage)
        }
      } finally {
        stopStreaming()
      }
    },
    [
      activeConversationId,
      isStreaming,
      token,
      pendingFiles,
      addMessage,
      startStreaming,
      stopStreaming,
      appendToken,
      addReActStep,
      setCurrentThought,
      finalizeStreamingMessage,
      setActiveConversation,
      addConversation,
      updateConversationTitle,
      clearPendingFiles,
    ]
  )

  // Inner function to handle each SSE event type
  async function handleSSEEvent(
    event: SSEEvent,
    resolvedConvId: string | null,
    userMessage: Message,
    streamingMessage: Message,
    tempAssistantId: string,
    setConvId: (id: string) => void
  ) {
    switch (event.type) {
      case 'conversation_id': {
        const newConvId = event.conversation_id!
        setConvId(newConvId)
        setActiveConversation(newConvId)

        // If this was a new conversation, add it to the list and add messages
        if (!resolvedConvId) {
          addConversation({
            id: newConvId,
            title: userMessage.content.slice(0, 50),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          addMessage(newConvId, { ...userMessage })
          addMessage(newConvId, { ...streamingMessage })
        }
        break
      }

      case 'token': {
        appendToken(event.content || '')
        break
      }

      case 'thought': {
        setCurrentThought(event.content || null)
        const step: ReActStep = { type: 'thought', content: event.content || '' }
        addReActStep(step)
        break
      }

      case 'tool_start': {
        setCurrentThought(null)
        const step: ReActStep = {
          type: 'tool_start',
          tool_name: event.tool_name,
          tool_input: event.tool_input,
          content: `Using ${event.tool_name}...`,
        }
        addReActStep(step)
        break
      }

      case 'tool_end': {
        const step: ReActStep = {
          type: 'tool_end',
          tool_name: event.tool_name,
          tool_output: event.tool_output,
          content: event.tool_output || '',
        }
        addReActStep(step)
        break
      }

      case 'done': {
        setCurrentThought(null)
        break
      }

      case 'message_saved': {
        finalizeStreamingMessage(event.message_id || tempAssistantId)
        // Update conversation title from first message
        if (resolvedConvId && userMessage.content) {
          updateConversationTitle(
            resolvedConvId,
            userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '')
          )
        }
        break
      }
    }
  }

  return {
    sendMessage,
    isStreaming,
    streamingContent,
    streamingReactSteps,
    currentThought,
  }
}
