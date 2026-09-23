import React from 'react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'An unexpected error occurred while fetching data.',
  onRetry,
}) => {
  return (
    <div
      style={{
        padding: '2rem',
        borderRadius: '0.5rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
        textAlign: 'center',
        margin: '1.5rem 0',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>
        ⚠️ Error Encountered
      </div>
      <p style={{ fontSize: '0.875rem', marginBottom: onRetry ? '1rem' : 0 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            padding: '0.5rem 1.2rem',
            borderRadius: '0.375rem',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
};

