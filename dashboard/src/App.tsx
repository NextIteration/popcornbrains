/**
 * The Unplugged — Dashboard App
 * Main React application component featuring a desktop application shell.
 */

import React, { useState, useEffect } from 'react';
import {
  useStatistics,
  useReclaimScore,
  useCurrentIntent,
  useInterventionState,
  useRecentActivity,
} from './hooks.js';

// Pages
import { DashboardPage } from './pages/DashboardPage.js';
import { FocusPage } from './pages/FocusPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

// Components
import { InterventionModal } from './components/InterventionModal.js';
import type { InterventionAction } from '../../desktop/shared/types.js';

export type Page = 'dashboard' | 'focus' | 'activity' | 'settings';

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTrackingPaused, setIsTrackingPaused] = useState(false);

  const stats = useStatistics();
  const score = useReclaimScore();
  const { intent, setIntent, clearIntent } = useCurrentIntent();
  const { state: interventionState, respond, triggerMockDrift } = useInterventionState();
  const activities = useRecentActivity();

  const handleRespond = (action: InterventionAction) => {
    respond(action);
    if (action === 'return') {
      setToastMessage('✓ Back to your focus');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage 
            stats={stats} 
            score={score} 
            intent={intent} 
            setIntent={setIntent}
            clearIntent={clearIntent}
            activities={activities}
            triggerMockDrift={triggerMockDrift}
            interventionState={interventionState}
          />
        );
      case 'focus':
        return <FocusPage intent={intent} setIntent={setIntent} clearIntent={clearIntent} isTrackingPaused={isTrackingPaused} setIsTrackingPaused={setIsTrackingPaused} />;
      case 'activity':
        return <ActivityPage activities={activities} />;
      case 'settings':
        return <SettingsPage isTrackingPaused={isTrackingPaused} setIsTrackingPaused={setIsTrackingPaused} />;
      default:
        return null;
    }
  };

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'focus', label: 'Focus', icon: '🎯' },
    { id: 'activity', label: 'Activity', icon: '🕒' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="app-shell fade-in">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-brand">The Unplugged</div>
        <div className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <span style={{ width: '20px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className={`status-dot ${isTrackingPaused ? 'paused' : (interventionState.isActive ? 'drifting' : '')}`} style={isTrackingPaused ? {background: 'var(--text-muted)'} : {}}></div>
          {isTrackingPaused ? 'Tracking paused' : 'Tracking active'}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="greeting">Good afternoon, User</div>
          <div className="topbar-actions">
            {/* Future top bar actions */}
          </div>
        </header>

        {renderPage()}

        {/* Global Intervention Modal */}
        {interventionState.isActive && interventionState.currentDriftEvent && (
          <div className="modal-overlay">
            <InterventionModal
              state={interventionState}
              onRespond={handleRespond}
            />
          </div>
        )}

        {/* Global Toast */}
        {toastMessage && (
          <div className="toast-container">
            {toastMessage}
          </div>
        )}
      </main>
    </div>
  );
}
