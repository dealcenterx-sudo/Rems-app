import React from 'react';

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
    // In production you'd ship this to Sentry / Datadog etc.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          gap: '16px',
          color: '#888888',
          fontFamily: 'IBM Plex Mono, monospace',
          padding: '40px'
        }}>
          <div style={{ fontSize: '32px' }}>⚠️</div>
          <div style={{ color: '#ff3333', fontSize: '16px', fontWeight: 600 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: '13px', maxWidth: '480px', textAlign: 'center', color: '#555555' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid #00ff88',
              borderRadius: '6px',
              color: '#00ff88',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit'
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
