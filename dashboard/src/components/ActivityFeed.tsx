import React from 'react';
import type { ActivityEntry } from '../../../desktop/shared/types.js';

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="card activity-card" id="activity-feed">
      <div className="card-title">Recent Activity</div>
      <ul className="activity-list">
        {activities.map((activity) => (
          <li key={activity.id} className="activity-item">
            <span className={`activity-dot ${activity.type}`} />
            <span className="activity-desc">{activity.description}</span>
            <span className="activity-time">{formatTime(activity.timestamp)}</span>
          </li>
        ))}
        {activities.length === 0 && (
          <li className="activity-item">
            <span className="activity-desc" style={{ color: 'var(--text-muted)' }}>
              No recent activity
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
