/**
 * StatisticsService — Member 4
 *
 * Provides aggregated statistics about the user's screen time,
 * focus, distractions, and drift events.
 *
 * Currently uses mock data from IDatabase. When the real database
 * service is available, swap out the IDatabase implementation.
 *
 * Idle time is conceptually excluded — the mock data represents
 * only active usage time.
 */

import type {
  ScreenTimeStats,
  AppUsageEntry,
  FocusTimeStats,
  DriftStats,
  DailyStatistics,
} from '../shared/types.js';
import type { IDatabase } from '../shared/mocks.js';

export interface IStatisticsService {
  getTodayScreenTime(): ScreenTimeStats;
  getApplicationUsage(): AppUsageEntry[];
  getFocusTime(): FocusTimeStats;
  getDistractionTime(): number;
  getDriftCount(): number;
  getSuccessfulReturns(): number;
  getDailyStatistics(): DailyStatistics;
}

export class StatisticsService implements IStatisticsService {
  private db: IDatabase;

  constructor(db: IDatabase) {
    this.db = db;
  }

  /**
   * Get today's screen time (excluding idle).
   */
  getTodayScreenTime(): ScreenTimeStats {
    const totalMs = this.db.getScreenTimeToday();
    return {
      totalMs,
      activeMs: totalMs, // mock: all time is active (idle excluded conceptually)
      date: this.todayString(),
    };
  }

  /**
   * Get application usage breakdown for today.
   */
  getApplicationUsage(): AppUsageEntry[] {
    const raw = this.db.getAppUsageToday();
    const totalMs = raw.reduce((sum, entry) => sum + entry.durationMs, 0);

    return raw.map(entry => ({
      application: entry.app,
      durationMs: entry.durationMs,
      percentage: totalMs > 0 ? Math.round((entry.durationMs / totalMs) * 100) : 0,
      category: this.categorizeApp(entry.app),
    }));
  }

  /**
   * Get focus time statistics.
   */
  getFocusTime(): FocusTimeStats {
    const focusMs = this.db.getFocusTimeToday();
    const distractionMs = this.db.getDistractionTimeToday();
    const total = focusMs + distractionMs;

    return {
      totalFocusMs: focusMs,
      totalDistractionMs: distractionMs,
      focusPercentage: total > 0 ? Math.round((focusMs / total) * 100) : 0,
      longestFocusStreakMs: Math.floor(focusMs * 0.4), // mock: ~40% of focus time as longest streak
    };
  }

  /**
   * Get total distraction time in ms.
   */
  getDistractionTime(): number {
    return this.db.getDistractionTimeToday();
  }

  /**
   * Get count of drift events today.
   */
  getDriftCount(): number {
    return this.db.getDriftCountToday();
  }

  /**
   * Get count of successful returns today.
   */
  getSuccessfulReturns(): number {
    return this.db.getSuccessfulReturnsToday();
  }

  /**
   * Get complete daily statistics bundle.
   */
  getDailyStatistics(): DailyStatistics {
    return {
      date: this.todayString(),
      screenTime: this.getTodayScreenTime(),
      appUsage: this.getApplicationUsage(),
      focusTime: this.getFocusTime(),
      driftStats: {
        totalDrifts: this.getDriftCount(),
        successfulReturns: this.getSuccessfulReturns(),
        returnRate: this.getDriftCount() > 0
          ? this.getSuccessfulReturns() / this.getDriftCount()
          : 0,
      },
    };
  }

  // ----- Private -----

  private todayString(): string {
    return new Date().toISOString().split('T')[0]!;
  }

  /**
   * Simple app categorization. In real implementation, this would
   * come from user-configured or AI-driven categorization.
   */
  private categorizeApp(app: string): 'productive' | 'neutral' | 'distracting' {
    const lower = app.toLowerCase();
    const productive = ['vs code', 'vscode', 'terminal', 'github', 'figma', 'notion'];
    const distracting = ['youtube', 'twitter', 'reddit', 'instagram', 'tiktok', 'facebook'];

    if (productive.some(p => lower.includes(p))) return 'productive';
    if (distracting.some(d => lower.includes(d))) return 'distracting';
    return 'neutral';
  }
}
