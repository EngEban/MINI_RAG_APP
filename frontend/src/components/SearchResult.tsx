import React from 'react'

interface SearchResultProps {
  index?: number
  text: string
  score: number
  metadata?: Record<string, unknown>
}

const displayValue = (value: unknown): string | null => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

export const SearchResult: React.FC<SearchResultProps> = ({ index, text, score, metadata }) => {
  const metadataEntries = metadata
    ? Object.entries(metadata).map(([key, value]) => [key, displayValue(value)] as const).filter((entry): entry is readonly [string, string] => entry[1] !== null)
    : []
  const isNormalized = Number.isFinite(score) && score >= 0 && score <= 1
  const scoreLabel = isNormalized ? `Relevance ${(score * 100).toFixed(1)}%` : `Score ${String(score)}`
  const meterValue = isNormalized ? Math.max(0, Math.min(100, score * 100)) : null

  return <article className="rounded-lg border border-border bg-surface p-5 shadow-card transition hover:border-primary/50 hover:shadow-elevated"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted font-mono text-xs font-semibold text-primary">{index ?? '•'}</span><span className="text-xs font-semibold uppercase tracking-wide text-muted">Retrieved passage</span></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-primary dark:bg-blue-950">{scoreLabel}</span></div></div>{meterValue !== null && <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-label={`${scoreLabel} retrieval score`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={meterValue}><div className="h-full rounded-full bg-primary" style={{ width: `${meterValue}%` }} /></div>}<p className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-7 text-primary-text">{text}</p>{metadataEntries.length > 0 && <details className="mt-5 border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium text-secondary-text hover:text-primary">Metadata</summary><dl className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2">{metadataEntries.map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-muted">{key}</dt><dd className="break-words font-mono text-secondary-text">{value}</dd></div>)}</dl></details>}</article>
}
