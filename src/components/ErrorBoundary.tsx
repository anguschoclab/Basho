/**
 * src/components/ErrorBoundary.tsx
 * ===============================
 * Error Boundary Component
 *
 * Responsibilities:
 * - Catches JavaScript errors in component tree
 * - Displays error UI with error message
 * - Provides reload button to recover
 * - Logs errors to console for debugging
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */

import { Component, ErrorInfo, ReactNode } from "react";
import { error } from "@/engine/utils/Logger";

/**
 * Props for ErrorBoundary component.
 */
interface Props {
  /** Child components to wrap with error boundary */
  children: ReactNode;
}

/**
 * State for ErrorBoundary component.
 */
interface State {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The error object if caught */
  error: Error | null;
}

/**
 * Error boundary component that catches JavaScript errors in its child component tree.
 * Displays a user-friendly error UI when an error occurs.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(err: Error, errorInfo: ErrorInfo) {
    error("Uncaught error", "ErrorBoundary", { err, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md w-full p-8 bg-destructive/5 border border-destructive/20 rounded-lg text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              The application encountered an unexpected error and could not continue rendering.
            </p>
            <pre className="text-xs text-left bg-muted p-4 rounded overflow-auto max-h-40 mb-6 font-mono">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              aria-label="Reload Page"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
