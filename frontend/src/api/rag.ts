import { apiRequest, ensureProjectId } from './client'
import type { IndexInfoResponse, ProcessResponse, PushRequest } from '../types'

export const pushToIndex = (
  projectId: number,
  request: PushRequest = {},
): Promise<ProcessResponse> => {
  ensureProjectId(projectId)

  return apiRequest<ProcessResponse>(`/api/v1/nlp/index/push/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
}

export const getIndexInfo = (projectId: number): Promise<IndexInfoResponse> => {
  ensureProjectId(projectId)

  return apiRequest<IndexInfoResponse>(`/api/v1/nlp/index/info/${projectId}`)
}
