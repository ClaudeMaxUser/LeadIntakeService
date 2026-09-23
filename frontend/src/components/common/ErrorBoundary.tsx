import { Component, ErrorInfo, ReactNode } from 'react';

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
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/leads';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            maxWidth: '600px',
            margin: '4rem auto',
            padding: '2rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #fecaca',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            An unexpected error occurred while rendering this page. You can refresh or return to the dashboard.
          </p>
          {this.state.error && (
            <pre
              style={{
                backgroundColor: '#f8fafc',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                color: '#64748b',
                overflowX: 'auto',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Return to Leads Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
