import React from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

const AssistantIcon: React.FC = () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-5 4v-4Z" /><path strokeLinecap="round" d="M8 11h.01M12 11h.01M16 11h.01" /></svg>

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  const isUser = role === 'user'
  return <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isUser ? 'order-2 bg-primary text-white' : 'bg-surface-muted text-primary'}`} aria-hidden="true">{isUser ? <span className="text-[10px] font-semibold">You</span> : <AssistantIcon />}</div><div className={`max-w-[min(85%,700px)] ${isUser ? 'order-1' : ''}`}><p className="mb-1 text-xs font-medium text-muted">{isUser ? 'You' : 'AI Assistant'}</p><div className={`rounded-lg px-4 py-3 ${isUser ? 'bg-primary text-white' : 'border border-border bg-surface-muted text-primary-text'}`}><p className="whitespace-pre-wrap break-words text-sm leading-7">{content}</p></div></div></div>
}
