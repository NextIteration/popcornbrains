import React from 'react';

interface MetricCardProps {
  id: string;
  title: string;
  value: string;
  barPercent: number;
  barGradient: string;
  subtitle: string;
}

export function MetricCard({ id, title, value, barPercent, barGradient, subtitle }: MetricCardProps) {
  return (
    <div className="card metric-card" id={id}>
      <div className="card-title">{title}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-unit">{subtitle}</div>
      <div className="metric-bar">
        <div
          className="metric-bar-fill"
          style={{
            width: `${Math.min(barPercent, 100)}%`,
            background: barGradient,
          }}
        />
      </div>
    </div>
  );
}
