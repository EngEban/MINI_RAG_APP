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

interface NormalizedIndexInfo { recordCount: number | null; collectionName: string | null; tableInfo: Record<string, unknown> | null; raw: unknown }
type IndexState = 'loading' | 'error' | 'unavailable' | 'empty' | 'ready'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const normalizeIndexInfo = (value: unknown): NormalizedIndexInfo => {
  if (!isRecord(value)) return { recordCount: null, collectionName: null, tableInfo: null, raw: value }
  const tableInfo = isRecord(value.table_info) ? value.table_info : null
  const rawCount = value.record_count
  const recordCount = typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount >= 0 ? rawCount : null
  const rawName = tableInfo?.tablename
  return { recordCount, collectionName: typeof rawName === 'string' ? rawName : null, tableInfo, raw: value }
}

const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{children}</svg>
const Skeleton = ({ className = '' }: { className?: string }) => <div className={`animate-pulse rounded bg-surface-muted ${className}`} />

export const Dashboard: React.FC = () => {
  const projectId = useProjectId()
  const [indexInfo, setIndexInfo] = useState<NormalizedIndexInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    setIsLoading(true); setErrorMessage(null)
    try { const response = await getIndexInfo(projectId); setIndexInfo(normalizeIndexInfo(response?.collection_info)) }
    catch (error) { setIndexInfo(null); setErrorMessage(getApiErrorMessage(error)) }
    finally { setIsLoading(false) }
  }, [projectId])
  useEffect(() => { void refresh() }, [refresh])

  const state: IndexState = isLoading ? 'loading' : errorMessage ? 'error' : !indexInfo ? 'unavailable' : indexInfo.recordCount === null ? 'unavailable' : indexInfo.recordCount === 0 ? 'empty' : 'ready'
  const statusLabel = state === 'loading' ? 'Loading' : state === 'error' ? 'Error' : state === 'ready' ? 'Ready' : state === 'empty' ? 'Empty' : 'Unavailable'
  const statusType = state === 'loading' ? 'loading' : state === 'error' ? 'error' : state === 'ready' ? 'success' : state === 'empty' ? 'warning' : 'neutral'
  const actionCards = [
    { href: '/documents', title: 'Upload documents', description: 'Add PDF or TXT sources to this project.', icon: <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></Icon>, primary: true },
    { href: '/search', title: 'Search knowledge base', description: 'Find relevant passages across indexed sources.', icon: <Icon><circle cx="10.8" cy="10.8" r="6.8" /><path strokeLinecap="round" d="m16 16 5 5" /></Icon>, primary: false },
    { href: '/assistant', title: 'Ask AI', description: 'Get grounded answers from your indexed content.', icon: <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M7 18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-5 4v-4Z" /><path strokeLinecap="round" d="M8 11h.01M12 11h.01M16 11h.01" /></Icon>, primary: false },
  ]

  return <div className="mx-auto max-w-[1500px] space-y-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">AI workspace</p><h1 className="text-3xl font-semibold tracking-tight text-primary-text">Dashboard</h1><p className="mt-2 text-sm text-secondary-text">Overview of your knowledge base and AI workspace.</p><p className="mt-3 font-mono text-xs text-muted">Project ID: {projectId}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void refresh()} isLoading={isLoading}>Refresh</Button><Link to="/documents"><Button>Upload documents</Button></Link></div></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardBody><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Indexed vectors</p>{isLoading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-3 text-3xl font-semibold text-primary-text">{indexInfo?.recordCount ?? 'Not available'}</p>}<p className="mt-2 text-xs text-secondary-text">Semantic records in the current index</p></div><div className="rounded-md bg-blue-50 p-3 text-primary dark:bg-blue-950"><Icon><path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M5 12h14M5 17h14M3 7h.01M3 12h.01M3 17h.01" /></Icon></div></div></CardBody></Card>
      <Card><CardBody><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Knowledge base</p>{isLoading ? <Skeleton className="mt-3 h-6 w-24" /> : <div className="mt-3"><StatusBadge status={statusType}>{statusLabel}</StatusBadge></div>}<p className="mt-3 text-xs text-secondary-text">{state === 'ready' ? 'Ready for search and AI answers' : state === 'empty' ? 'Collection exists without indexed records' : state === 'unavailable' ? 'No collection is available yet' : 'Checking current index state'}</p></div><div className="rounded-md bg-green-50 p-3 text-success dark:bg-green-950"><Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v13H4V7Zm4-4h8v4H8V3Zm0 8h8M8 15h5" /></Icon></div></div></CardBody></Card>
      <Card><CardBody><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Documents</p><p className="mt-3 text-2xl font-semibold text-primary-text">Not available</p><p className="mt-2 text-xs text-secondary-text">The current API does not expose a persistent document count.</p></div><div className="rounded-md bg-surface-muted p-3 text-secondary-text"><Icon><path strokeLinecap="round" strokeLinejoin="round" d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 13h6M9 17h6" /></Icon></div></div></CardBody></Card>
      <Card><CardBody><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Processing</p><p className="mt-3 text-2xl font-semibold text-primary-text">No active status</p><p className="mt-2 text-xs text-secondary-text">No real-time processing progress is available.</p></div><div className="rounded-md bg-amber-50 p-3 text-warning dark:bg-amber-950"><Icon><circle cx="12" cy="12" r="8.5" /><path strokeLinecap="round" d="M12 7v5l3 2" /></Icon></div></div></CardBody></Card>
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><Card><CardHeader><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-primary-text">Knowledge base overview</h2><p className="mt-1 text-xs text-secondary-text">The current state of your vector index.</p></div><Button variant="ghost" size="sm" onClick={() => void refresh()} isLoading={isLoading}>Refresh</Button></div></CardHeader><CardBody>{isLoading ? <div className="space-y-4"><Skeleton className="h-5 w-28" /><Skeleton className="h-12 w-full" /><Skeleton className="h-4 w-2/3" /></div> : errorMessage ? <ErrorState title="Could not load knowledge base" message={errorMessage} onRetry={() => void refresh()} /> : state === 'empty' ? <EmptyState title="Your knowledge base is empty" description="Upload a document and process it to start searching and asking questions." action={<Link to="/documents"><Button>Upload your first document</Button></Link>} /> : state === 'unavailable' ? <EmptyState title="Knowledge base unavailable" description="This project does not have an available collection yet. Upload a document to begin." action={<Link to="/documents"><Button>Upload documents</Button></Link>} /> : <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted">Status</p><div className="mt-2"><StatusBadge status="success">Ready</StatusBadge></div></div><div><p className="text-xs text-muted">Indexed vectors</p><p className="mt-2 text-lg font-semibold text-primary-text">{indexInfo?.recordCount ?? 'Not available'}</p></div><div><p className="text-xs text-muted">Collection</p><p className="mt-2 break-words font-mono text-sm text-primary-text">{indexInfo?.collectionName ?? 'Not available'}</p></div></div>{indexInfo?.tableInfo && <TechnicalDetails>{JSON.stringify(indexInfo.tableInfo, null, 2)}</TechnicalDetails>}</div>}</CardBody></Card>
      <Card><CardHeader><h2 className="font-semibold text-primary-text">Recent activity</h2><p className="mt-1 text-xs text-secondary-text">Session activity only</p></CardHeader><CardBody><EmptyState title="No session activity" description="Uploads and processing events from this session will appear here." className="p-2" /></CardBody></Card></div>
    <section><div className="mb-4"><h2 className="text-lg font-semibold text-primary-text">Quick actions</h2><p className="mt-1 text-sm text-secondary-text">Move from source material to grounded answers.</p></div><div className="grid grid-cols-1 gap-4 md:grid-cols-3">{actionCards.map((action) => <Link key={action.href} to={action.href} className="group rounded-lg border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-elevated focus:outline-none focus:ring-2 focus:ring-primary/30"><div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-md ${action.primary ? 'bg-primary text-white' : 'bg-surface-muted text-primary'} transition-colors group-hover:bg-primary group-hover:text-white`}>{action.icon}</div><h3 className="font-semibold text-primary-text">{action.title}</h3><p className="mt-2 text-sm leading-6 text-secondary-text">{action.description}</p><span className="mt-5 inline-flex text-sm font-medium text-primary">Open <span className="ms-2 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></span></Link>)}</div></section>
  </div>
}
