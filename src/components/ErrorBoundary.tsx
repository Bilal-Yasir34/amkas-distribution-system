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

  private handleReset = () => {
    localStorage.removeItem('amkas-erp-data-store');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b132b] p-6 text-white">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#1c2541] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">Application Notice</h2>
            <p className="mt-2 text-xs text-slate-400">
              An unexpected error occurred while loading state. Click below to refresh.
            </p>

            {this.state.error?.message && (
              <div className="mt-4 rounded-xl bg-slate-900/60 p-3 text-left font-mono text-[11px] text-rose-300 break-words border border-rose-500/20">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-lg"
            >
              <RefreshCw className="h-4 w-4" /> Reset & Reload System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
