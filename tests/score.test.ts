/**
 * ReclaimScoreService tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReclaimScoreService } from '../desktop/score/ReclaimScoreService.js';
import { StatisticsService } from '../desktop/statistics/StatisticsService.js';
import type { IDatabase } from '../desktop/shared/mocks.js';

/** Configurable mock database for testing different scenarios */
class TestDatabase implements IDatabase {
  constructor(
    public focusMs = 4 * 3600_000,
    public distractionMs = 1.5 * 3600_000,
    public driftCount = 7,
    public returns = 5,
    public screenTime = 6 * 3600_000,
  ) {}

  getScreenTimeToday() { return this.screenTime; }
  getAppUsageToday() { return [{ app: 'VS Code', durationMs: this.screenTime }]; }
  getDriftCountToday() { return this.driftCount; }
  getSuccessfulReturnsToday() { return this.returns; }
  getFocusTimeToday() { return this.focusMs; }
  getDistractionTimeToday() { return this.distractionMs; }
}

describe('ReclaimScoreService', () => {
  function createService(db: IDatabase = new TestDatabase()) {
    const stats = new StatisticsService(db);
    return new ReclaimScoreService(stats);
  }

  it('returns a score between 0 and 100', () => {
    const service = createService();
    const result = service.calculateScore();

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns a breakdown with all fields', () => {
    const service = createService();
    const result = service.calculateScore();

    expect(result.breakdown.focusScore).toBeDefined();
    expect(result.breakdown.distractionPenalty).toBeDefined();
    expect(result.breakdown.driftPenalty).toBeDefined();
    expect(result.breakdown.recoveryBonus).toBeDefined();
  });

  it('returns an explanation string', () => {
    const service = createService();
    const result = service.calculateScore();

    expect(result.explanation).toBeTruthy();
    expect(typeof result.explanation).toBe('string');
    expect(result.explanation.length).toBeGreaterThan(20);
  });

  it('is deterministic — same inputs produce same score', () => {
    const db = new TestDatabase();
    const service1 = createService(db);
    const service2 = createService(db);

    const score1 = service1.calculateScore().score;
    const score2 = service2.calculateScore().score;

    expect(score1).toBe(score2);
  });

  it('gives higher score for more focus', () => {
    const highFocus = createService(new TestDatabase(7 * 3600_000, 0.5 * 3600_000, 2, 2));
    const lowFocus = createService(new TestDatabase(1 * 3600_000, 5 * 3600_000, 8, 1));

    expect(highFocus.calculateScore().score).toBeGreaterThan(lowFocus.calculateScore().score);
  });

  it('penalizes more drift events', () => {
    const fewDrifts = createService(new TestDatabase(4 * 3600_000, 1 * 3600_000, 1, 1));
    const manyDrifts = createService(new TestDatabase(4 * 3600_000, 1 * 3600_000, 10, 1));

    expect(fewDrifts.calculateScore().score).toBeGreaterThan(manyDrifts.calculateScore().score);
  });

  it('rewards successful returns', () => {
    const goodRecovery = createService(new TestDatabase(4 * 3600_000, 1 * 3600_000, 5, 5));
    const poorRecovery = createService(new TestDatabase(4 * 3600_000, 1 * 3600_000, 5, 0));

    expect(goodRecovery.calculateScore().score).toBeGreaterThan(poorRecovery.calculateScore().score);
  });

  it('returns a perfect-ish score with ideal inputs', () => {
    const perfect = createService(new TestDatabase(8 * 3600_000, 0, 0, 0));
    const result = perfect.calculateScore();

    expect(result.score).toBeGreaterThanOrEqual(95);
  });

  it('returns a low score with terrible inputs', () => {
    const terrible = createService(new TestDatabase(0.5 * 3600_000, 7 * 3600_000, 15, 0));
    const result = terrible.calculateScore();

    expect(result.score).toBeLessThan(30);
  });

  it('handles zero active time gracefully', () => {
    const empty = createService(new TestDatabase(0, 0, 0, 0, 0));
    const result = empty.calculateScore();

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('includes date in result', () => {
    const service = createService();
    const result = service.calculateScore();

    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
