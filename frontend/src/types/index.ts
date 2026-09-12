export type ApiSignal =
  | 'file_validate_successfully'
  | 'file_type_not_supported'
  | 'file_size_exceeded'
  | 'file_upload_success'
  | 'file_upload_failed'
  | 'processing_success'
  | 'processing_failed'
  | 'not_found_files'
  | 'no_file_found_with_this_id'
  | 'project_not_found'
  | 'insert_into_vectordb_error'
  | 'insert_into_vectordb_success'
  | 'vectordb_collection_retrieved'
  | 'vectordb_search_error'
  | 'vectordb_search_success'
  | 'rag_answer_error'
  | 'rag_answer_success'
  | 'data_push_task_ready'
  | 'process_and_push_workflow_ready'

export interface ApiHealthResponse {
  app_name: string
  app_version: string
}

export interface ApiSignalResponse {
  signal: ApiSignal
}

export interface UploadDocumentResponse extends ApiSignalResponse {
  file_id: string
}

export interface ProcessRequest {
  file_id?: string | null
  chunk_size?: number
  overlap_size?: number
  do_reset?: number
}

export interface ProcessResponse extends ApiSignalResponse {
  task_id?: string
  workflow_task_id?: string
}

export interface ProcessStatusResponse extends ApiSignalResponse {
  workflow_task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number | null
  message: string
}

export interface PushRequest {
  do_reset?: number
}

export interface SearchRequest {
  text: string
  limit?: number
}

export type SearchResultMetadata = Record<string, unknown>

export interface SearchResultItem {
  text: string
  score: number
  metadata?: SearchResultMetadata
}

export interface SearchResponse extends ApiSignalResponse {
  results: SearchResultItem[]
}

export interface RagAnswerResponse extends ApiSignalResponse {
  answer: string
  full_prompt?: string
  chat_history?: unknown
}

export interface IndexInfoResponse extends ApiSignalResponse {
  collection_info: unknown
}

export interface AppRouteContext {
  projectId: number
  onProjectIdChange: (id: number) => void
  direction: 'ltr' | 'rtl'
  onDirectionChange: (direction: 'ltr' | 'rtl') => void
}
