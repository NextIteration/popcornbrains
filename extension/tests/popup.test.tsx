// @vitest-environment jsdom
import React from 'react';
import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  ConsentScreen,
  StatusHeader,
  IntentCard,
  ActivityCard,
  TrackingCard,
  PrivacyPanel,
} from '../src/popup/App';

// ── Chrome API mock ────────────────────────────────────────────────────────

const mockStorage: Record<string, unknown> = {};

beforeEach(() => {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string | string[]) => {
          const keys = typeof key === 'string' ? [key] : key;
          return Object.fromEntries(keys.map(k => [k, mockStorage[k]]));
        }),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(mockStorage, obj);
        }),
      },
    },
    runtime: {
      sendMessage: vi.fn(),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── ConsentScreen ──────────────────────────────────────────────────────────

describe('ConsentScreen', () => {
  it('renders the consent screen before consent is given', () => {
    const onAgree = vi.fn();
    const onDecline = vi.fn();
    render(<ConsentScreen onAgree={onAgree} onDecline={onDecline} />);

    expect(screen.getByTestId('consent-screen')).toBeInTheDocument();
    expect(screen.getByText('Protect Your Attention')).toBeInTheDocument();
  });

  it('shows what is collected and what is never collected', () => {
    render(<ConsentScreen onAgree={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText(/Websites \/ URLs/i)).toBeInTheDocument();
    expect(screen.getByText(/Passwords/i)).toBeInTheDocument();
  });

  it('calls onAgree when "I Agree & Enable Tracking" is clicked', () => {
    const onAgree = vi.fn();
    render(<ConsentScreen onAgree={onAgree} onDecline={vi.fn()} />);
    fireEvent.click(screen.getByText(/I Agree/i));
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when "Not Now" is clicked and consent stays off', () => {
    const onDecline = vi.fn();
    render(<ConsentScreen onAgree={vi.fn()} onDecline={onDecline} />);
    fireEvent.click(screen.getByText('Not Now'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('shows the privacy notice about local-only processing', () => {
    render(<ConsentScreen onAgree={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText(/local The Unplugged desktop app/i)).toBeInTheDocument();
  });
});

// ── StatusHeader ──────────────────────────────────────────────────────────

describe('StatusHeader', () => {
  it('shows "Tracking" label when tracking is enabled', () => {
    render(<StatusHeader trackingEnabled={true} desktopConnected={false} />);
    expect(screen.getByText('Tracking')).toBeInTheDocument();
  });

  it('shows "Paused" label when tracking is disabled', () => {
    render(<StatusHeader trackingEnabled={false} desktopConnected={false} />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('renders the extension wordmark', () => {
    render(<StatusHeader trackingEnabled={true} desktopConnected={true} />);
    expect(screen.getByText('The Unplugged')).toBeInTheDocument();
  });
});

// ── IntentCard ─────────────────────────────────────────────────────────────

describe('IntentCard', () => {
  it('shows the intent text when an intent is provided', () => {
    render(<IntentCard intent={{ text: 'Prepare DBMS assignment' }} desktopConnected={true} />);
    expect(screen.getByText('Prepare DBMS assignment')).toBeInTheDocument();
  });

  it('shows "Not connected" when intent is null and desktop is unavailable', () => {
    render(<IntentCard intent={null} desktopConnected={false} />);
    expect(screen.getByTestId('intent-fallback')).toHaveTextContent('Not connected');
  });

  it('shows "No intent set" when connected but no intent', () => {
    render(<IntentCard intent={null} desktopConnected={true} />);
    expect(screen.getByTestId('intent-fallback')).toHaveTextContent('No intent set');
  });
});

// ── ActivityCard ──────────────────────────────────────────────────────────

describe('ActivityCard', () => {
  it('shows page title and domain when there is an active tab', () => {
    const tab = { title: 'Database Normalization', url: 'https://example.com/dbms', startTime: Date.now() - 10000 };
    render(<ActivityCard activeTab={tab} now={Date.now()} />);
    expect(screen.getByText('Database Normalization')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('shows active duration timer', () => {
    const now = Date.now();
    const tab = { title: 'Test', url: 'https://test.com', startTime: now - 62000 }; // 1:02
    render(<ActivityCard activeTab={tab} now={now} />);
    expect(screen.getByTestId('activity-timer')).toHaveTextContent('01:02');
  });

  it('shows "No active page detected" when activeTab is null', () => {
    render(<ActivityCard activeTab={null} now={Date.now()} />);
    expect(screen.getByTestId('no-activity')).toBeInTheDocument();
  });
});

// ── TrackingCard ──────────────────────────────────────────────────────────

describe('TrackingCard', () => {
  it('shows "Enabled" when tracking is on', () => {
    render(<TrackingCard trackingEnabled={true} onToggle={vi.fn()} />);
    expect(screen.getByTestId('tracking-status')).toHaveTextContent('Enabled');
  });

  it('shows "Paused" when tracking is off', () => {
    render(<TrackingCard trackingEnabled={false} onToggle={vi.fn()} />);
    expect(screen.getByTestId('tracking-status')).toHaveTextContent('Paused');
  });

  it('calls onToggle with false when the user pauses tracking', () => {
    const onToggle = vi.fn();
    render(<TrackingCard trackingEnabled={true} onToggle={onToggle} />);
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('calls onToggle with true when the user enables tracking', () => {
    const onToggle = vi.fn();
    render(<TrackingCard trackingEnabled={false} onToggle={onToggle} />);
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});

// ── PrivacyPanel ──────────────────────────────────────────────────────────

describe('PrivacyPanel', () => {
  it('does not show the privacy body when closed', () => {
    render(<PrivacyPanel open={false} onToggle={vi.fn()} />);
    expect(screen.queryByTestId('privacy-body')).not.toBeInTheDocument();
  });

  it('shows privacy information when open', () => {
    render(<PrivacyPanel open={true} onToggle={vi.fn()} />);
    expect(screen.getByTestId('privacy-body')).toBeInTheDocument();
    expect(screen.getByText(/URLs & page titles/i)).toBeInTheDocument();
    expect(screen.getByText(/Passwords, form inputs/i)).toBeInTheDocument();
  });

  it('calls onToggle when the toggle row is clicked', () => {
    const onToggle = vi.fn();
    render(<PrivacyPanel open={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Privacy & Tracking'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
