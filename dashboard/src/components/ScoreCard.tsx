import React from 'react';
import type { ReclaimScore } from '../../../desktop/shared/types.js';

interface ScoreCardProps {
  score: ReclaimScore;
}

export function ScoreCard({ score }: ScoreCardProps) {
  const circumference = 2 * Math.PI * 78; // radius = 78
  const offset = circumference - (score.score / 100) * circumference;

  return (
    <div className="card score-card" id="score-card">
      <div className="card-title">Reclaim Score</div>

      <div className="score-ring">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <circle
            className="score-ring-bg"
            cx="90" cy="90" r="78"
          />
          <circle
            className="score-ring-fill"
            cx="90" cy="90" r="78"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="score-value">{score.score}</span>
      </div>
      <div className="score-label">out of 100</div>

      <ul className="breakdown-list">
        <li className="breakdown-item">
          <span className="breakdown-label">Focus</span>
          <span className="breakdown-value neutral">{score.breakdown.focusScore}</span>
        </li>
        <li className="breakdown-item">
          <span className="breakdown-label">Distraction</span>
          <span className="breakdown-value negative">−{score.breakdown.distractionPenalty}</span>
        </li>
        <li className="breakdown-item">
          <span className="breakdown-label">Drift</span>
          <span className="breakdown-value negative">−{score.breakdown.driftPenalty}</span>
        </li>
        <li className="breakdown-item">
          <span className="breakdown-label">Recovery</span>
          <span className="breakdown-value positive">+{score.breakdown.recoveryBonus}</span>
        </li>
      </ul>

      <div className="score-explanation">{score.explanation}</div>
    </div>
  );
}
