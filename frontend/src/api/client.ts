import type { ApiSignalResponse } from '../types'
import type { ApiHealthResponse } from '../types'

const DEFAULT_API_BASE_URL = 'http://localhost:8000'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || DEFAULT_API_BASE_URL

const signalMessages: Partial<Record<string, string>> = {
  file_type_not_supported: 'This file type is not supported. Upload a PDF or TXT file.',
  file_size_exceeded: 'This file is larger than the backend allows.',
  file_upload_failed: 'The backend could not save the file. Please try again.',
  processing_failed: 'The backend could not start processing for this document.',
  not_found_files: 'No files were found for this project.',
  no_file_found_with_this_id: 'The uploaded file could not be found for processing.',
  project_not_found: 'This project could not be found.',
  vectordb_search_error: 'No indexed results were available for this query.',
  rag_answer_error: 'The assistant could not generate an answer from the indexed documents.',
  insert_into_vectordb_error: 'The backend could not index the processed chunks.',
}

export class ApiError extends Error {
  status?: number
  signal?: string
  details?: unknown

  constructor(message: string, options: { status?: number; signal?: string; details?: unknown } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.signal = options.signal
    this.details = options.details
  }
}

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong while contacting the backend.'
}

const getSignalMessage = (signal?: string, fallback?: string): string => {
  if (signal && signalMessages[signal]) {
    return signalMessages[signal]
  }

  return fallback || 'The backend returned an unexpected response.'
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new ApiError('The backend is unavailable. Check that FastAPI is running.')
  }

  const body = await parseResponseBody(response)
  const signal = typeof body === 'object' && body && 'signal' in body
    ? String((body as ApiSignalResponse).signal)
    : undefined

  if (!response.ok) {
    throw new ApiError(
      getSignalMessage(signal, `Backend request failed with HTTP ${response.status}.`),
      { status: response.status, signal, details: body },
    )
  }

  return body as T
}

export const ensureProjectId = (projectId: number): void => {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new ApiError('Enter a valid project ID before using this action.')
  }
}

export const healthCheck = (): Promise<ApiHealthResponse> => {
  return apiRequest<ApiHealthResponse>('/api/v1/')
}
