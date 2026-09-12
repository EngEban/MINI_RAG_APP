import { apiRequest, ensureProjectId } from './client'
import type { ProcessRequest, ProcessResponse, ProcessStatusResponse, UploadDocumentResponse } from '../types'

export const uploadDocument = (projectId: number, file: File): Promise<UploadDocumentResponse> => {
  ensureProjectId(projectId)

  const formData = new FormData()
  formData.append('file', file)

  return apiRequest<UploadDocumentResponse>(`/api/v1/data/upload/${projectId}`, {
    method: 'POST',
    body: formData,
  })
}

export const processFiles = (
  projectId: number,
  request: ProcessRequest = {},
): Promise<ProcessResponse> => {
  ensureProjectId(projectId)

  return apiRequest<ProcessResponse>(`/api/v1/data/process/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
}

export const processAndPush = (
  projectId: number,
  request: ProcessRequest = {},
): Promise<ProcessResponse> => {
  ensureProjectId(projectId)

  return apiRequest<ProcessResponse>(`/api/v1/data/process-and-push/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
}

export const getProcessStatus = (
  projectId: number,
  workflowTaskId: string,
): Promise<ProcessStatusResponse> => {
  ensureProjectId(projectId)

  return apiRequest<ProcessStatusResponse>(`/api/v1/data/process-status/${workflowTaskId}`, {
    method: 'GET',
  })
}
