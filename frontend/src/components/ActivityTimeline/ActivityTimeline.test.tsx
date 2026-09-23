import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityTimeline } from './index.js';
import { Activity } from '../../types/index.js';

describe('ActivityTimeline Component', () => {
  it('renders loading state when loading is true', () => {
    render(<ActivityTimeline activities={[]} loading={true} error={null} />);
    expect(screen.getByText('Loading audit timeline...')).toBeInTheDocument();
  });

  it('renders error state with retry button when error is present', () => {
    const retryFn = vi.fn();
    render(<ActivityTimeline activities={[]} loading={false} error="Failed to fetch timeline" onRetry={retryFn} />);

    expect(screen.getByText('Failed to fetch timeline')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);
    expect(retryFn).toHaveBeenCalledTimes(1);
  });

  it('renders empty message when no activities exist', () => {
    render(<ActivityTimeline activities={[]} loading={false} error={null} />);
    expect(screen.getByText(/no activities recorded yet/i)).toBeInTheDocument();
  });

  it('renders activity list with tags, descriptions, actors, and metadata', () => {
    const mockActivities: Activity[] = [
      {
        id: 1,
        lead_id: 'lead-123',
        type: 'LEAD_CREATED',
        description: 'Lead created via Meta Webhook',
        metadata: { form_id: 'form_456' },
        actor: 'system:webhook',
        created_at: new Date('2026-09-23T10:00:00Z').toISOString(),
      },
      {
        id: 2,
        lead_id: 'lead-123',
        type: 'STATUS_CHANGED',
        description: 'Status changed from NEW to CONTACTED',
        metadata: { from: 'NEW', to: 'CONTACTED', note: 'Spoke on call' },
        actor: 'user:dashboard',
        created_at: new Date('2026-09-23T11:00:00Z').toISOString(),
      },
    ];

    render(<ActivityTimeline activities={mockActivities} loading={false} error={null} />);

    expect(screen.getByText('LEAD CREATED')).toBeInTheDocument();
    expect(screen.getByText('Lead created via Meta Webhook')).toBeInTheDocument();
    expect(screen.getByText('STATUS CHANGED')).toBeInTheDocument();
    expect(screen.getByText('Status changed from NEW to CONTACTED')).toBeInTheDocument();
    expect(screen.getByText('system:webhook')).toBeInTheDocument();
    expect(screen.getByText('user:dashboard')).toBeInTheDocument();
    expect(screen.getByText('Seq #1')).toBeInTheDocument();
    expect(screen.getByText('Seq #2')).toBeInTheDocument();
  });
});
