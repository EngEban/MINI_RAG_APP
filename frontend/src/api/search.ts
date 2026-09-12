import { apiRequest, ensureProjectId } from './client'
import type { RagAnswerResponse, SearchRequest, SearchResponse } from '../types'

export const searchKnowledgeBase = (
  projectId: number,
  request: SearchRequest,
): Promise<SearchResponse> => {
  ensureProjectId(projectId)

  return apiRequest<SearchResponse>(`/api/v1/nlp/index/search/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
}

export const askRag = (
  projectId: number,
  request: SearchRequest,
): Promise<RagAnswerResponse> => {
  ensureProjectId(projectId)

  return apiRequest<RagAnswerResponse>(`/api/v1/nlp/index/answer/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
}
