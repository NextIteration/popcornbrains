/**
 * The Unplugged — Dashboard App
 * Main React application component.
 */

import React from 'react';
import { ScoreCard } from './components/ScoreCard.js';
import { MetricCard } from './components/MetricCard.js';
import { AppUsageCard } from './components/AppUsageCard.js';
import { ActivityFeed } from './components/ActivityFeed.js';
import { InterventionBanner } from './components/InterventionBanner.js';
import { IntentBanner } from './components/IntentBanner.js';
import {
  useStatistics,
  useReclaimScore,
  useCurrentIntent,
  useInterventionState,
  useRecentActivity,
} from './hooks.js';

export function App() {
  const stats = useStatistics();
  const score = useReclaimScore();
  const intent = useCurrentIntent();
  const { state: interventionState, respond, triggerMockDrift } = useInterventionState();
  const activities = useRecentActivity();

  const formatMs = (ms: number): string => {
    const hours = Math.floor(ms / 3600_000);
    const minutes = Math.floor((ms % 3600_000) / 60_000);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  return (
    <div className="dashboard fade-in">
      <header className="dashboard-header">
        <h1>The Unplugged</h1>
        <p className="subtitle">Reclaim your focus — one moment at a time</p>
      </header>

      {intent && <IntentBanner intent={intent} />}

      <div className="dashboard-grid">
        {/* Intervention Banner — shown when active */}
        {interventionState.isActive && interventionState.currentDriftEvent && (
          <InterventionBanner
            state={interventionState}
            onRespond={respond}
          />
        )}

        {/* Reclaim Score */}
        <ScoreCard score={score} />

        {/* Screen Time */}
        <MetricCard
          id="screen-time"
          title="Screen Time"
          value={formatMs(stats.screenTime.totalMs)}
          barPercent={Math.min((stats.screenTime.totalMs / (8 * 3600_000)) * 100, 100)}
          barGradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
          subtitle="Active time today"
        />

        {/* Focus Time */}
        <MetricCard
          id="focus-time"
          title="Focus Time"
          value={formatMs(stats.focusTime.totalFocusMs)}
          barPercent={stats.focusTime.focusPercentage}
          barGradient="linear-gradient(135deg, #22c55e, #16a34a)"
          subtitle={`${stats.focusTime.focusPercentage}% of active time`}
        />

        {/* Mini Stats */}
        <div className="card mini-stat">
          <div className="card-title">Distraction Time</div>
          <div className="metric-value" style={{ color: '#ef4444' }}>
            {formatMs(stats.focusTime.totalDistractionMs)}
          </div>
        </div>

        <div className="card mini-stat">
          <div className="card-title">Drift Events</div>
          <div className="metric-value" style={{ color: '#f59e0b' }}>
            {stats.driftStats.totalDrifts}
          </div>
        </div>

        <div className="card mini-stat">
          <div className="card-title">Successful Returns</div>
          <div className="metric-value" style={{ color: '#22c55e' }}>
            {stats.driftStats.successfulReturns}
          </div>
        </div>

        <div className="card mini-stat">
          <div className="card-title">Return Rate</div>
          <div className="metric-value" style={{ color: '#06b6d4' }}>
            {Math.round(stats.driftStats.returnRate * 100)}%
          </div>
        </div>

        {/* App Usage */}
        <AppUsageCard appUsage={stats.appUsage} />

        {/* Activity Feed */}
        <ActivityFeed activities={activities} />

        {/* Demo Button */}
        {!interventionState.isActive && (
          <div className="card" style={{ gridColumn: 'span 12', textAlign: 'center' }}>
            <button id="trigger-drift" className="btn btn-secondary" onClick={triggerMockDrift}>
              ⚡ Trigger Mock Drift (Demo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
