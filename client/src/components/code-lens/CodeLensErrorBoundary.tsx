import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called when the user clicks "Back to start" — reset the page to a clean state. */
  onReset: () => void;
}
interface State { error: Error | null }

/**
 * Catches render-time crashes in the Code Lens UI so one bad component can't
 * white-screen the whole app (which also breaks the browser back button).
 * Shows a recoverable fallback instead.
 */
export class CodeLensErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CodeLens] UI crash caught by boundary:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0A1628' }}>
          <div className="w-full max-w-md rounded-xl border p-6 text-center space-y-3"
               style={{ background: '#0D1F3C', borderColor: '#FF444455' }}>
            <div className="text-lg font-bold" style={{ color: '#FF8080' }}>Something went wrong</div>
            <div className="text-sm" style={{ color: '#A0C0D8' }}>
              The view hit an unexpected error and stopped rendering. Your review data is safe on the
              server — go back to the start and reopen it, or resume from the last review.
            </div>
            <div className="text-[11px] font-mono px-3 py-2 rounded text-left overflow-auto"
                 style={{ background: '#0A1628', color: '#7A9CC0', maxHeight: 120 }}>
              {this.state.error.message}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 rounded-lg text-sm font-bold"
              style={{ background: '#00BFFF', color: '#0A1628' }}
            >
              Back to start
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
