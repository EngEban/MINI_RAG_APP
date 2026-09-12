import React, { useState, useCallback, useRef } from 'react'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onRemoveFile: () => void
  isUploading?: boolean
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  selectedFile,
  onRemoveFile,
  isUploading = false
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={isUploading ? -1 : 0}
          aria-label="Choose a PDF or TXT document to upload"
          onKeyDown={(event) => {
            if (!isUploading && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
            isDragging
              ? 'border-primary bg-blue-50 dark:bg-blue-950/30'
              : 'border-border hover:border-primary hover:bg-surface-muted'
          }`}
        >
          <svg
            className="mx-auto mb-4 h-12 w-12 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-2 text-sm text-secondary-text">
            Drag and drop your file here, or
          </p>
          <label className="inline-block">
            <span className="cursor-pointer rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-hover">
              Choose File
            </span>
            <input
              type="file"
              ref={inputRef}
              className="sr-only"
              accept=".txt,.pdf"
              onChange={handleFileInput}
              disabled={isUploading}
            />
          </label>
          <p className="mt-2 text-xs text-muted">
            Supported formats: PDF, TXT
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-md bg-blue-50 p-3 text-primary dark:bg-blue-950">
                {selectedFile.type === 'application/pdf' ? (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="break-all font-medium text-primary-text">{selectedFile.name}</p>
                <p className="text-sm text-secondary-text">{selectedFile.type || 'Document'} · {formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={onRemoveFile}
                className="rounded-md p-2 text-secondary-text transition-colors hover:bg-surface-muted"
                aria-label="Remove selected document"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
