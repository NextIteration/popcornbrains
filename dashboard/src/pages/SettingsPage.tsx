import React from 'react';
import { useBrowserStatus } from '../hooks.js';

interface SettingsPageProps {
  isTrackingPaused: boolean;
  setIsTrackingPaused: (paused: boolean) => void;
}

export function SettingsPage({ isTrackingPaused, setIsTrackingPaused }: SettingsPageProps) {
  const isBrowserConnected = useBrowserStatus();

  return (
    <div className="page-container fade-in">
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        {/* TRACKING */}
        <div className="settings-section">
          <h2>Tracking</h2>
          <div className="card" style={{ padding: '0 var(--space-lg)' }}>
            <div className="settings-row">
              <div>
                <div className="settings-label">Browser tracking</div>
                <div className="settings-desc">
                  {isBrowserConnected 
                    ? 'Extension connected and monitoring URLs' 
                    : 'Extension not detected. Please install and connect the Chrome extension.'}
                </div>
              </div>
              <div>
                {isBrowserConnected 
                  ? <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>CONNECTED</span>
                  : <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>DISCONNECTED</span>
                }
              </div>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Desktop tracking</div>
                <div className="settings-desc">Allow OS-level window title monitoring</div>
              </div>
              <div><span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>ON</span></div>
            </div>
          </div>
        </div>

        {/* PRIVACY */}
        <div className="settings-section">
          <h2>Your Data & Privacy</h2>
          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
              The Unplugged uses activity data to understand whether your current digital activity matches your focus goal.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <div>
                <div className="card-title">WE COLLECT</div>
                <ul style={{ listStyle: 'none', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <li><span style={{ color: 'var(--accent-success)', marginRight: '8px' }}>✓</span>Application usage</li>
                  <li><span style={{ color: 'var(--accent-success)', marginRight: '8px' }}>✓</span>Browser URLs (while tracking)</li>
                  <li><span style={{ color: 'var(--accent-success)', marginRight: '8px' }}>✓</span>Page titles</li>
                  <li><span style={{ color: 'var(--accent-success)', marginRight: '8px' }}>✓</span>Time spent</li>
                </ul>
              </div>
              <div>
                <div className="card-title">WE DO NOT COLLECT</div>
                <ul style={{ listStyle: 'none', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <li><span style={{ color: 'var(--accent-danger)', marginRight: '8px' }}>✕</span>Passwords & inputs</li>
                  <li><span style={{ color: 'var(--accent-danger)', marginRight: '8px' }}>✕</span>Keystrokes</li>
                  <li><span style={{ color: 'var(--accent-danger)', marginRight: '8px' }}>✕</span>Screenshots</li>
                  <li><span style={{ color: 'var(--accent-danger)', marginRight: '8px' }}>✕</span>Full page content</li>
                </ul>
              </div>
            </div>
            
            <div className="settings-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)', paddingBottom: 0, borderBottom: 'none' }}>
              <div className="settings-label">{isTrackingPaused ? 'Resume tracking' : 'Pause all tracking'}</div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsTrackingPaused(!isTrackingPaused)}
              >
                {isTrackingPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        </div>

        {/* INTERVENTION */}
        <div className="settings-section">
          <h2>Intervention</h2>
          <div className="card" style={{ padding: '0 var(--space-lg)' }}>
            <div className="settings-row">
              <div>
                <div className="settings-label">Gentle reminder</div>
                <div className="settings-desc">Show subtle notification before full intervention</div>
              </div>
              <div><span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>ON</span></div>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Escalation delay</div>
                <div className="settings-desc">Time before next intervention level</div>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>30 sec</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
