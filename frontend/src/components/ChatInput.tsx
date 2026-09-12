import React, { KeyboardEvent } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading?: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  isLoading = false
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor="assistant-message" className="sr-only">Ask a question about your knowledge base</label>
        <textarea
          id="assistant-message"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask a question about your knowledge base..."
          rows={1}
          aria-describedby="assistant-message-hint"
          className="w-full resize-none rounded-md border border-border bg-surface-muted px-4 py-3 text-sm leading-6 text-primary-text placeholder-muted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          style={{ minHeight: '48px', maxHeight: '200px' }}
        />
      </div>
      <span id="assistant-message-hint" className="sr-only">Press Enter to send. Press Shift and Enter for a new line.</span>
      <button
        type="button"
        onClick={onSend}
        disabled={isLoading || !value.trim()}
        aria-label={isLoading ? 'Generating answer' : 'Send question'}
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
        <span className="hidden sm:inline">{isLoading ? 'Thinking...' : 'Send'}</span>
      </button>
    </div>
  )
}
