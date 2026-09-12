import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage, getIndexInfo } from '../api'
import { Button } from '../components/Button'
import { Card, CardBody, CardHeader } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { StatusBadge } from '../components/StatusBadge'
import { TechnicalDetails } from '../components/Foundation'
import { useProjectId } from '../hooks'
import type { IndexInfoResponse } from '../types'

interface NormalizedCollection {
  recordCount: number | null
  collectionName: string | null
  tableInfo: Record<string, unknown> | null
}
type ViewState = 'loading' | 'error' | 'unavailable' | 'empty' | 'ready'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const normalizeCollection = (value: IndexInfoResponse['collection_info']): NormalizedCollection | null => {
  if (!isRecord(value)) return null
  const tableInfo = isRecord(value.table_info) ? value.table_info : null
  const rawCount = value.record_count
  const recordCount = typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount >= 0 ? rawCount : null
  const tableName = tableInfo?.tablename
  return { recordCount, collectionName: typeof tableName === 'string' ? tableName : null, tableInfo }
}
const stringifyValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Not available'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{children}</svg>
const Skeleton = ({ className = '' }: { className?: string }) => <div className={`animate-pulse rounded bg-surface-muted ${className}`} />

export const KnowledgeBase: React.FC = () => {
  const projectId = useProjectId()
  const [collection, setCollection] = useState<NormalizedCollection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const handleRefresh = useCallback(async () => {
    setIsLoading(true); setErrorMessage(null)
    try { const response = await getIndexInfo(projectId); setCollection(normalizeCollection(response?.collection_info)) }
    catch (error) { setCollection(null); setErrorMessage(getApiErrorMessage(error)) }
    finally { setIsLoading(false) }
  }, [projectId])
  useEffect(() => { void handleRefresh() }, [handleRefresh])
  const viewState: ViewState = isLoading ? 'loading' : errorMessage ? 'error' : !collection ? 'unavailable' : collection.recordCount === 0 ? 'empty' : collection.recordCount === null ? 'unavailable' : 'ready'
  const badgeStatus = viewState === 'loading' ? 'loading' : viewState === 'error' ? 'error' : viewState === 'ready' ? 'success' : viewState === 'empty' ? 'warning' : 'neutral'
  const badgeLabel = viewState === 'loading' ? 'Checking' : viewState === 'error' ? 'Unable to load' : viewState === 'ready' ? 'Ready' : viewState === 'empty' ? 'Empty' : 'Not available'
  return <div className="mx-auto max-w-[1500px] space-y-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">Index monitoring</p><h1 className="text-3xl font-semibold tracking-tight text-primary-text">Knowledge Base</h1><p className="mt-2 max-w-2xl text-sm text-secondary-text">Review the current vector index and its availability for search and AI answers.</p><p className="mt-3 font-mono text-xs text-muted">Project ID: {projectId}</p></div><Button onClick={() => void handleRefresh()} isLoading={isLoading}>Refresh</Button></div>
    <Card className="overflow-hidden"><div className="border-b border-border bg-surface-muted/60 px-6 py-6 lg:px-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-4"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${viewState === 'ready' ? 'bg-green-100 text-success dark:bg-green-950' : viewState === 'error' ? 'bg-red-100 text-danger dark:bg-red-950' : 'bg-blue-100 text-primary dark:bg-blue-950'}`}><Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v13H4V7Zm4-4h8v4H8V3Zm0 8h8M8 15h5" /></Icon></div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Current index</p><h2 className="mt-1 text-xl font-semibold text-primary-text">{viewState === 'ready' ? 'Knowledge base is ready' : viewState === 'empty' ? 'Knowledge base is empty' : viewState === 'unavailable' ? 'Knowledge base not created yet' : viewState === 'error' ? 'Knowledge base unavailable' : 'Checking knowledge base'}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-secondary-text">{viewState === 'ready' ? 'Indexed content is available for semantic search and grounded answers.' : viewState === 'empty' ? 'A collection exists, but it does not contain indexed records yet.' : viewState === 'unavailable' ? 'Upload and process documents to create an index for this project.' : viewState === 'error' ? 'We could not retrieve the current index state. Try refreshing the page.' : 'Retrieving the latest index information.'}</p></div></div><div className="sm:pt-1"><StatusBadge status={badgeStatus}>{badgeLabel}</StatusBadge></div></div></div>
      <CardBody>{viewState === 'loading' ? <div className="grid gap-5 sm:grid-cols-3"><div><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-8 w-20" /></div><div><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-5 w-28" /></div><div><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-5 w-32" /></div></div> : viewState === 'error' ? <ErrorState title="Could not load index information" message={errorMessage || 'The knowledge base information could not be loaded.'} onRetry={() => void handleRefresh()} className="p-2" /> : viewState === 'empty' ? <EmptyState title="No records are indexed yet" description="Upload a document and process it from Documents to start building this knowledge base." action={<Link to="/documents"><Button>Upload and process documents</Button></Link>} className="p-2" /> : viewState === 'unavailable' ? <EmptyState title="Knowledge base not created yet" description="This project has no available collection. Upload and process documents to get started." action={<Link to="/documents"><Button>Go to Documents</Button></Link>} className="p-2" /> : <div className="grid gap-5 sm:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Indexed vectors</p><p className="mt-2 text-3xl font-semibold text-primary-text">{collection?.recordCount ?? 'Not available'}</p><p className="mt-1 text-xs text-secondary-text">Records in the current index</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p><div className="mt-3"><StatusBadge status="success">Ready</StatusBadge></div><p className="mt-2 text-xs text-secondary-text">Available for retrieval</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Collection</p><p className="mt-2 break-words font-mono text-sm text-primary-text">{collection?.collectionName || 'Not available'}</p><p className="mt-1 text-xs text-secondary-text">Name returned by the API</p></div></div>}</CardBody></Card>
    {viewState === 'ready' && collection && <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><Card><CardHeader><h2 className="font-semibold text-primary-text">Index details</h2><p className="mt-1 text-xs text-secondary-text">Only values provided by the current API are shown.</p></CardHeader><CardBody><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-md border border-border bg-surface-muted p-4"><p className="text-xs text-muted">Indexed records</p><p className="mt-2 text-lg font-semibold text-primary-text">{collection.recordCount ?? 'Not available'}</p></div><div className="rounded-md border border-border bg-surface-muted p-4"><p className="text-xs text-muted">Collection name</p><p className="mt-2 break-words font-mono text-sm text-primary-text">{collection.collectionName || 'Not available'}</p></div></div>{collection.tableInfo && <div className="mt-5"><TechnicalDetails>{Object.entries(collection.tableInfo).map(([key, value]) => <div key={key} className="flex flex-wrap gap-2 py-1"><span className="text-muted">{key}:</span><span>{stringifyValue(value)}</span></div>)}</TechnicalDetails></div>}</CardBody></Card><Card><CardHeader><h2 className="font-semibold text-primary-text">Next steps</h2></CardHeader><CardBody><div className="space-y-4 text-sm text-secondary-text"><div className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-primary dark:bg-blue-950">1</span><p>Upload new sources from Documents.</p></div><div className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-primary dark:bg-blue-950">2</span><p>Search indexed content or ask AI a question.</p></div><div className="flex flex-wrap gap-2 pt-2"><Link to="/search"><Button size="sm" variant="secondary">Search knowledge base</Button></Link><Link to="/assistant"><Button size="sm" variant="ghost">Ask AI</Button></Link></div></div></CardBody></Card></div>}
    {viewState !== 'ready' && viewState !== 'loading' && viewState !== 'error' && <Card><CardHeader><h2 className="font-semibold text-primary-text">What is available here?</h2></CardHeader><CardBody><div className="grid gap-4 text-sm text-secondary-text sm:grid-cols-3"><div><p className="font-medium text-primary-text">Indexed vectors</p><p className="mt-1">Shown when the API returns a valid record count.</p></div><div><p className="font-medium text-primary-text">Collection status</p><p className="mt-1">Derived from collection availability and records.</p></div><div><p className="font-medium text-primary-text">Other metrics</p><p className="mt-1">Document counts, progress, and timing are not available.</p></div></div></CardBody></Card>}
  </div>
}
