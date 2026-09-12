import React from 'react'
import { Button } from './Button'

interface ErrorBoundaryState { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error } }

  render() {
    if (!this.state.hasError) return this.props.children
    return <main className="flex min-h-screen items-center justify-center bg-app p-6"><div className="max-w-md text-center"><div className="mb-4 text-4xl text-danger">!</div><h1 className="text-2xl font-semibold text-primary-text">Something went wrong.</h1><p className="mt-2 text-secondary-text">The application could not render this view.</p><div className="mt-6 flex justify-center gap-3"><Button onClick={() => this.setState({ hasError: false })} variant="secondary">Try again</Button><Button onClick={() => window.location.reload()}>Reload application</Button></div>{import.meta.env.DEV && this.state.error && <details className="mt-6 text-left text-xs text-muted"><summary className="cursor-pointer">Technical details</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{this.state.error.message}</pre></details>}</div></main>
  }
}