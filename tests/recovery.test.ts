/**
 * RecoveryService tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecoveryService } from '../desktop/recovery/RecoveryService.js';
import { MockTrackingService } from '../desktop/shared/mocks.js';
import type { UserIntent } from '../desktop/shared/types.js';

function makeIntent(overrides: Partial<UserIntent> = {}): UserIntent {
  return {
    id: 'intent-test',
    description: 'Work on project',
    applicationHints: ['vscode'],
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('RecoveryService', () => {
  let service: RecoveryService;
  let tracking: MockTrackingService;

  beforeEach(() => {
    tracking = new MockTrackingService();
    service = new RecoveryService(tracking);
  });

  it('starts with no last recovery', () => {
    expect(service.getLastRecovery()).toBeNull();
  });

  it('returns success on recovery', async () => {
    const intent = makeIntent();
    const result = await service.returnToTask(intent);

    expect(result.success).toBe(true);
    expect(result.target.application).toBe('vscode');
    expect(result.message).toContain('vscode');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('stores last recovery', async () => {
    const intent = makeIntent();
    await service.returnToTask(intent);

    const last = service.getLastRecovery();
    expect(last).not.toBeNull();
    expect(last!.success).toBe(true);
  });

  it('resolves URL-based targets', async () => {
    const intent = makeIntent({
      applicationHints: ['docs.google.com'],
      description: 'Write documentation',
    });

    const result = await service.returnToTask(intent);
    expect(result.target.url).toBe('https://docs.google.com');
  });

  it('resolves non-URL targets without url field', async () => {
    const intent = makeIntent({
      applicationHints: ['vscode'],
    });

    const result = await service.returnToTask(intent);
    expect(result.target.url).toBeUndefined();
  });

  it('handles intent with no application hints', async () => {
    const intent = makeIntent({ applicationHints: undefined });
    const result = await service.returnToTask(intent);

    expect(result.success).toBe(true);
    expect(result.target.application).toBe('Unknown');
  });

  it('handles recovery when already on the target app', async () => {
    tracking.setCurrentApp('vscode', 'index.ts');
    const intent = makeIntent({ applicationHints: ['vscode'] });

    const result = await service.returnToTask(intent);
    expect(result.success).toBe(true);
  });
});
