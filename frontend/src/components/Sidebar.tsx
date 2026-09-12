import React from 'react'
import { NavLink } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  section: 'Overview' | 'Knowledge' | 'AI' | 'System'
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    section: 'Overview',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    path: '/documents',
    label: 'Documents',
    section: 'Knowledge',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    path: '/search',
    label: 'Search',
    section: 'Knowledge',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  },
  {
    path: '/assistant',
    label: 'AI Assistant',
    section: 'AI',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    )
  },
  {
    path: '/knowledge-base',
    label: 'Knowledge Base',
    section: 'Knowledge',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  }
  ,{
    path: '/settings',
    label: 'Settings',
    section: 'System',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 3h3l.7 2.1a7.8 7.8 0 0 1 1.7 1l2.1-.5 1.5 2.6-1.5 1.6a7.8 7.8 0 0 1 0 2l1.5 1.6-1.5 2.6-2.1-.5a7.8 7.8 0 0 1-1.7 1L13.5 21h-3l-.7-2.1a7.8 7.8 0 0 1-1.7-1l-2.1.5-1.5-2.6L6 14.2a7.8 7.8 0 0 1 0-2L4.5 10.6 6 8l2.1.5a7.8 7.8 0 0 1 1.7-1L10.5 3Z" /><circle cx="12" cy="13" r="2.5" />
      </svg>
    )
  }
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`sidebar-drawer fixed inset-y-0 start-0 z-50 flex w-64 flex-col bg-sidebar text-white shadow-elevated transition-transform duration-300 ${isOpen ? 'is-open' : ''}`}
        aria-label="Application navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex h-[4.5rem] items-center justify-between border-b border-white/10 px-6">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 font-bold">M</div><div><div className="font-semibold">MultiRag</div><div className="text-[10px] uppercase tracking-[.18em] text-slate-400">Knowledge workspace</div></div></div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-slate-400 hover:bg-sidebar-hover hover:text-white lg:hidden"
              aria-label="Close navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6" aria-label="Primary navigation">
            {(['Overview', 'Knowledge', 'AI', 'System'] as const).map((section) => <div key={section} className="mb-6 last:mb-0"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{section}</p>{navItems.filter((item) => item.section === section).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  end={item.path === '/'}
                  className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-sidebar-active text-white' : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}</div>)}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-500">
            RAG workspace
          </div>
        </div>
      </aside>
    </>
  )
}
