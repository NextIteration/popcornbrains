import React, { useState } from 'react';
import type { ActivityEntry } from '../../../desktop/shared/types.js';

interface ActivityPageProps {
  activities: ActivityEntry[];
}

export function ActivityPage({ activities }: ActivityPageProps) {
  const [filter, setFilter] = useState<'all' | 'focus' | 'drift' | 'returns'>('all');

  const filtered = activities.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'focus' && (a.type === 'focus_start' || a.type === 'focus_end')) return true;
    if (filter === 'drift' && a.type === 'drift') return true;
    if (filter === 'returns' && a.type === 'recovery') return true;
    return false;
  });

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRowDetails = (activity: ActivityEntry) => {
    let mainText = activity.description;
    let category = 'Focus';
    let catColor = 'var(--text-secondary)';
    
    if (mainText.includes('YouTube')) mainText = 'YouTube';
    else if (mainText.includes('VS Code')) mainText = 'VS Code';
    else if (mainText.includes('Twitter')) mainText = 'Twitter';

    if (activity.type === 'drift') {
      category = 'Drift';
      catColor = 'var(--accent-warning)';
    } else if (activity.type === 'recovery') {
      category = 'Return';
      catColor = 'var(--accent-success)';
    }

    return { mainText, category, catColor };
  };

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>Activity</h2>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {(['all', 'focus', 'drift', 'returns'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: 'var(--space-xs) var(--space-md)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid ' + (filter === f ? 'var(--accent-primary)' : 'var(--border-color)'),
                background: filter === f ? 'var(--accent-primary)' : 'white',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer'
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
            <tr>
              <th style={{ padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Time</th>
              <th style={{ padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Activity</th>
              <th style={{ padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((activity, idx) => {
              const { mainText, category, catColor } = getRowDetails(activity);
              return (
                <tr key={activity.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatTime(activity.timestamp)}
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {mainText}
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>{activity.description}</div>
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--font-size-sm)', textAlign: 'right', color: catColor, fontWeight: 500 }}>
                    {category}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No activity matches the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
