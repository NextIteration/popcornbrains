import React from 'react';
import type { AppUsageEntry } from '../../../desktop/shared/types.js';

interface AppUsageCardProps {
  appUsage: AppUsageEntry[];
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600_000);
  const minutes = Math.floor((ms % 3600_000) / 60_000);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function AppUsageCard({ appUsage }: AppUsageCardProps) {
  return (
    <div className="card app-usage-card" id="app-usage">
      <div className="card-title">Application Usage</div>
      <ul className="app-list">
        {appUsage.map((app) => (
          <li key={app.application} className="app-item">
            <span className="app-name">{app.application}</span>
            <div className="app-bar-container">
              <div
                className={`app-bar-fill ${app.category}`}
                style={{ width: `${app.percentage}%` }}
              >
                {app.percentage > 8 && (
                  <span className="app-percentage">{app.percentage}%</span>
                )}
              </div>
            </div>
            <span className="app-duration">{formatDuration(app.durationMs)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
