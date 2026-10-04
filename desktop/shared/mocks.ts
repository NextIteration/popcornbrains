/**
 * Mock services for dependencies owned by other members.
 * These will be replaced with real implementations when other members deliver.
 * All mocks implement clean interfaces so swapping is straightforward.
 */

import type { UserIntent, DriftEvent, RecoveryTarget, ActivityEntry } from './types.js';

// ----- Intent Service Mock (Member 1/2) -----

export interface IIntentService {
  getCurrentIntent(): UserIntent | null;
}

export class MockIntentService implements IIntentService {
  private intent: UserIntent | null = {
    id: 'intent-001',
    description: 'Working on TypeScript project',
    applicationHints: ['vscode', 'github.com'],
    createdAt: Date.now() - 3600_000,
  };

  getCurrentIntent(): UserIntent | null {
    return this.intent;
  }

  /** Test helper */
  setIntent(intent: UserIntent | null): void {
    this.intent = intent;
  }
}

// ----- Tracking Service Mock (Member 2) -----

export interface ITrackingService {
  getCurrentApp(): { name: string; title: string };
}

export class MockTrackingService implements ITrackingService {
  private app = { name: 'vscode', title: 'index.ts — popcornbrains' };

  getCurrentApp(): { name: string; title: string } {
    return { ...this.app };
  }

  /** Test helper */
  setCurrentApp(name: string, title: string): void {
    this.app = { name, title };
  }
}

// ----- Activity Logger Mock (Member 3) -----

export interface IActivityLogger {
  log(entry: ActivityEntry): void;
  getRecent(count: number): ActivityEntry[];
}

export class MockActivityLogger implements IActivityLogger {
  private entries: ActivityEntry[] = [];

  log(entry: ActivityEntry): void {
    this.entries.unshift(entry);
    if (this.entries.length > 100) {
      this.entries.pop();
    }
  }

  getRecent(count: number): ActivityEntry[] {
    return this.entries.slice(0, count);
  }

  /** Test helper */
  clear(): void {
    this.entries = [];
  }
}

// ----- Database Mock (Member 3) -----

export interface IDatabase {
  getScreenTimeToday(): number;
  getAppUsageToday(): Array<{ app: string; durationMs: number }>;
  getDriftCountToday(): number;
  getSuccessfulReturnsToday(): number;
  getFocusTimeToday(): number;
  getDistractionTimeToday(): number;
}

export class MockDatabase implements IDatabase {
  getScreenTimeToday(): number {
    return 6 * 3600_000; // 6 hours
  }

  getAppUsageToday(): Array<{ app: string; durationMs: number }> {
    return [
      { app: 'VS Code', durationMs: 3 * 3600_000 },
      { app: 'Chrome', durationMs: 1.5 * 3600_000 },
      { app: 'Slack', durationMs: 45 * 60_000 },
      { app: 'YouTube', durationMs: 30 * 60_000 },
      { app: 'Twitter', durationMs: 15 * 60_000 },
    ];
  }

  getDriftCountToday(): number {
    return 7;
  }

  getSuccessfulReturnsToday(): number {
    return 5;
  }

  getFocusTimeToday(): number {
    return 4 * 3600_000; // 4 hours focused
  }

  getDistractionTimeToday(): number {
    return 1.5 * 3600_000; // 1.5 hours distracted
  }
}
