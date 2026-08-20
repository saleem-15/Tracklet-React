import React from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false, copied: false });
    window.location.reload();
  };

  private handleNavigateHome = () => {
    window.location.href = '/';
  };

  private handleCopyDiagnostics = async () => {
    const { error, errorInfo } = this.state;
    const diagnosticReport = [
      `=== Tracklet Crash Report ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
      `Error Message: ${error?.message || 'Unknown error'}`,
      `Error Stack:\n${error?.stack || 'No stack trace available'}`,
      `Component Stack:\n${errorInfo?.componentStack || 'No component stack available'}`,
    ].join('\n\n');

    try {
      await navigator.clipboard.writeText(diagnosticReport);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      // Fallback
    }
  };

  public render() {
    const { hasError, error, errorInfo, showDetails, copied } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-4 select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-xs border border-rose-200/60">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight font-heading">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                An unexpected error occurred in Tracklet. Your saved job applications and workspace data remain safe.
              </p>
            </div>

            {error && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Error Diagnostic
                  </span>
                  <button
                    type="button"
                    onClick={this.handleCopyDiagnostics}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Report</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-rose-600 break-words font-semibold">
                  {error.message}
                </p>
              </div>
            )}

            {/* Collapsible Technical Stack */}
            <div>
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-mono font-medium cursor-pointer"
              >
                <span>{showDetails ? 'Hide' : 'Show'} Technical Details</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <div className="mt-3 bg-slate-900 text-slate-200 rounded-xl p-3 text-left font-mono text-[10px] overflow-x-auto max-h-48 space-y-2 select-text border border-slate-800">
                  {error?.stack && (
                    <div>
                      <span className="text-slate-400 font-bold block mb-1">Stack Trace:</span>
                      <pre className="whitespace-pre-wrap leading-tight">{error.stack}</pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-slate-400 font-bold block mb-1">Component Stack:</span>
                      <pre className="whitespace-pre-wrap leading-tight">{errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                type="button"
                onClick={this.handleNavigateHome}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer border border-slate-200/80"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
