import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { LeadList } from './index.js';
import { Lead } from '../../types/index.js';

const mockLeads: Lead[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    external_lead_id: 'meta_123',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+123456789',
    source: 'meta_ads',
    page_id: 'page1',
    form_id: 'form1',
    ad_id: 'ad1',
    status: 'NEW',
    raw_payload: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('LeadList Component', () => {
  it('renders loading state when loading is true', () => {
    render(
      <LeadList
        leads={[]}
        pagination={{ page: 1, limit: 20, total: 0, totalPages: 0 }}
        loading={true}
        error={null}
        filters={{}}
        onFilterChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('Fetching lead records...')).toBeInTheDocument();
  });

  it('renders empty state when leads array is empty', () => {
    render(
      <LeadList
        leads={[]}
        pagination={{ page: 1, limit: 20, total: 0, totalPages: 0 }}
        loading={false}
        error={null}
        filters={{}}
        onFilterChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('No Leads Found')).toBeInTheDocument();
  });

  it('renders lead list table with lead data when provided', () => {
    render(
      <BrowserRouter>
        <LeadList
          leads={mockLeads}
          pagination={{ page: 1, limit: 20, total: 1, totalPages: 1 }}
          loading={false}
          error={null}
          filters={{}}
          onFilterChange={vi.fn()}
          onRetry={vi.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('View Details →')).toBeInTheDocument();
  });
});

