import React from 'react';

/**
 * Global Error Boundary to catch UI rendering crashes and prevent
 * the "white screen of death". Displays a user-friendly fallback UI.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <div className="mb-6 rounded-full bg-rose-100 p-6 text-rose-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mb-3 text-3xl font-black text-slate-800">Something went wrong</h1>
          <p className="mb-8 max-w-md text-slate-500 font-medium leading-relaxed">
            The dashboard encountered an unexpected error. This usually happens when data is being updated or a section fails to load.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-blue-600 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95"
            >
              Reload Interface
            </button>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="rounded-2xl border border-slate-200 bg-white px-8 py-3.5 text-xs font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
            >
              Try Recovering
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-12 w-full max-w-4xl rounded-2xl bg-slate-900 p-6 text-left shadow-2xl overflow-auto select-text">
              <p className="mb-4 font-mono text-xs font-bold text-rose-400">DEBUG CONSOLE:</p>
              <pre className="font-mono text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                {this.state.error.toString()}
                {"\n\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
