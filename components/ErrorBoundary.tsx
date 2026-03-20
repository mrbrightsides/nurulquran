import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;
  
  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { children } = this.props;
    if (this.state.hasError) {
      let errorDetails = '';
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          errorDetails = JSON.stringify(parsed, null, 2);
        }
      } catch (e) {
        errorDetails = this.state.error?.message || 'Unknown error';
      }

      return (
        <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-emerald-100 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Something went wrong</h1>
            </div>
            
            <p className="text-emerald-800 mb-6 font-medium">
              An unexpected error occurred. If this is a database error, please check your Firebase configuration.
            </p>

            {errorDetails && (
              <div className="bg-emerald-950 text-emerald-400 p-4 rounded-2xl mb-8 overflow-auto max-h-64 text-xs font-mono">
                <pre>{errorDetails}</pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all shadow-lg"
            >
              <RefreshCcw className="h-5 w-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
