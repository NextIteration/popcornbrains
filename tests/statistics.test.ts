/**
 * StatisticsService tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StatisticsService } from '../desktop/statistics/StatisticsService.js';
import { MockDatabase } from '../desktop/shared/mocks.js';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
    service = new StatisticsService(db);
  });

  it('returns today screen time', () => {
    const screenTime = service.getTodayScreenTime();
    expect(screenTime.totalMs).toBe(6 * 3600_000);
    expect(screenTime.activeMs).toBe(screenTime.totalMs);
    expect(screenTime.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns application usage with categories', () => {
    const usage = service.getApplicationUsage();
    expect(usage.length).toBe(5);

    const vscode = usage.find(u => u.application === 'VS Code');
    expect(vscode).toBeDefined();
    expect(vscode!.category).toBe('productive');
    expect(vscode!.percentage).toBeGreaterThan(0);

    const youtube = usage.find(u => u.application === 'YouTube');
    expect(youtube).toBeDefined();
    expect(youtube!.category).toBe('distracting');
  });

  it('percentages add up to ~100', () => {
    const usage = service.getApplicationUsage();
    const total = usage.reduce((sum, u) => sum + u.percentage, 0);
    // Allow some rounding error
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });

  it('returns focus time stats', () => {
    const focus = service.getFocusTime();
    expect(focus.totalFocusMs).toBe(4 * 3600_000);
    expect(focus.totalDistractionMs).toBe(1.5 * 3600_000);
    expect(focus.focusPercentage).toBeGreaterThan(50);
    expect(focus.longestFocusStreakMs).toBeGreaterThan(0);
  });

  it('returns distraction time', () => {
    const distraction = service.getDistractionTime();
    expect(distraction).toBe(1.5 * 3600_000);
  });

  it('returns drift count', () => {
    expect(service.getDriftCount()).toBe(7);
  });

  it('returns successful returns', () => {
    expect(service.getSuccessfulReturns()).toBe(5);
  });

  it('returns complete daily statistics', () => {
    const daily = service.getDailyStatistics();
    expect(daily.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daily.screenTime).toBeDefined();
    expect(daily.appUsage.length).toBeGreaterThan(0);
    expect(daily.focusTime).toBeDefined();
    expect(daily.driftStats.totalDrifts).toBe(7);
    expect(daily.driftStats.successfulReturns).toBe(5);
    expect(daily.driftStats.returnRate).toBeCloseTo(5 / 7, 2);
  });
});
