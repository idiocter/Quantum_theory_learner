'use client'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center">
          <div className="text-5xl mb-6 font-mono text-particle-400" aria-hidden>⚠</div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            {this.state.message || 'An unexpected error occurred. The application state may be inconsistent.'}
          </p>
          <button onClick={this.reset} className="btn-quantum text-sm px-6 py-2.5">
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
