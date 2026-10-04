/**
 * Dashboard hooks — wire up Member 4 services for React components.
 * Uses mock data by default; services are instantiated once.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { MockDatabase, MockIntentService, MockTrackingService, MockActivityLogger } from '../../desktop/shared/mocks.js';
import { StatisticsService } from '../../desktop/statistics/StatisticsService.js';
import { ReclaimScoreService } from '../../desktop/score/ReclaimScoreService.js';
import { InterventionService } from '../../desktop/intervention/InterventionService.js';
import { RecoveryService } from '../../desktop/recovery/RecoveryService.js';
import type {
  DailyStatistics,
  ReclaimScore,
  InterventionState,
  InterventionAction,
  ActivityEntry,
  DriftEvent,
  UserIntent,
} from '../../desktop/shared/types.js';

// Singleton service instances (mock-backed)
const mockDb = new MockDatabase();
const mockIntent = new MockIntentService();
const mockTracking = new MockTrackingService();
const mockActivity = new MockActivityLogger();

const statsService = new StatisticsService(mockDb);
const scoreService = new ReclaimScoreService(statsService);
const interventionService = new InterventionService();
const recoveryService = new RecoveryService(mockTracking);

// Seed some mock activity
const mockActivities: ActivityEntry[] = [
  { id: 'a1', type: 'focus_start', timestamp: Date.now() - 3600_000, description: 'Started focused work on TypeScript project' },
  { id: 'a2', type: 'drift', timestamp: Date.now() - 2400_000, description: 'Opened YouTube — possible drift' },
  { id: 'a3', type: 'intervention', timestamp: Date.now() - 2350_000, description: 'Gentle reminder shown' },
  { id: 'a4', type: 'recovery', timestamp: Date.now() - 2300_000, description: 'Returned to VS Code successfully' },
  { id: 'a5', type: 'drift', timestamp: Date.now() - 1200_000, description: 'Switched to Twitter' },
  { id: 'a6', type: 'intervention', timestamp: Date.now() - 1150_000, description: 'Mismatch explanation shown' },
  { id: 'a7', type: 'recovery', timestamp: Date.now() - 1100_000, description: 'Returned to task' },
  { id: 'a8', type: 'focus_end', timestamp: Date.now() - 600_000, description: 'Focus session ended (45 min)' },
  { id: 'a9', type: 'focus_start', timestamp: Date.now() - 300_000, description: 'New focus session started' },
];

mockActivities.forEach(a => mockActivity.log(a));

// ----- Hooks -----

export function useStatistics(): DailyStatistics {
  return useMemo(() => statsService.getDailyStatistics(), []);
}

export function useReclaimScore(): ReclaimScore {
  return useMemo(() => scoreService.calculateScore(), []);
}

export function useCurrentIntent() {
  const [intent, setIntentState] = useState<UserIntent | null>(mockIntent.getCurrentIntent());

  const setIntent = useCallback((description: string) => {
    const newIntent: UserIntent = {
      id: `intent-${Date.now()}`,
      description,
      createdAt: Date.now(),
      applicationHints: []
    };
    mockIntent.setIntent(newIntent);
    setIntentState(newIntent);
  }, []);

  const clearIntent = useCallback(() => {
    mockIntent.setIntent(null);
    setIntentState(null);
    interventionService.reset();
  }, []);

  return { intent, setIntent, clearIntent };
}

export function useInterventionState() {
  const [state, setState] = useState<InterventionState>(interventionService.getState());

  const respond = useCallback((action: InterventionAction) => {
    const result = interventionService.respondToIntervention(action);
    setState(interventionService.getState());

    if (action === 'return') {
      const intent = mockIntent.getCurrentIntent();
      if (intent) {
        recoveryService.returnToTask(intent);
      }
    }

    return result;
  }, []);

  const triggerMockDrift = useCallback(() => {
    const intent = mockIntent.getCurrentIntent();
    if (!intent) return;

    const driftEvent: DriftEvent = {
      id: `drift-${Date.now()}`,
      timestamp: Date.now(),
      currentApp: 'YouTube',
      currentTitle: 'Funny Cat Videos',
      expectedIntent: intent,
      driftScore: 0.85,
      durationMs: 180_000,
    };

    interventionService.handleDriftEvent(driftEvent);
    setState(interventionService.getState());
  }, []);

  return { state, respond, triggerMockDrift };
}

export function useRecentActivity(): ActivityEntry[] {
  return useMemo(() => mockActivity.getRecent(15), []);
}
