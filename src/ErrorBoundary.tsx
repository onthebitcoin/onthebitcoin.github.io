// Basic React error boundary — catches render-time errors anywhere in the
// tree below it and shows a friendly fallback instead of a blank white
// screen. This is a safety net, not a replacement for the per-section
// loading/error states (ErrorState in ui.tsx) that already handle normal
// fetch failures; this only fires for actual JS exceptions during render
// (a genuine bug), which should be rare but shouldn't take the whole app
// down with them.
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('OnTheBitcoin crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 light:bg-neutral-50 px-4 text-center text-neutral-100 light:text-neutral-900">
          <p className="text-3xl">🌈💥</p>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="max-w-md text-sm text-neutral-400 light:text-neutral-600">
            OnTheBitcoin hit an unexpected error. Your wallet data never left
            your browser and nothing was changed on-chain — this is just a
            display bug. Reloading usually fixes it.
          </p>
          <pre className="max-w-md overflow-x-auto rounded-lg border border-neutral-800 light:border-neutral-300 bg-neutral-900 light:bg-white px-3 py-2 text-left text-xs text-red-400">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-purple-500/60 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 light:text-purple-700 hover:bg-purple-500/20"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
