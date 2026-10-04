import React from 'react';
import type { InterventionState, InterventionAction, InterventionLevel } from '../../../desktop/shared/types.js';

interface InterventionModalProps {
  state: InterventionState;
  onRespond: (action: InterventionAction) => void;
}

export function InterventionModal({ state, onRespond }: InterventionModalProps) {
  if (!state.isActive || !state.currentLevel || !state.currentDriftEvent) {
    return null;
  }

  const level = state.currentLevel;
  const drift = state.currentDriftEvent;
  const intent = drift.expectedIntent.description;

  const renderContent = () => {
    switch (level) {
      case 1:
        return (
          <>
            <div className="modal-header">Attention</div>
            <div className="modal-title">You're drifting from your current goal.</div>
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button className="btn btn-primary" onClick={() => onRespond('continue')}>Continue</button>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="modal-header">Attention Drift</div>
            <div className="modal-title">Activity doesn't match goal</div>
            <div className="modal-message">
              This activity doesn't appear related to:<br />
              <strong style={{ color: 'var(--text-primary)' }}>"{intent}"</strong>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => onRespond('continue')}>Continue</button>
              <button className="btn btn-primary" onClick={() => onRespond('return')}>Return to Task</button>
            </div>
          </>
        );
      case 3:
      default:
        return (
          <>
            <div className="modal-header" style={{ color: 'var(--accent-danger)' }}>Return to your focus</div>
            <div className="modal-title">Attention Drift detected.</div>
            <div className="modal-message">
              You've been away from "{intent}" for a while.
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => onRespond('continue')}>Continue</button>
              <button className="btn btn-primary" style={{ background: 'var(--accent-danger)' }} onClick={() => onRespond('return')}>Return to Task</button>
            </div>
          </>
        );
    }
  };

  return (
    <div className={`intervention-modal level-${level}`}>
      {renderContent()}
    </div>
  );
}
