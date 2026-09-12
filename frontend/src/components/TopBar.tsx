import React from 'react'
import { useTheme } from '../hooks'
import { useLocation } from 'react-router-dom'

interface TopBarProps {
  onMenuClick: () => void
  projectId: number
  onProjectIdChange: (id: number) => void
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, projectId, onProjectIdChange }) => {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const title = ({ '/': 'Dashboard', '/documents': 'Documents', '/knowledge-base': 'Knowledge Base', '/search': 'Search', '/assistant': 'AI Assistant', '/settings': 'Settings' } as Record<string, string>)[location.pathname] || 'Workspace'

  return (
    <header className="sticky top-0 z-30 flex h-[4.5rem] items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-8">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-secondary-text hover:bg-surface-muted lg:hidden"
        aria-label="Open navigation"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* App name (hidden on mobile, shown on desktop) */}
      <div><div className="text-xs text-muted">Workspace</div><h1 className="text-lg font-semibold text-primary-text">{title}</h1></div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Project ID input */}
        <div className="hidden items-center gap-2 sm:flex">
          <label htmlFor="projectId" className="text-xs text-secondary-text">
            Project ID:
          </label>
          <input
            id="projectId"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={projectId}
            onChange={(e) => onProjectIdChange(parseInt(e.target.value) || 0)}
            className="w-20 rounded-md border border-border bg-surface-muted px-2 py-1.5 font-mono text-sm text-primary-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="1001"
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-secondary-text hover:bg-surface-muted"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
