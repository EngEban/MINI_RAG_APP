import React, { useState, useEffect } from 'react'

interface ProjectSelectorProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ value, onChange, className = '' }) => {
  const [localValue, setLocalValue] = useState(value.toString())

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('projectId')
    if (saved) {
      const parsed = parseInt(saved)
      if (!isNaN(parsed)) {
        setLocalValue(saved)
        onChange(parsed)
      }
    }
  }, [onChange])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    const parsed = parseInt(newValue)
    if (!isNaN(parsed)) {
      onChange(parsed)
      localStorage.setItem('projectId', newValue)
    }
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label htmlFor="projectId" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
        Project ID:
      </label>
      <input
        id="projectId"
        type="number"
        value={localValue}
        onChange={handleChange}
        className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="1001"
      />
    </div>
  )
}
