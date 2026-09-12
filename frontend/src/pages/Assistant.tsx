import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { askRag, getApiErrorMessage } from '../api'
import { Button } from '../components/Button'
import { Card, CardBody, CardHeader } from '../components/Card'
import { ChatInput } from '../components/ChatInput'
import { ChatMessage } from '../components/ChatMessage'
import { ErrorState } from '../components/ErrorState'
import { TechnicalDetails } from '../components/Foundation'
import { useProjectId } from '../hooks'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  technicalDetails?: { fullPrompt?: string; chatHistory?: unknown }
}

const prompts = [
  'Summarize the indexed information',
  'What does the knowledge base contain?',
  'Find information about...',
  'Explain this topic',
]

const AssistantIcon: React.FC = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-5 4v-4Z" />
    <path strokeLinecap="round" d="M8 11h.01M12 11h.01M16 11h.01" />
  </svg>
)

const stringifyTechnicalValue = (value: unknown): string => typeof value === 'string' ? value : JSON.stringify(value, null, 2) || 'Not available'

export const Assistant: React.FC = () => {
  const projectId = useProjectId()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, isLoading, errorMessage])

  const handleSend = async (prompt = input) => {
    const question = prompt.trim()
    if (!question || isLoading) return

    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: 'user', content: question }])
    setInput('')
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await askRag(projectId, { text: question, limit: 5 })
      const answer = typeof response?.answer === 'string' && response.answer.trim() ? response.answer : 'No answer was returned.'
      const technicalDetails = response?.full_prompt || response?.chat_history
        ? { fullPrompt: response.full_prompt, chatHistory: response.chat_history }
        : undefined
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: 'assistant', content: answer, technicalDetails }])
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const retryLastQuestion = () => {
    const previousQuestions = messages.filter((message) => message.role === 'user')
    void handleSend(previousQuestions[previousQuestions.length - 1]?.content || '')
  }

  const clearConversation = () => {
    setMessages([])
    setInput('')
    setErrorMessage(null)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-[1200px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">Grounded conversation</p>
          <h1 className="text-3xl font-semibold tracking-tight text-primary-text">AI Assistant</h1>
          <p className="mt-2 text-sm text-secondary-text">Ask questions about your project knowledge base.</p>
          <p className="mt-3 font-mono text-xs text-muted">Project ID: {projectId}</p>
        </div>
        {messages.length > 0 && <Button variant="outline" onClick={clearConversation}>Clear conversation</Button>}
      </div>

      <Card className="flex min-h-[620px] flex-1 flex-col overflow-hidden">
        <CardHeader className="flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-50 p-2 text-primary dark:bg-blue-950"><AssistantIcon /></div>
            <div><h2 className="font-semibold text-primary-text">Conversation</h2><p className="text-xs text-secondary-text">Answers are returned by the current project assistant.</p></div>
          </div>
          <span className="hidden font-mono text-xs text-muted sm:block">Project {projectId}</span>
        </CardHeader>
        <CardBody className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="max-w-xl text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white"><AssistantIcon /></div>
                  <h3 className="text-2xl font-semibold text-primary-text">How can I help?</h3>
                  <p className="mt-2 text-sm leading-6 text-secondary-text">Ask a question about the information indexed in your project knowledge base.</p>
                  <div className="mt-7 flex flex-wrap justify-center gap-2">
                    {prompts.map((prompt) => <button key={prompt} type="button" onClick={() => setInput(prompt)} className="rounded-full border border-border px-3 py-2 text-xs text-secondary-text transition-colors hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30">{prompt}</button>)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((message) => <div key={message.id}><ChatMessage role={message.role} content={message.content} />{message.technicalDetails && <div className="mt-2 ms-11 max-w-2xl"><TechnicalDetails>{typeof message.technicalDetails.fullPrompt === 'string' && <div><span className="text-muted">Prompt:</span> {message.technicalDetails.fullPrompt}</div>}{message.technicalDetails.chatHistory !== undefined && message.technicalDetails.chatHistory !== null && <div className="mt-2"><span className="text-muted">Chat history:</span><pre className="mt-1 whitespace-pre-wrap">{stringifyTechnicalValue(message.technicalDetails.chatHistory)}</pre></div>}</TechnicalDetails></div>}</div>)}
                {isLoading && <div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-primary"><AssistantIcon /></div><div className="rounded-lg border border-border bg-surface-muted px-4 py-3" role="status" aria-label="Thinking"><span className="text-sm text-secondary-text">Thinking<span className="animate-pulse">...</span></span></div></div>}
                {errorMessage && <ErrorState title="Unable to generate an answer" message={errorMessage} onRetry={retryLastQuestion} className="items-start p-4 text-start" />}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
          <div className="border-t border-border bg-surface px-4 py-4 sm:px-8"><ChatInput value={input} onChange={setInput} onSend={() => void handleSend()} isLoading={isLoading} /></div>
        </CardBody>
      </Card>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted"><span>Answers use the current project context.</span><Link to="/documents" className="font-medium text-primary hover:underline">Manage documents</Link></div>
    </div>
  )
}
