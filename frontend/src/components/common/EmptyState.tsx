import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Leads Found',
  description = 'No leads have been received from the Meta webhook yet or matched your filters.',
}) => {
  return (
    <div
      style={{
        padding: '3.5rem 1rem',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
        border: '1px dashed #cbd5e1',
        textAlign: 'center',
        margin: '1.5rem 0',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
        {description}
      </p>
    </div>
  );
};

