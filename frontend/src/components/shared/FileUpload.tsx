/**
 * FileUpload.tsx - Drag and drop file upload component.
 * Shows upload progress and attaches files to the next message.
 */
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { filesAPI } from '@/services/api'
import { useChatStore } from '@/store/chatStore'
import clsx from 'clsx'

const ACCEPTED_TYPES = '.txt,.md,.csv,.json,.pdf,.py,.js,.ts,.yaml,.yml'
const MAX_SIZE_MB = 10

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null) // filename being uploaded
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { pendingFiles, addPendingFile, removePendingFile } = useChatStore()

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max size is ${MAX_SIZE_MB}MB.`)
      return
    }

    setError(null)
    setUploading(file.name)
    try {
      const result = await filesAPI.upload(file)
      addPendingFile(result)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }, [addPendingFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(uploadFile)
  }, [uploadFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(uploadFile)
    if (inputRef.current) inputRef.current.value = ''
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="w-full">
      {/* Drag drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-4 cursor-pointer',
          'transition-all duration-200 text-center',
          isDragging
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-400',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileInput}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-primary-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Uploading {uploading}...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drop files here or <span className="text-primary-500 font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-400">TXT, MD, CSV, JSON, PDF, Python, JS (max {MAX_SIZE_MB}MB)</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Uploaded files */}
      <AnimatePresence>
        {pendingFiles.map((file) => (
          <motion.div
            key={file.file_id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <FileText className="w-4 h-4 text-primary-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.filename}</p>
                <p className="text-xs text-gray-400">{formatSize(file.file_size)}</p>
              </div>
              <button
                onClick={() => removePendingFile(file.file_id)}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
