// ============================================================
// Shared types for the Unplugged desktop application
// Member 4 — Intervention + UI
// ============================================================

// ----- Drift & Intent (consumed from other members) -----

/**
 * Represents a user's declared intent/task.
 * Owned by another member; Member 4 consumes this.
 */
export interface UserIntent {
  id: string;
  description: string;
  applicationHints?: string[];  // e.g. ["vscode", "docs.google.com"]
  createdAt: number;            // epoch ms
}

/**
 * A drift event emitted by the drift-detection service (another member).
 * Member 4's InterventionService accepts these.
 */
export interface DriftEvent {
  id: string;
  timestamp: number;          // epoch ms
  currentApp: string;         // the app/site user drifted to
  currentTitle: string;
  expectedIntent: UserIntent;
  driftScore: number;         // 0-1, how far off-task
  durationMs: number;         // how long user has been off-task
}

// ----- Intervention -----

export enum InterventionLevel {
  GENTLE_REMINDER = 1,
  EXPLAIN_MISMATCH = 2,
  RETURN_TO_TASK = 3,
}

export type InterventionAction = 'continue' | 'dismiss' | 'return';

export interface InterventionRequest {
  driftEvent: DriftEvent;
  level: InterventionLevel;
}

export interface InterventionResult {
  id: string;
  level: InterventionLevel;
  driftEventId: string;
  userAction: InterventionAction;
  timestamp: number;
  message: string;
}

export interface InterventionState {
  isActive: boolean;
  currentLevel: InterventionLevel | null;
  currentDriftEvent: DriftEvent | null;
  lastInterventionTime: number | null;
  interventionCount: number;
}

// ----- Recovery -----

export interface RecoveryTarget {
  application: string;
  windowTitle?: string;
  url?: string;
}

export interface RecoveryResult {
  success: boolean;
  target: RecoveryTarget;
  message: string;
  timestamp: number;
}

// ----- Statistics -----

export interface ScreenTimeStats {
  totalMs: number;
  activeMs: number;
  date: string; // YYYY-MM-DD
}

export interface AppUsageEntry {
  application: string;
  durationMs: number;
  percentage: number;
  category: 'productive' | 'neutral' | 'distracting';
}

export interface FocusTimeStats {
  totalFocusMs: number;
  totalDistractionMs: number;
  focusPercentage: number;
  longestFocusStreakMs: number;
}

export interface DriftStats {
  totalDrifts: number;
  successfulReturns: number;
  returnRate: number; // 0-1
}

export interface DailyStatistics {
  date: string;
  screenTime: ScreenTimeStats;
  appUsage: AppUsageEntry[];
  focusTime: FocusTimeStats;
  driftStats: DriftStats;
}

// ----- Reclaim Score -----

export interface ScoreBreakdown {
  focusScore: number;         // 0-100
  distractionPenalty: number; // 0-100 (subtracted)
  driftPenalty: number;       // 0-100 (subtracted)
  recoveryBonus: number;      // 0-100 (added back)
}

export interface ReclaimScore {
  score: number;              // 0-100 final score
  breakdown: ScoreBreakdown;
  explanation: string;
  timestamp: number;
  date: string;
}

// ----- Activity Feed -----

export type ActivityType = 'drift' | 'intervention' | 'recovery' | 'focus_start' | 'focus_end';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: number;
  description: string;
  metadata?: Record<string, unknown>;
}
