/**
 * api.ts - Axios instance and all API call functions.
 * All backend requests go through here.
 */
import axios from 'axios'
import type { User, Conversation, Message, UploadedFile } from '@/types'

// In development: Vite proxy handles /api → localhost:8000
// In production (Render): VITE_API_URL = https://your-backend.onrender.com
const API_BASE = import.meta.env.VITE_API_URL || ''

// Create axios instance pointed at our backend
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('ai-agent-auth')
  if (auth) {
    const { state } = JSON.parse(auth)
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`
    }
  }
  return config
})

// Redirect to login on 401 responses
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ai-agent-auth')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// ──────────────────────────── Auth API ────────────────────────────────────

export const authAPI = {
  register: async (email: string, username: string, password: string) => {
    const res = await api.post('/auth/register', { email, username, password })
    return res.data as { access_token: string; user_id: string; username: string }
  },

  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    return res.data as { access_token: string; user_id: string; username: string }
  },

  getMe: async () => {
    const res = await api.get('/auth/me')
    return res.data as User
  },
}

// ──────────────────────────── Chat API ────────────────────────────────────

export const chatAPI = {
  getConversations: async () => {
    const res = await api.get('/chat/conversations')
    return res.data.conversations as Conversation[]
  },

  getMessages: async (conversationId: string) => {
    const res = await api.get(`/chat/conversations/${conversationId}`)
    return res.data.messages as Message[]
  },

  deleteConversation: async (conversationId: string) => {
    await api.delete(`/chat/conversations/${conversationId}`)
  },
}

// ──────────────────────────── Files API ───────────────────────────────────

export const filesAPI = {
  upload: async (file: File): Promise<UploadedFile> => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as UploadedFile
  },
}

// ──────────────────────────── Streaming ───────────────────────────────────

/**
 * sendMessageStream - Sends a chat message and returns a ReadableStream.
 * Use this to process SSE events from the backend.
 */
export async function sendMessageStream(
  message: string,
  conversationId: string | null,
  fileIds: string[],
  token: string
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const response = await fetch(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      file_ids: fileIds.length > 0 ? fileIds : null,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  return response.body.getReader()
}

export default api
