import React from 'react'

interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'loading' | 'neutral' | 'uploaded' | 'preparing' | 'processing' | 'queued' | 'indexing' | 'indexed' | 'completed' | 'failed' | 'unavailable'
  children: React.ReactNode
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children, className = '' }) => {
  const statusStyles = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    loading: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    uploaded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    preparing: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    processing: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    queued: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    indexing: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    indexed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    unavailable: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]} ${className}`}>
      {status === 'loading' && (
        <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </span>
  )
}
