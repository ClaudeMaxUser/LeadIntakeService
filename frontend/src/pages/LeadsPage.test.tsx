import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadsPage } from './LeadsPage.js';
import * as useLeadsHook from '../hooks/useLeads.js';

vi.mock('../hooks/useLeads.js', () => ({
  useLeads: vi.fn(),
}));

describe('LeadsPage Component & URL Sync', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLeadsHook.useLeads).mockReturnValue({
      leads: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          external_lead_id: 'meta_101',
          full_name: 'Alice Johnson',
          email: 'alice@example.com',
          phone: '+1234567890',
          source: 'meta_ads',
          page_id: 'p1',
          form_id: 'f1',
          ad_id: 'a1',
          status: 'QUALIFIED',
          raw_payload: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('initializes filters from URL search params', () => {
    render(
      <MemoryRouter initialEntries={['/leads?status=QUALIFIED&search=Alice&page=2&limit=10&sortBy=fullName&sortOrder=asc']}>
        <Routes>
          <Route path="/leads" element={<LeadsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify useLeads was called with parsed filters from URL
    expect(useLeadsHook.useLeads).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      status: 'QUALIFIED',
      search: 'Alice',
      sortBy: 'fullName',
      sortOrder: 'asc',
    });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('invokes refetch when Refresh button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/leads']}>
        <Routes>
          <Route path="/leads" element={<LeadsPage />} />
        </Routes>
      </MemoryRouter>
    );

    const refreshBtn = screen.getByRole('button', { name: /Refresh Leads/i });
    fireEvent.click(refreshBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

