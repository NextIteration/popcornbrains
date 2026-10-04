import React from 'react';
import type { 
  DailyStatistics, 
  ReclaimScore, 
  UserIntent, 
  ActivityEntry,
  InterventionState
} from '../../../desktop/shared/types.js';

interface DashboardPageProps {
  stats: DailyStatistics;
  score: ReclaimScore;
  intent: UserIntent | null;
  activities: ActivityEntry[];
  triggerMockDrift: () => void;
  interventionState: InterventionState;
}

function formatMs(ms: number): string {
  const hours = Math.floor(ms / 3600_000);
  const minutes = Math.floor((ms % 3600_000) / 60_000);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function formatTimeOnly(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DashboardPage({ stats, score, intent, activities, triggerMockDrift, interventionState }: DashboardPageProps) {
  
  const isDrifting = interventionState.isActive;
  const intentClass = isDrifting ? 'drifting' : 'on-track';
  const intentStatus = isDrifting ? 'Attention Drifting' : 'On Track';
  const intentIcon = isDrifting ? '⚠️' : '●';

  return (
    <div className="page-container fade-in">
      <div className="dashboard-grid">
        
        {/* CURRENT INTENT CARD */}
        {intent ? (
          <div className={`card intent-card ${intentClass}`}>
            <div className="intent-main">
              <div className="intent-label">CURRENT INTENT</div>
              <div className="intent-value">{intent.description}</div>
              <div className="intent-meta">
                <div className={`intent-status ${intentClass}`}>
                  {intentIcon} {intentStatus}
                </div>
                <div className="intent-duration">Focus session · 42 min</div>
              </div>
            </div>
            <div className="intent-actions">
              <button className="btn btn-secondary">End Focus</button>
              <button className="btn btn-secondary">Change Goal</button>
            </div>
          </div>
        ) : (
          <div className="card intent-card" style={{ borderLeftColor: 'var(--border-color)' }}>
            <div className="intent-main">
              <div className="intent-label">NO ACTIVE INTENT</div>
              <div className="intent-value" style={{ color: 'var(--text-muted)' }}>What do you want to focus on?</div>
            </div>
            <div className="intent-actions">
              <button className="btn btn-primary">Start Focus</button>
            </div>
          </div>
        )}

        {/* RECLAIM SCORE */}
        <div className="card score-card">
          <div className="card-title">RECLAIM SCORE</div>
          <div className="score-value-container">
            <span className="score-value">{score.score}</span>
            <span className="score-max">/100</span>
          </div>
          <ul className="breakdown-list" style={{ marginTop: 'var(--space-md)' }}>
            <li className="breakdown-item">
              <span className="breakdown-label">Focus recovered</span>
              <span className="breakdown-value">{stats.driftStats.successfulReturns} successful returns</span>
            </li>
            <li className="breakdown-item">
              <span className="breakdown-label">Attention reclaimed</span>
              <span className="breakdown-value">{formatMs(stats.focusTime.totalDistractionMs)} distraction</span>
            </li>
            <li className="breakdown-item">
              <span className="breakdown-label">Focus time</span>
              <span className="breakdown-value">{formatMs(stats.focusTime.totalFocusMs)} focused</span>
            </li>
          </ul>
        </div>

        {/* FOCUS PROGRESS */}
        <div className="card focus-progress-card">
          <div className="card-title">TODAY'S FOCUS</div>
          
          <div className="progress-header">
            <span style={{ color: 'var(--text-secondary)' }}>Focus time</span>
            <span style={{ fontWeight: 600 }}>{stats.focusTime.focusPercentage}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${stats.focusTime.focusPercentage}%` }} />
          </div>
          
          <ul className="breakdown-list" style={{ marginTop: 'var(--space-lg)' }}>
            <li className="breakdown-item">
              <span className="breakdown-label">{formatMs(stats.focusTime.totalFocusMs)} focused</span>
            </li>
            <li className="breakdown-item">
              <span className="breakdown-label">{formatMs(stats.focusTime.totalDistractionMs)} distraction</span>
            </li>
            <li className="breakdown-item">
              <span className="breakdown-label">{stats.driftStats.successfulReturns} successful returns</span>
            </li>
          </ul>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="card activity-card">
          <div className="card-title">RECENT ACTIVITY</div>
          <ul className="activity-timeline">
            {activities.slice(0, 4).map((activity) => {
              let iconClass = 'focus';
              let iconChar = '✓';
              let subtitle = 'On track';
              
              if (activity.type === 'drift') {
                iconClass = 'drift';
                iconChar = '⚠';
                subtitle = 'Attention drift';
              } else if (activity.type === 'intervention') {
                iconClass = 'intervention';
                iconChar = '!';
                subtitle = 'Intervention triggered';
              } else if (activity.type === 'recovery') {
                iconClass = 'recovery';
                iconChar = '↩';
                subtitle = 'Successful return';
              }

              // Try to parse app name out of description for a cleaner look
              let mainText = activity.description;
              if (mainText.includes('YouTube')) mainText = 'YouTube';
              else if (mainText.includes('VS Code')) mainText = 'VS Code';
              else if (mainText.includes('Twitter')) mainText = 'Twitter';

              return (
                <li key={activity.id} className="activity-item">
                  <div className="activity-time">{formatTimeOnly(activity.timestamp)}</div>
                  <div className={`activity-icon ${iconClass}`}>{iconChar}</div>
                  <div className="activity-content">
                    <div className="activity-title">{mainText}</div>
                    <div className="activity-subtitle">{subtitle}</div>
                  </div>
                </li>
              );
            })}
            {activities.length === 0 && (
              <li className="activity-item">
                <div className="activity-content" style={{ color: 'var(--text-muted)' }}>No recent activity</div>
              </li>
            )}
          </ul>
        </div>

        {/* COMPACT STATS */}
        <div className="card compact-metric">
          <div className="card-title">DISTRACTION</div>
          <div className="metric-value-compact">{formatMs(stats.focusTime.totalDistractionMs)}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Today</div>
        </div>

        <div className="card compact-metric">
          <div className="card-title">DRIFT EVENTS</div>
          <div className="metric-value-compact">{stats.driftStats.totalDrifts}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Today</div>
        </div>

        <div className="card compact-metric">
          <div className="card-title">RETURNS</div>
          <div className="metric-value-compact">{stats.driftStats.successfulReturns}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Successful</div>
        </div>
        
        {/* DEV CONTROLS */}
        <div style={{ gridColumn: 'span 12', marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={triggerMockDrift} style={{ fontSize: '0.75rem', opacity: 0.5 }}>
            ⚙️ Simulate Drift (Demo)
          </button>
        </div>

      </div>
    </div>
  );
}
