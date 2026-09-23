import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LeadDetail } from './index.js';
import { Lead } from '../../types/index.js';

const mockLead: Lead = {
  id: '11111111-1111-1111-1111-111111111111',
  external_lead_id: 'meta_lead_123',
  full_name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1234567890',
  source: 'meta_ads',
  page_id: 'page_1',
  form_id: 'form_1',
  ad_id: 'ad_1',
  status: 'NEW',
  raw_payload: { test: true },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('LeadDetail Component', () => {
  it('renders lead information properly in view mode', () => {
    render(
      <LeadDetail
        lead={mockLead}
        activities={[]}
        activitiesLoading={false}
        activitiesError={null}
        onUpdateStatus={vi.fn()}
        updatingStatus={false}
        updateError={null}
        onRefreshActivities={vi.fn()}
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('meta_lead_123')).toBeInTheDocument();
  });

  it('toggles edit mode when clicking Edit Details button', () => {
    render(
      <LeadDetail
        lead={mockLead}
        activities={[]}
        activitiesLoading={false}
        activitiesError={null}
        onUpdateStatus={vi.fn()}
        updatingStatus={false}
        updateError={null}
        onUpdateLead={vi.fn()}
        onRefreshActivities={vi.fn()}
      />
    );

    const editBtn = screen.getByRole('button', { name: /edit details/i });
    fireEvent.click(editBtn);

    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('submits updated values when saving in edit mode', async () => {
    const handleUpdateLead = vi.fn().mockResolvedValue(undefined);

    render(
      <LeadDetail
        lead={mockLead}
        activities={[]}
        activitiesLoading={false}
        activitiesError={null}
        onUpdateStatus={vi.fn()}
        updatingStatus={false}
        updateError={null}
        onUpdateLead={handleUpdateLead}
        onRefreshActivities={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /edit details/i }));

    const nameInput = screen.getByDisplayValue('Jane Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleUpdateLead).toHaveBeenCalledWith({
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1234567890',
    });
  });

  it('cancels editing and restores view mode', () => {
    render(
      <LeadDetail
        lead={mockLead}
        activities={[]}
        activitiesLoading={false}
        activitiesError={null}
        onUpdateStatus={vi.fn()}
        updatingStatus={false}
        updateError={null}
        onUpdateLead={vi.fn()}
        onRefreshActivities={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /edit details/i }));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByDisplayValue('Jane Doe')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit details/i })).toBeInTheDocument();
  });
});
