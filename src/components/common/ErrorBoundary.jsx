import { Component } from 'react'
import Button from './Button'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error, info) { console.error('Unhandled UI error', error, info) }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted">An unexpected error occurred. Your data is safe. Reload the page to continue.</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    )
  }
}
