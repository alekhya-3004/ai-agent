/**
 * chatStore.ts - Global chat state: conversations, messages, streaming state.
 */
import { create } from 'zustand'
import type { Conversation, Message, ReActStep, UploadedFile } from '@/types'

interface ChatStore {
  // Data
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>  // conversationId → messages[]

  // Streaming state
  isStreaming: boolean
  streamingMessageId: string | null
  streamingContent: string
  streamingReactSteps: ReActStep[]
  currentThought: string | null

  // Pending file attachments
  pendingFiles: UploadedFile[]

  // Actions
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  updateConversationTitle: (id: string, title: string) => void
  removeConversation: (id: string) => void
  setActiveConversation: (id: string | null) => void

  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (conversationId: string, message: Message) => void
  updateStreamingMessage: (content: string, steps: ReActStep[]) => void
  finalizeStreamingMessage: (messageId: string) => void

  startStreaming: (tempMessageId: string) => void
  stopStreaming: () => void
  appendToken: (token: string) => void
  addReActStep: (step: ReActStep) => void
  setCurrentThought: (thought: string | null) => void

  addPendingFile: (file: UploadedFile) => void
  removePendingFile: (fileId: string) => void
  clearPendingFiles: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  streamingMessageId: null,
  streamingContent: '',
  streamingReactSteps: [],
  currentThought: null,
  pendingFiles: [],

  // ── Conversation actions ──────────────────────────────────────────────

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversationTitle: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => key !== id)
      ),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  // ── Message actions ───────────────────────────────────────────────────

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),

  updateStreamingMessage: (content, steps) =>
    set({ streamingContent: content, streamingReactSteps: steps }),

  finalizeStreamingMessage: (messageId) => {
    const { streamingContent, streamingReactSteps, streamingMessageId, activeConversationId } = get()
    if (!activeConversationId || !streamingMessageId) return

    set((state) => ({
      messages: {
        ...state.messages,
        [activeConversationId]: (state.messages[activeConversationId] || []).map((m) =>
          m.id === streamingMessageId
            ? {
                ...m,
                id: messageId || m.id,
                content: streamingContent,
                react_steps: streamingReactSteps,
                isStreaming: false,
              }
            : m
        ),
      },
    }))
  },

  // ── Streaming actions ─────────────────────────────────────────────────

  startStreaming: (tempMessageId) =>
    set({
      isStreaming: true,
      streamingMessageId: tempMessageId,
      streamingContent: '',
      streamingReactSteps: [],
      currentThought: null,
    }),

  stopStreaming: () =>
    set({
      isStreaming: false,
      streamingMessageId: null,
      streamingContent: '',
      streamingReactSteps: [],
      currentThought: null,
    }),

  appendToken: (token) =>
    set((state) => ({ streamingContent: state.streamingContent + token })),

  addReActStep: (step) =>
    set((state) => ({
      streamingReactSteps: [...state.streamingReactSteps, step],
    })),

  setCurrentThought: (thought) => set({ currentThought: thought }),

  // ── File actions ──────────────────────────────────────────────────────

  addPendingFile: (file) =>
    set((state) => ({ pendingFiles: [...state.pendingFiles, file] })),

  removePendingFile: (fileId) =>
    set((state) => ({
      pendingFiles: state.pendingFiles.filter((f) => f.file_id !== fileId),
    })),

  clearPendingFiles: () => set({ pendingFiles: [] }),
}))
