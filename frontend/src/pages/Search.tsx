import React, { useState } from 'react'
import { getApiErrorMessage, searchKnowledgeBase } from '../api'
import { Button } from '../components/Button'
import { Card, CardBody } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { SearchBar } from '../components/SearchBar'
import { SearchResult } from '../components/SearchResult'
import { useProjectId } from '../hooks'
import type { SearchResultItem } from '../types'

const examples = ['Find information about...', 'What does the document say about...', 'Search for...']
const isSearchResult = (value: unknown): value is SearchResultItem => {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<SearchResultItem>
  return typeof result.text === 'string' && typeof result.score === 'number'
}
const SkeletonResult = () => <div className="rounded-lg border border-border bg-surface p-5 shadow-card"><div className="flex items-center justify-between"><div className="h-3 w-24 animate-pulse rounded bg-surface-muted" /><div className="h-6 w-20 animate-pulse rounded bg-surface-muted" /></div><div className="mt-5 space-y-2"><div className="h-4 w-full animate-pulse rounded bg-surface-muted" /><div className="h-4 w-11/12 animate-pulse rounded bg-surface-muted" /><div className="h-4 w-3/5 animate-pulse rounded bg-surface-muted" /></div></div>

export const Search: React.FC = () => {
  const projectId = useProjectId()
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSearch = async () => {
    const text = query.trim()
    if (!text || isSearching) return
    setIsSearching(true)
    setHasSearched(true)
    setResults([])
    setErrorMessage(null)
    try {
      const response = await searchKnowledgeBase(projectId, { text, limit: 5 })
      const nextResults = Array.isArray(response?.results) ? response.results.filter(isSearchResult) : []
      setResults(nextResults)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsSearching(false)
    }
  }

  const chooseExample = (example: string) => setQuery(example)
  return <div className="mx-auto max-w-[1200px] space-y-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">Semantic retrieval</p><h1 className="text-3xl font-semibold tracking-tight text-primary-text">Search</h1><p className="mt-2 text-sm text-secondary-text">Search your project knowledge base using semantic retrieval.</p><p className="mt-3 font-mono text-xs text-muted">Project ID: {projectId}</p></div>{hasSearched && <Button variant="outline" onClick={() => { setQuery(''); setResults([]); setErrorMessage(null); setHasSearched(false) }}>Clear search</Button>}</div>
    <Card className="border-primary/20"><CardBody className="p-5 sm:p-7"><div className="mb-4"><h2 className="text-lg font-semibold text-primary-text">Search your knowledge base</h2><p className="mt-1 text-sm text-secondary-text">Search indexed content in the current project.</p></div><SearchBar value={query} onChange={setQuery} onSearch={() => void handleSearch()} isLoading={isSearching} placeholder="Enter a question or keyword..." />{!hasSearched && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs text-muted">Try an example:</span>{examples.map((example) => <button key={example} type="button" onClick={() => chooseExample(example)} className="rounded-full border border-border px-3 py-1.5 text-xs text-secondary-text transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">{example}</button>)}</div>}</CardBody></Card>
    {isSearching ? <section aria-live="polite" aria-busy="true" className="space-y-4"><div><h2 className="text-lg font-semibold text-primary-text">Searching knowledge base...</h2><p className="mt-1 text-sm text-secondary-text">Finding relevant indexed content.</p></div><div className="space-y-4"><SkeletonResult /><SkeletonResult /></div></section> : errorMessage ? <Card><CardBody><ErrorState title="Search failed" message={errorMessage} onRetry={() => void handleSearch()} /></CardBody></Card> : hasSearched && results.length === 0 ? <Card><CardBody><EmptyState title="No matching results" description="Try a different search query or broader keywords." action={<Button variant="secondary" onClick={() => document.getElementById('search-query')?.focus()}>Edit search query</Button>} /></CardBody></Card> : results.length > 0 ? <section className="space-y-4" aria-live="polite"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Retrieved content</p><h2 className="mt-1 text-xl font-semibold text-primary-text">Search results</h2></div><span className="text-sm text-secondary-text">{results.length} {results.length === 1 ? 'result' : 'results'}</span></div><div className="space-y-4">{results.map((result, index) => <SearchResult key={`${index}-${result.text.slice(0, 24)}`} index={index + 1} text={result.text} score={result.score} metadata={result.metadata} />)}</div></section> : <Card><CardBody><EmptyState title="Search your knowledge base" description="Enter a question or keyword to find relevant content from your indexed documents." icon={<svg className="h-12 w-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path strokeLinecap="round" d="m16 16 5 5" /></svg>} /></CardBody></Card>}
  </div>
}