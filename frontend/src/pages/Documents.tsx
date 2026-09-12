import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage, getProcessStatus, processAndPush, uploadDocument } from '../api'
import { Button } from '../components/Button'
import { Card, CardBody, CardHeader } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { FileUploader } from '../components/FileUploader'
import { LoadingState } from '../components/LoadingState'
import { CompletedProgress, IndeterminateProgress } from '../components/ProcessingProgress'
import { StatusBadge } from '../components/StatusBadge'
import { TechnicalDetails } from '../components/Foundation'
import { useProjectId } from '../hooks'
import type { ProcessStatusResponse } from '../types'

type UploadState = 'idle' | 'uploading' | 'uploaded' | 'error'
type ProcessState = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

const VALID_WORKFLOW_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const
type WorkflowStatus = (typeof VALID_WORKFLOW_STATUSES)[number]

const POLL_INTERVAL_MS = 3000

interface SessionDocument {
  id: string
  name: string
  type: string
  size: number
  uploadState: 'uploaded' | 'error'
  processState: ProcessState
  fileId?: string
  taskId?: string
  error?: string
}

const SESSION_KEY = 'minirag-document-activity'

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fileExtension = (name: string) => name.split('.').pop()?.toUpperCase() || 'FILE'

const isValidWorkflowStatus = (value: unknown): value is WorkflowStatus =>
  typeof value === 'string' && (VALID_WORKFLOW_STATUSES as readonly string[]).includes(value)

const workflowStatusToProcessState = (status: WorkflowStatus): ProcessState => {
  if (status === 'pending') return 'queued'
  if (status === 'processing') return 'processing'
  if (status === 'completed') return 'completed'
  return 'failed'
}

const processStateLabel = (state: ProcessState): string => {
  if (state === 'queued') return 'Queued'
  if (state === 'processing') return 'Processing'
  if (state === 'completed') return 'Completed'
  if (state === 'failed') return 'Failed'
  return 'Uploaded'
}

const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {children}
  </svg>
)

const statusFor = (
  document: SessionDocument,
): { label: string; status: 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed' } => {
  if (document.uploadState === 'error') return { label: 'Upload failed', status: 'failed' }
  if (document.processState === 'queued') return { label: 'Queued', status: 'queued' }
  if (document.processState === 'processing') return { label: 'Processing', status: 'processing' }
  if (document.processState === 'completed') return { label: 'Completed', status: 'completed' }
  if (document.processState === 'failed') return { label: 'Failed', status: 'failed' }
  return { label: 'Uploaded', status: 'uploaded' }
}

