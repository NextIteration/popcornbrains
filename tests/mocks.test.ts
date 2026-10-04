/**
 * Mock services tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockIntentService,
  MockTrackingService,
  MockActivityLogger,
  MockDatabase,
} from '../desktop/shared/mocks.js';

describe('MockIntentService', () => {
  it('returns a default intent', () => {
    const service = new MockIntentService();
    const intent = service.getCurrentIntent();

    expect(intent).not.toBeNull();
    expect(intent!.id).toBeTruthy();
    expect(intent!.description).toBeTruthy();
  });

  it('allows setting intent', () => {
    const service = new MockIntentService();
    service.setIntent(null);
    expect(service.getCurrentIntent()).toBeNull();
  });
});

describe('MockTrackingService', () => {
  it('returns default app', () => {
    const service = new MockTrackingService();
    const app = service.getCurrentApp();

    expect(app.name).toBeTruthy();
    expect(app.title).toBeTruthy();
  });

  it('allows setting current app', () => {
    const service = new MockTrackingService();
    service.setCurrentApp('chrome', 'Google');
    expect(service.getCurrentApp().name).toBe('chrome');
  });
});

describe('MockActivityLogger', () => {
  let logger: MockActivityLogger;

  beforeEach(() => {
    logger = new MockActivityLogger();
  });

  it('starts empty', () => {
    expect(logger.getRecent(10)).toHaveLength(0);
  });

  it('logs and retrieves entries', () => {
    logger.log({
      id: '1',
      type: 'drift',
      timestamp: Date.now(),
      description: 'test',
    });

    expect(logger.getRecent(10)).toHaveLength(1);
  });

  it('returns entries in reverse chronological order', () => {
    logger.log({ id: '1', type: 'drift', timestamp: 100, description: 'first' });
    logger.log({ id: '2', type: 'recovery', timestamp: 200, description: 'second' });

    const recent = logger.getRecent(10);
    expect(recent[0]!.id).toBe('2');
  });

  it('limits to requested count', () => {
    for (let i = 0; i < 20; i++) {
      logger.log({ id: `${i}`, type: 'drift', timestamp: i, description: `entry ${i}` });
    }

    expect(logger.getRecent(5)).toHaveLength(5);
  });

  it('clears entries', () => {
    logger.log({ id: '1', type: 'drift', timestamp: 100, description: 'test' });
    logger.clear();
    expect(logger.getRecent(10)).toHaveLength(0);
  });
});

describe('MockDatabase', () => {
  it('returns reasonable mock values', () => {
    const db = new MockDatabase();

    expect(db.getScreenTimeToday()).toBeGreaterThan(0);
    expect(db.getAppUsageToday().length).toBeGreaterThan(0);
    expect(db.getDriftCountToday()).toBeGreaterThan(0);
    expect(db.getSuccessfulReturnsToday()).toBeGreaterThan(0);
    expect(db.getFocusTimeToday()).toBeGreaterThan(0);
    expect(db.getDistractionTimeToday()).toBeGreaterThan(0);
  });
});
