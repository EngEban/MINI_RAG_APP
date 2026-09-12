import React from 'react'

interface SourceCardProps {
  filename: string
  chunkIndex: number
  score: number
  text: string
}

export const SourceCard: React.FC<SourceCardProps> = ({
  filename,
  score,
  text
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{filename}</span>
        </div>
        <span className={`text-xs font-medium ${getScoreColor(score)}`}>
          {(score * 100).toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
        {text}
      </p>
    </div>
  )
}
