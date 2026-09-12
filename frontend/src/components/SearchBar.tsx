import React from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  isLoading?: boolean
  placeholder?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = 'Search your knowledge base...'
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSearch()
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="search-query" className="sr-only">Search query</label>
      <input
        id="search-query"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="min-w-0 flex-1 rounded-md border border-border bg-surface-muted px-4 py-3 text-base text-primary-text placeholder-muted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      />
      <button
        onClick={onSearch}
        disabled={isLoading || !value.trim()}
        type="button"
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        <span>{isLoading ? 'Searching...' : 'Search'}</span>
      </button>
    </div>
  )
}
