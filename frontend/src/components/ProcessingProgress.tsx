import React from 'react'

interface IndeterminateProgressProps {
  label?: string
  className?: string
}

export const IndeterminateProgress: React.FC<IndeterminateProgressProps> = ({
  label = 'Processing in progress',
  className = '',
}) => (
  <div
    className={`h-2 overflow-hidden rounded-full bg-surface-muted ${className}`}
    role="progressbar"
    aria-label={label}
    aria-valuetext="In progress"
  >
    <div className="h-full w-1/3 animate-indeterminate rounded-full bg-primary" />
  </div>
)

interface CompletedProgressProps {
  label?: string
  className?: string
}

export const CompletedProgress: React.FC<CompletedProgressProps> = ({
  label = 'Processing complete',
  className = '',
}) => (
  <div
    className={`h-2 overflow-hidden rounded-full bg-surface-muted ${className}`}
    role="progressbar"
    aria-label={label}
    aria-valuenow={100}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div className="h-full w-full rounded-full bg-success" />
  </div>
)
