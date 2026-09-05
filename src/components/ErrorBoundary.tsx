import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error Boundary caught:', error, errorInfo);
  }

  private handleRefresh = () => {
    // Safely reload page without clearing any stored user data
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b132b] p-6 text-white">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#1c2541] p-8 text-center shadow-2xl space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">Application Notice</h2>
            <p className="text-xs text-slate-400">
              An unexpected display issue occurred. Your data is completely safe. Click below to refresh.
            </p>

            {this.state.error?.message && (
              <div className="rounded-xl bg-slate-900/60 p-3 text-left font-mono text-[11px] text-amber-300 break-words border border-amber-500/20">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleRefresh}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition shadow-lg"
              >
                <RefreshCw className="h-4 w-4" /> Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
