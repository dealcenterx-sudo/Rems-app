import React from 'react';
import { captureError } from '../utils/observability';
import { AlertCircle } from './Icons';
import PageState from './PageState';

/**
 * Catches unexpected render-time errors anywhere in its subtree so the whole
 * app doesn't crash.  Shows an inline recovery UI instead.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    captureError(error, { componentStack: info.componentStack });
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-content" style={{ minHeight: '100%', display: 'grid', placeItems: 'center' }}>
          <PageState
            tone="error"
            icon={AlertCircle}
            eyebrow="Unexpected error"
            title="Something went wrong"
            message={this.state.error?.message || 'Refresh the page or try again.'}
            actions={(
              <button onClick={this.handleReset} className="btn-primary">
                Try again
              </button>
            )}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
