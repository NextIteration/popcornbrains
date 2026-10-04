import React, { useState, useEffect, useCallback } from 'react';
import { ConsentManager } from '../background/consent';
import { fetchCurrentIntent, CurrentIntent } from './intentProvider';

// ── Types ──────────────────────────────────────────────────────────────────

interface ActiveTabInfo {
  title: string;
  url: string;
  startTime: number;
}

interface PopupState {
  loading: boolean;
  hasConsented: boolean | null;    // null = not yet checked
  trackingEnabled: boolean;
  activeTab: ActiveTabInfo | null;
  intent: CurrentIntent | null;
  desktopConnected: boolean;
  privacyOpen: boolean;
  now: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── ConsentScreen ──────────────────────────────────────────────────────────

interface ConsentScreenProps {
  onAgree: () => void;
  onDecline: () => void;
}

export function ConsentScreen({ onAgree, onDecline }: ConsentScreenProps) {
  return (
    <div className="consent-screen" data-testid="consent-screen">
      <div className="consent-screen__header">
        <div className="consent-screen__logo">🔒</div>
        <h1 className="consent-screen__title">Protect Your Attention</h1>
        <p className="consent-screen__subtitle">
          The Unplugged uses limited browser activity to understand whether your
          browsing matches your current focus goal.
        </p>
      </div>

      <div className="consent-screen__body">
        <p className="consent-screen__section-title consent-screen__section-title--collect">We collect</p>
        <ul className="consent-list consent-list--collect">
          <li>Websites / URLs while tracking is on</li>
          <li>Page titles</li>
          <li>Limited page metadata</li>
          <li>Tab activity &amp; time spent</li>
        </ul>

        <p className="consent-screen__section-title consent-screen__section-title--never">We NEVER collect</p>
        <ul className="consent-list consent-list--never">
          <li>Passwords</li>
          <li>Form inputs or keystrokes</li>
          <li>Screenshots</li>
          <li>Cookies or clipboard</li>
          <li>Full page content</li>
        </ul>
      </div>

      <div className="consent-screen__footer">
        <p className="consent-screen__notice">
          Activity is sent only to the local The Unplugged desktop app — never to a remote server.
        </p>
        <button id="consent-agree-btn" className="btn-primary" onClick={onAgree}>
          I Agree &amp; Enable Tracking
        </button>
        <button id="consent-decline-btn" className="btn-secondary" onClick={onDecline}>
          Not Now
        </button>
      </div>
    </div>
  );
}

// ── StatusHeader ──────────────────────────────────────────────────────────

interface StatusHeaderProps {
  trackingEnabled: boolean;
  desktopConnected: boolean;
}

export function StatusHeader({ trackingEnabled, desktopConnected }: StatusHeaderProps) {
  const dotClass = trackingEnabled ? 'dot dot--green' : 'dot dot--grey';
  const label = trackingEnabled ? 'Tracking' : 'Paused';

  return (
    <header className="popup-header" data-testid="status-header">
      <div className="popup-header__logo">
        <span className="popup-header__wordmark">The Unplugged</span>
      </div>
      <div className="popup-header__dot">
        {!desktopConnected && (
          <span className="dot dot--amber" title="Desktop app unavailable" />
        )}
        <span className={dotClass} />
        <span>{label}</span>
      </div>
    </header>
  );
}

// ── IntentCard ────────────────────────────────────────────────────────────

interface IntentCardProps {
  intent: CurrentIntent | null;
  desktopConnected: boolean;
}

export function IntentCard({ intent, desktopConnected }: IntentCardProps) {
  return (
    <section className="card" data-testid="intent-card">
      <p className="card__label">Current Intent</p>
      <div className="intent-card__content">
        <span className="intent-card__icon">🎯</span>
        {intent ? (
          <span className="intent-card__text">{intent.text}</span>
        ) : (
          <span className="intent-card__none" data-testid="intent-fallback">
            {desktopConnected ? 'No intent set' : 'Not connected'}
          </span>
        )}
      </div>
    </section>
  );
}

// ── ActivityCard ──────────────────────────────────────────────────────────

interface ActivityCardProps {
  activeTab: ActiveTabInfo | null;
  now: number;
}

export function ActivityCard({ activeTab, now }: ActivityCardProps) {
  return (
    <section className="card" data-testid="activity-card">
      <p className="card__label">Current Activity</p>
      {activeTab ? (
        <>
          <p className="activity-card__title" title={activeTab.title}>
            {activeTab.title || getDomain(activeTab.url)}
          </p>
          <p className="activity-card__domain">{getDomain(activeTab.url)}</p>
          <span className="activity-card__timer" data-testid="activity-timer">
            Active: {formatDuration(now - activeTab.startTime)}
          </span>
        </>
      ) : (
        <p className="activity-card__none state-msg" data-testid="no-activity">
          No active page detected
        </p>
      )}
    </section>
  );
}

// ── TrackingCard ─────────────────────────────────────────────────────────

interface TrackingCardProps {
  trackingEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function TrackingCard({ trackingEnabled, onToggle }: TrackingCardProps) {
  return (
    <section className="card" data-testid="tracking-card">
      <p className="card__label">Tracking</p>
      <div className="tracking-card__row">
        <span
          className={`tracking-card__status ${trackingEnabled ? 'tracking-card__status--enabled' : 'tracking-card__status--paused'}`}
          data-testid="tracking-status"
        >
          <span className={`dot ${trackingEnabled ? 'dot--green' : 'dot--grey'}`} />
          {trackingEnabled ? 'Enabled' : 'Paused'}
        </span>

        <label className="toggle" title={trackingEnabled ? 'Pause tracking' : 'Enable tracking'}>
          <input
            type="checkbox"
            id="tracking-toggle"
            checked={trackingEnabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <div className="toggle__track">
            <div className="toggle__thumb" />
          </div>
        </label>
      </div>
    </section>
  );
}

// ── OpenAppButton ─────────────────────────────────────────────────────────

export function OpenAppButton() {
  const handleClick = useCallback(() => {
    // Stub: posts a message to the service worker which can relay to native
    // messaging or simply open a URL when the desktop registers a protocol handler.
    // The real implementation will be wired when the desktop team exposes the mechanism.
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'OPEN_DESKTOP_APP' });
    }
  }, []);

