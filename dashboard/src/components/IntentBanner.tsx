import React from 'react';
import type { UserIntent } from '../../../desktop/shared/types.js';

interface IntentBannerProps {
  intent: UserIntent;
}

export function IntentBanner({ intent }: IntentBannerProps) {
  return (
    <div className="intent-banner" id="intent-banner">
      <div className="intent-icon">🎯</div>
      <div className="intent-text">
        <div className="intent-label">Current Intent</div>
        <div className="intent-value">{intent.description}</div>
      </div>
    </div>
  );
}
