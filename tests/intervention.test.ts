/**
 * InterventionService tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InterventionService } from '../desktop/intervention/InterventionService.js';
import { InterventionLevel } from '../desktop/shared/types.js';
import type { DriftEvent, UserIntent } from '../desktop/shared/types.js';

function makeIntent(overrides: Partial<UserIntent> = {}): UserIntent {
  return {
    id: 'intent-test',
    description: 'Write unit tests',
    applicationHints: ['vscode'],
    createdAt: Date.now() - 3600_000,
    ...overrides,
  };
}

function makeDrift(overrides: Partial<DriftEvent> = {}): DriftEvent {
  return {
    id: `drift-${Date.now()}`,
    timestamp: Date.now(),
    currentApp: 'YouTube',
    currentTitle: 'Funny videos',
    expectedIntent: makeIntent(),
    driftScore: 0.7,
    durationMs: 60_000,
    ...overrides,
  };
}

describe('InterventionService', () => {
  let service: InterventionService;

  beforeEach(() => {
    service = new InterventionService({
      cooldownMs: 100,       // short for testing
      maxPerWindow: 3,
      windowMs: 10_000,
      autoEscalateMs: 5_000,
    });
  });

  it('starts with inactive state', () => {
    const state = service.getState();
    expect(state.isActive).toBe(false);
    expect(state.currentLevel).toBeNull();
    expect(state.currentDriftEvent).toBeNull();
    expect(state.interventionCount).toBe(0);
  });

  it('handles a drift event and returns intervention result', () => {
    const drift = makeDrift();
    const result = service.handleDriftEvent(drift);

    expect(result).not.toBeNull();
    expect(result!.level).toBe(InterventionLevel.GENTLE_REMINDER);
    expect(result!.driftEventId).toBe(drift.id);
    expect(result!.message).toContain('Write unit tests');
  });

  it('sets state to active after drift event', () => {
    service.handleDriftEvent(makeDrift());
    const state = service.getState();

    expect(state.isActive).toBe(true);
    expect(state.currentLevel).toBe(InterventionLevel.GENTLE_REMINDER);
    expect(state.interventionCount).toBe(1);
  });

  it('starts at level 2 for high drift scores', () => {
    const drift = makeDrift({ driftScore: 0.9 });
    const result = service.handleDriftEvent(drift);

    expect(result!.level).toBe(InterventionLevel.EXPLAIN_MISMATCH);
  });

  it('escalates when duration exceeds threshold', () => {
    // First drift → level 1
    const drift1 = makeDrift({ timestamp: Date.now() });
    service.handleDriftEvent(drift1);

    // Second drift after cooldown, long duration → escalates
    const drift2 = makeDrift({
      id: 'drift-2',
      timestamp: Date.now() + 200,
      durationMs: 10_000, // > autoEscalateMs of 5000
    });
    const result = service.handleDriftEvent(drift2);

    expect(result).not.toBeNull();
    expect(result!.level).toBe(InterventionLevel.EXPLAIN_MISMATCH);
  });

  it('respects cooldown anti-spam', () => {
    const now = Date.now();
    service.handleDriftEvent(makeDrift({ timestamp: now }));

    // Too soon (within 100ms cooldown)
    const result = service.handleDriftEvent(makeDrift({
      id: 'drift-spam',
      timestamp: now + 50,
    }));

    expect(result).toBeNull();
  });

  it('respects rate limit anti-spam', () => {
    // Fill up the window (max 3)
    for (let i = 0; i < 3; i++) {
      service.handleDriftEvent(makeDrift({
        id: `drift-${i}`,
        timestamp: Date.now() + (i * 200),
      }));
    }

    // 4th should be blocked
    const result = service.handleDriftEvent(makeDrift({
      id: 'drift-blocked',
      timestamp: Date.now() + 800,
    }));

    expect(result).toBeNull();
  });

  it('responds to intervention with continue', () => {
    service.handleDriftEvent(makeDrift());
    const result = service.respondToIntervention('continue');

    expect(result).not.toBeNull();
    expect(result!.userAction).toBe('continue');
    // Continue now closes the UI, so isActive becomes false
    expect(service.getState().isActive).toBe(false);
  });

  it('responds to intervention with dismiss', () => {
    service.handleDriftEvent(makeDrift());
    const result = service.respondToIntervention('dismiss');

    expect(result).not.toBeNull();
    expect(result!.userAction).toBe('dismiss');
    expect(service.getState().isActive).toBe(false);
  });

  it('responds to intervention with return', () => {
    service.handleDriftEvent(makeDrift());
    const result = service.respondToIntervention('return');

    expect(result).not.toBeNull();
    expect(result!.userAction).toBe('return');
    expect(service.getState().isActive).toBe(false);
  });

  it('returns null when responding with no active intervention', () => {
    const result = service.respondToIntervention('dismiss');
    expect(result).toBeNull();
  });

  it('resets state completely', () => {
    service.handleDriftEvent(makeDrift());
    service.reset();

    const state = service.getState();
    expect(state.isActive).toBe(false);
    expect(state.interventionCount).toBe(0);
    expect(state.lastInterventionTime).toBeNull();
  });

  it('calls the intervention handler', () => {
    let handlerCalled = false;
    let handlerLevel: number | null = null;

    service.setInterventionHandler((level) => {
      handlerCalled = true;
      handlerLevel = level;
    });

    service.handleDriftEvent(makeDrift());

    expect(handlerCalled).toBe(true);
    expect(handlerLevel).toBe(InterventionLevel.GENTLE_REMINDER);
  });

  it('generates appropriate messages for each level', () => {
    const drift = makeDrift();
    const result1 = service.handleDriftEvent(drift);
    expect(result1!.message).toContain('gentle nudge');

    service.reset();

    // High score → level 2
    const drift2 = makeDrift({ driftScore: 0.9 });
    const result2 = service.handleDriftEvent(drift2);
    expect(result2!.message).toContain('intended to work on');
  });
});
