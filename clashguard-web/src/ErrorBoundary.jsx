import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="text-xl font-bold text-[#0F2A4A]">Something went wrong</h1>
          <p className="max-w-sm text-sm text-[#5A6478]">
            An unexpected error occurred. Try refreshing the page — your saved courses and grades are still in localStorage.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg border border-[#2BB673] px-5 py-2 text-sm font-semibold text-[#2BB673] transition hover:bg-[#2BB673] hover:text-white"
          >
            Refresh Page
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-w-lg overflow-auto rounded bg-gray-100 p-3 text-left text-xs text-red-700">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