const ActivityRow: React.FC<{
  document: SessionDocument
  onProcess: () => void
  onRetry: () => void
  onClear: () => void
}> = ({ document, onProcess, onRetry, onClear }) => {
  const status = statusFor(document)
  const isInProgress = document.processState === 'queued' || document.processState === 'processing'

  return (
    <div className="flex flex-col gap-4 border-b border-border px-5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-primary">
          <Icon>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 13h6M9 17h4" />
          </Icon>
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-primary-text">{document.name}</p>
          <p className="mt-1 font-mono text-xs text-muted">
            {fileExtension(document.name)} <span className="font-sans">·</span> {formatFileSize(document.size)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <StatusBadge status={status.status}>{status.label}</StatusBadge>
        {document.uploadState === 'uploaded' && document.processState === 'idle' && (
          <Button size="sm" variant="secondary" onClick={onProcess}>
            Process and index
          </Button>
        )}
        {document.processState === 'failed' && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
        {!isInProgress && (
          <Button size="sm" variant="ghost" onClick={onClear} aria-label={`Remove ${document.name} from session activity`}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

export const Documents: React.FC = () => {
  const projectId = useProjectId()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [processState, setProcessState] = useState<ProcessState>('idle')
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [workflowTaskId, setWorkflowTaskId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activity, setActivity] = useState<SessionDocument[]>(() => {
    try {
      const saved = window.sessionStorage.getItem(SESSION_KEY)
      return saved ? (JSON.parse(saved) as SessionDocument[]) : []
    } catch {
      return []
    }
  })

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPollingRef = useRef(false)
  const pollInFlightRef = useRef(false)
  const activePollTaskRef = useRef<string | null>(null)

  useEffect(() => {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(activity))
  }, [activity])

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      isPollingRef.current = false
      activePollTaskRef.current = null
    }
  }, [])

  const isSupportedFile = (file: File) =>
    file.type === 'text/plain' || file.type === 'application/pdf' || /\.(txt|pdf)$/i.test(file.name)

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    isPollingRef.current = false
    activePollTaskRef.current = null
  }, [])

  const clearSelection = () => {
    stopPolling()
    setSelectedFile(null)
    setUploadedFileId(null)
    setWorkflowTaskId(null)
    setUploadState('idle')
    setProcessState('idle')
    setErrorMessage(null)
  }

  const handleFileSelect = (file: File) => {
    clearSelection()
    if (!isSupportedFile(file)) {
      setUploadState('error')
      setErrorMessage('This file type is not supported. Upload a PDF or TXT file.')
      return
    }
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploadState('uploading')
    setErrorMessage(null)
    try {
      const response = await uploadDocument(projectId, selectedFile)
      const fileId = response?.file_id
      setUploadedFileId(fileId)
      setUploadState('uploaded')
      setActivity((current) => [
        {
          id: fileId || `${selectedFile.name}-${Date.now()}`,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          uploadState: 'uploaded',
          processState: 'idle',
          fileId,
        },
        ...current,
      ])
    } catch (error) {
      setUploadState('error')
      setErrorMessage(getApiErrorMessage(error))
    }
  }

  const updateActivity = useCallback((fileId: string | null, patch: Partial<SessionDocument>) => {
    setActivity((current) => current.map((item) => (item.fileId === fileId ? { ...item, ...patch } : item)))
  }, [])

  const applyWorkflowStatus = useCallback(
    (status: ProcessStatusResponse, fileId: string | null) => {
      const nextState = workflowStatusToProcessState(status.status)

      if (nextState === 'failed') {
        const message = status.message || 'Processing failed'
        setProcessState('failed')
        setErrorMessage(message)
        updateActivity(fileId, { processState: 'failed', error: message })
        return 'terminal' as const
      }

      if (nextState === 'completed') {
        setProcessState('completed')
        setErrorMessage(null)
        updateActivity(fileId, { processState: 'completed', error: undefined })
        return 'terminal' as const
      }

      setProcessState(nextState)
      setErrorMessage(null)
      updateActivity(fileId, { processState: nextState, error: undefined })
      return 'continue' as const
    },
    [updateActivity],
  )

  const startPolling = useCallback(
    (taskId: string, fileId: string | null) => {
      stopPolling()
      isPollingRef.current = true
      activePollTaskRef.current = taskId

      const pollStatus = async () => {
        if (!isPollingRef.current || activePollTaskRef.current !== taskId) return
        if (pollInFlightRef.current) return

        pollInFlightRef.current = true
        try {
          const status = await getProcessStatus(projectId, taskId)
          if (!isPollingRef.current || activePollTaskRef.current !== taskId) return

          if (!status || !isValidWorkflowStatus(status.status)) {
            throw new Error('Received an unexpected processing status from the server.')
          }

          const outcome = applyWorkflowStatus(status, fileId)
          if (outcome === 'terminal') {
            stopPolling()
          }
        } catch (error) {
          if (!isPollingRef.current || activePollTaskRef.current !== taskId) return
          const message = getApiErrorMessage(error)
          setProcessState('failed')
          setErrorMessage(message)
          updateActivity(fileId, { processState: 'failed', error: message })
          stopPolling()
        } finally {
          pollInFlightRef.current = false
        }
      }

      void pollStatus()
      pollingIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS)
    },
    [projectId, applyWorkflowStatus, stopPolling, updateActivity],
  )

  const handleProcess = async (fileId = uploadedFileId) => {
    if (!fileId || processState === 'queued' || processState === 'processing') return

    stopPolling()
    setProcessState('queued')
    setErrorMessage(null)
    setWorkflowTaskId(null)
    updateActivity(fileId, { processState: 'queued', error: undefined, taskId: undefined })

    try {
      const response = await processAndPush(projectId, {
        file_id: fileId,
        chunk_size: 100,
        overlap_size: 20,
        do_reset: 0,
      })
      const taskId = response?.workflow_task_id || response?.task_id || null

      if (!taskId) {
        const message = 'Processing was accepted but no workflow task ID was returned.'
        setProcessState('failed')
        setErrorMessage(message)
        updateActivity(fileId, { processState: 'failed', error: message })
        return
      }

      setWorkflowTaskId(taskId)
      updateActivity(fileId, { taskId })
      startPolling(taskId, fileId)
    } catch (error) {
      const message = getApiErrorMessage(error)
      setProcessState('failed')
      setErrorMessage(message)
      updateActivity(fileId, { processState: 'failed', error: message })
    }
  }

  const handleReset = () => clearSelection()
  const retryActivity = (document: SessionDocument) => {
    setUploadedFileId(document.fileId || null)
    setProcessState('idle')
    void handleProcess(document.fileId)
  }
  const clearActivity = (id: string) => setActivity((current) => current.filter((item) => item.id !== id))

  const isProcessingInProgress = processState === 'queued' || processState === 'processing'

  return (
    <div className="mx-auto max-w-[1500px] space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">Knowledge ingestion</p>
          <h1 className="text-3xl font-semibold tracking-tight text-primary-text">Documents</h1>
          <p className="mt-2 max-w-2xl text-sm text-secondary-text">
            Upload sources and request indexing into your project knowledge base.
          </p>
          <p className="mt-3 font-mono text-xs text-muted">Project ID: {projectId}</p>
        </div>
        <Button onClick={() => document.getElementById('document-upload-zone')?.focus()}>Upload document</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-blue-50 p-2 text-primary dark:bg-blue-950">
                <Icon>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                </Icon>
              </div>
              <div>
                <h2 className="font-semibold text-primary-text">Upload a source</h2>
                <p className="mt-1 text-xs text-secondary-text">PDF and TXT files are supported.</p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <FileUploader
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onRemoveFile={clearSelection}
              isUploading={uploadState === 'uploading'}
            />
            <div id="document-upload-zone" tabIndex={-1} className="sr-only" aria-label="Document upload area" />
            {uploadState === 'uploading' && <LoadingState message="Uploading document..." size="sm" />}
            {uploadState === 'error' && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                {errorMessage}
              </div>
            )}
            {selectedFile && uploadState === 'idle' && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => void handleUpload()}>Upload document</Button>
                <Button variant="ghost" onClick={clearSelection}>
                  Cancel
                </Button>
              </div>
            )}
            {selectedFile && uploadState === 'uploaded' && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <StatusBadge status="uploaded">Document uploaded</StatusBadge>
                <Button
                  variant="secondary"
                  onClick={() => void handleProcess()}
                  disabled={!uploadedFileId || isProcessingInProgress}
                >
                  Process and index
                </Button>
                <Button variant="ghost" onClick={clearSelection} disabled={isProcessingInProgress}>
                  Clear
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-primary-text">Ingestion workflow</h2>
            <p className="mt-1 text-xs text-secondary-text">Track processing status in real time.</p>
          </CardHeader>
          <CardBody>
            {uploadState !== 'uploaded' ? (
              <EmptyState
                title="Select a document to begin"
                description="After upload, you can request processing and indexing for the selected file."
                className="p-2"
              />
            ) : isProcessingInProgress ? (
              <div className="space-y-5" role="status" aria-live="polite">
                <div className="flex items-start gap-3">
                  <StatusBadge status={processState === 'queued' ? 'queued' : 'processing'}>
                    {processStateLabel(processState)}
                  </StatusBadge>
                  <div>
                    <h3 className="font-semibold text-primary-text">
                      {processState === 'queued' ? 'Document queued' : 'Document processing'}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-secondary-text">
                      {processState === 'queued'
                        ? 'Your document is queued for processing and indexing.'
                        : 'Your document is being processed and indexed into the knowledge base.'}
                    </p>
                  </div>
                </div>
                <IndeterminateProgress
                  label={processState === 'queued' ? 'Queued for processing' : 'Processing document'}
                />
                {workflowTaskId && (
                  <TechnicalDetails>
                    <div>Workflow task ID: {workflowTaskId}</div>
                  </TechnicalDetails>
                )}
              </div>
            ) : processState === 'completed' ? (
              <div className="space-y-5" role="status">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-success ring-4 ring-green-100 dark:ring-green-950" />
                  <div>
                    <h3 className="font-semibold text-primary-text">Processing completed</h3>
                    <p className="mt-1 text-sm leading-6 text-secondary-text">
                      Your document has been successfully indexed into the knowledge base.
                    </p>
                  </div>
                </div>
                <div>
                  <CompletedProgress label="Processing complete" />
                  <p className="mt-2 text-xs text-muted">100% complete</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/search">
                    <Button>Search knowledge base</Button>
                  </Link>
                  <Link to="/knowledge-base">
                    <Button variant="secondary">View knowledge base</Button>
                  </Link>
                  <Button variant="ghost" onClick={handleReset}>
                    Upload another document
                  </Button>
                </div>
                {workflowTaskId && (
                  <TechnicalDetails>
                    <div>Workflow task ID: {workflowTaskId}</div>
                  </TechnicalDetails>
                )}
              </div>
            ) : processState === 'failed' ? (
              <div className="space-y-4">
                <ErrorState
                  title="Processing failed"
                  message={errorMessage || 'The document processing encountered an error.'}
                  onRetry={() => void handleProcess()}
                />
                {workflowTaskId && (
                  <TechnicalDetails>
                    <div>Workflow task ID: {workflowTaskId}</div>
                  </TechnicalDetails>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-success ring-4 ring-green-100 dark:ring-green-950" />
                  <div>
                    <h3 className="font-semibold text-primary-text">Document uploaded</h3>
                    <p className="mt-1 text-sm leading-6 text-secondary-text">
                      The source is ready. Request processing when you want to add it to the knowledge base.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-secondary-text">
                  <div className="rounded-md bg-surface-muted p-3">
                    <strong className="block text-primary">1</strong>Upload
                  </div>
                  <div className="rounded-md bg-surface-muted p-3">
                    <strong className="block text-primary">2</strong>Process
                  </div>
                  <div className="rounded-md bg-surface-muted p-3">
                    <strong className="block text-primary">3</strong>Index
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-semibold text-primary-text">Recent activity</h2>
              <p className="mt-1 text-xs text-secondary-text">
                Files uploaded during this browser session. This is not a complete project inventory.
              </p>
            </div>
            {activity.length > 0 && (
              <span className="font-mono text-xs text-muted">
                {activity.length} session item{activity.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </CardHeader>
        {activity.length === 0 ? (
          <CardBody>
            <EmptyState
              title="No session activity yet"
              description="Uploaded documents will appear here during this session."
              action={
                <Button onClick={() => document.getElementById('document-upload-zone')?.focus()}>
                  Upload your first document
                </Button>
              }
            />
          </CardBody>
        ) : (
          <div>
            {activity.map((document) => (
              <ActivityRow
                key={document.id}
                document={document}
                onProcess={() => {
                  setUploadedFileId(document.fileId || null)
                  void handleProcess(document.fileId)
                }}
                onRetry={() => retryActivity(document)}
                onClear={() => clearActivity(document.id)}
              />
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-sm text-secondary-text">
        <span>Ready to explore your indexed content?</span>
        <Link to="/search" className="font-medium text-primary hover:underline">
          Search knowledge base
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/assistant" className="font-medium text-primary hover:underline">
          Ask AI
        </Link>
      </div>
    </div>
  )
}