  return (
    <div className="open-btn-wrapper">
      <button id="open-desktop-app-btn" className="open-btn" onClick={handleClick}>
        Open The Unplugged
      </button>
    </div>
  );
}

// ── PrivacyPanel ─────────────────────────────────────────────────────────

interface PrivacyPanelProps {
  open: boolean;
  onToggle: () => void;
}

export function PrivacyPanel({ open, onToggle }: PrivacyPanelProps) {
  return (
    <section className="privacy-panel" data-testid="privacy-panel">
      <div
        className="privacy-panel__toggle"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        id="privacy-panel-toggle"
      >
        <span className="privacy-panel__label">Privacy &amp; Tracking</span>
        <span className={`privacy-panel__chevron ${open ? 'privacy-panel__chevron--open' : ''}`}>▾</span>
      </div>

      {open && (
        <div className="privacy-panel__body" data-testid="privacy-body">
          <p className="privacy-list__head">We collect</p>
          <ul className="privacy-list">
            <li>URLs &amp; page titles while tracking is on</li>
            <li>Limited metadata (description, og:title)</li>
            <li>Tab activity and time spent</li>
          </ul>
          <p className="privacy-list__head">We never collect</p>
          <ul className="privacy-list">
            <li>Passwords, form inputs, keystrokes</li>
            <li>Screenshots, cookies, clipboard</li>
            <li>Full page content or DOM</li>
          </ul>
          <p className="privacy-list__head">How to stop tracking</p>
          <ul className="privacy-list">
            <li>Toggle tracking off above, or remove the extension</li>
          </ul>
        </div>
      )}
    </section>
  );
}

