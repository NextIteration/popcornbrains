import React from 'react';
import type { InterventionState, InterventionAction, InterventionLevel } from '../../../desktop/shared/types.js';

interface InterventionBannerProps {
  state: InterventionState;
  onRespond: (action: InterventionAction) => void;
}

function getLevelLabel(level: InterventionLevel): string {
  switch (level) {
    case 1: return 'Gentle Reminder';
    case 2: return 'Task Mismatch';
    case 3: return 'Return to Task';
    default: return 'Notification';
  }
}

function getLevelEmoji(level: InterventionLevel): string {
  switch (level) {
    case 1: return '💡';
    case 2: return '⚠️';
    case 3: return '🔴';
    default: return '📢';
  }
}

export function InterventionBanner({ state, onRespond }: InterventionBannerProps) {
  if (!state.isActive || !state.currentLevel || !state.currentDriftEvent) {
    return null;
  }

  const level = state.currentLevel;
  const drift = state.currentDriftEvent;
  const intent = drift.expectedIntent.description;

  const messages: Record<number, string> = {
    1: `Hey! Just a gentle nudge — you were planning to focus on "${intent}".`,
    2: `You intended to work on "${intent}", but you've been on ${drift.currentApp}. Is this still related?`,
    3: `You've been away from "${intent}" for a while. Let's get you back on track — ready to return?`,
  };

  return (
    <div className={`intervention-banner level-${level}`} id="intervention-banner">
      <div style={{ fontSize: '2rem' }}>{getLevelEmoji(level)}</div>
      <div className="intervention-content">
        <div className="intervention-level">{getLevelLabel(level)} — Level {level}</div>
        <div className="intervention-message">{messages[level]}</div>
      </div>
      <div className="intervention-actions">
        <button
          id="btn-continue"
          className="btn btn-secondary"
          onClick={() => onRespond('continue')}
        >
          Continue
        </button>
        <button
          id="btn-dismiss"
          className="btn btn-secondary"
          onClick={() => onRespond('dismiss')}
        >
          Dismiss
        </button>
        <button
          id="btn-return"
          className="btn btn-success"
          onClick={() => onRespond('return')}
        >
          Return to Task
        </button>
      </div>
    </div>
  );
}
