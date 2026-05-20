// ─────────────────────────── Auth Types ────────────────────────────────

export interface User {
  id: string
  email: string
  username: string
  created_at: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// ─────────────────────────── Chat Types ────────────────────────────────

export interface ReActStep {
  type: 'thought' | 'tool_start' | 'tool_end' | 'answer'
  content?: string
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_output?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  react_steps?: ReActStep[]
  file_ids?: string[]
  created_at: string
  // Local state (not from DB)
  isStreaming?: boolean
  streamingContent?: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

// ─────────────────────────── SSE Event Types ───────────────────────────

export type SSEEventType =
  | 'conversation_id'
  | 'token'
  | 'thought'
  | 'tool_start'
  | 'tool_end'
  | 'done'
  | 'error'
  | 'message_saved'

export interface SSEEvent {
  type: SSEEventType
  content?: string
  conversation_id?: string
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_output?: string
  react_steps?: ReActStep[]
  message_id?: string
  error?: string
}

// ─────────────────────────── File Upload Types ─────────────────────────

export interface UploadedFile {
  file_id: string
  filename: string
  content_type: string | null
  file_size: number
}

// ─────────────────────────── UI Types ──────────────────────────────────

export type Theme = 'light' | 'dark'

export interface ChatInputState {
  message: string
  files: UploadedFile[]
}