// ── App (main popup) ──────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<PopupState>({
    loading: true,
    hasConsented: null,
    trackingEnabled: false,
    activeTab: null,
    intent: null,
    desktopConnected: false,
    privacyOpen: false,
    now: Date.now(),
  });

  // Load initial state from chrome.storage + intent endpoint
  useEffect(() => {
    async function init() {
      const consented = await ConsentManager.hasConsented();
      const intent = await fetchCurrentIntent();

let activeTab: ActiveTabInfo | null = null;
let desktopConnected = intent !== null;

if (
  consented &&
  typeof chrome !== 'undefined' &&
  chrome.runtime
) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_CURRENT_ACTIVITY',
    });

    if (response?.activeTab) {
      activeTab = response.activeTab as ActiveTabInfo;
    }
  } catch {
    // Service worker unavailable in test/dev context
  }
}

      setState(s => ({
        ...s,
        loading: false,
        hasConsented: consented,
        trackingEnabled: consented,
        activeTab,
        intent,
        desktopConnected,
      }));
    }

    init();
  }, []);

  // Live clock tick for active duration display
  useEffect(() => {
    if (!state.trackingEnabled || !state.activeTab) return;
    const id = setInterval(() => setState(s => ({ ...s, now: Date.now() })), 1000);
    return () => clearInterval(id);
  }, [state.trackingEnabled, state.activeTab]);

  const handleAgree = useCallback(async () => {
    await ConsentManager.setConsent(true);
    let activeTab: ActiveTabInfo | null = null;
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'GET_CURRENT_ACTIVITY',
        });
        if (response?.activeTab) {
          activeTab = response.activeTab as ActiveTabInfo;
        }
      } catch {
        // Service worker unavailable in test/dev context
      }
    }
    setState(s => ({ ...s, hasConsented: true, trackingEnabled: true, activeTab }));
  }, []);

  const handleDecline = useCallback(async () => {
    await ConsentManager.setConsent(false);
    setState(s => ({ ...s, hasConsented: false, trackingEnabled: false, activeTab: null }));
  }, []);

  const handleTrackingToggle = useCallback(async (enabled: boolean) => {
    await ConsentManager.setConsent(enabled);
    let activeTab: ActiveTabInfo | null = null;
    if (enabled && typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'GET_CURRENT_ACTIVITY',
        });
        if (response?.activeTab) {
          activeTab = response.activeTab as ActiveTabInfo;
        }
      } catch {
        // Service worker unavailable in test/dev context
      }
    }
    setState(s => ({
      ...s,
      trackingEnabled: enabled,
      activeTab: enabled ? activeTab : null,
    }));
  }, []);

  const handlePrivacyToggle = useCallback(() => {
    setState(s => ({ ...s, privacyOpen: !s.privacyOpen }));
  }, []);

  if (state.loading) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
        Loading…
      </div>
    );
  }

  // First-use: consent never given
  if (state.hasConsented === false || state.hasConsented === null) {
    return (
      <ConsentScreen onAgree={handleAgree} onDecline={handleDecline} />
    );
  }

  return (
    <div className="popup-root" data-testid="popup-main">
      <StatusHeader
        trackingEnabled={state.trackingEnabled}
        desktopConnected={state.desktopConnected}
      />

      <IntentCard
        intent={state.intent}
        desktopConnected={state.desktopConnected}
      />

      <ActivityCard
        activeTab={state.trackingEnabled ? state.activeTab : null}
        now={state.now}
      />

      <TrackingCard
        trackingEnabled={state.trackingEnabled}
        onToggle={handleTrackingToggle}
      />

      <OpenAppButton />

      <PrivacyPanel
        open={state.privacyOpen}
        onToggle={handlePrivacyToggle}
      />
    </div>
  );
}
