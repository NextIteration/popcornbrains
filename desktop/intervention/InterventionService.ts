/**
 * InterventionService — Member 4
 *
 * Accepts DriftEvents from the drift-detection system and triggers
 * escalating interventions. Does NOT detect drift itself.
 *
 * Levels:
 *   1 — Gentle reminder ("You seem off-task")
 *   2 — Explain mismatch ("You intended X but are doing Y")
 *   3 — Return-to-task prompt ("Let's get you back on track")
 *
 * User can respond: continue (stay), dismiss (close), return (go back to task).
 * Anti-spam: minimum cooldown between interventions, max per window.
 */

import type {
  DriftEvent,
  InterventionLevel,
  InterventionAction,
  InterventionResult,
  InterventionState,
} from '../shared/types.js';

import { InterventionLevel as Level } from '../shared/types.js';

export interface InterventionConfig {
  cooldownMs: number;       // min time between interventions
  maxPerWindow: number;     // max interventions per rolling window
  windowMs: number;         // rolling window size
  autoEscalateMs: number;   // time before auto-escalating to next level
}

const DEFAULT_CONFIG: InterventionConfig = {
  cooldownMs: 30_000,        // 30 seconds
  maxPerWindow: 5,           // max 5 per window
  windowMs: 300_000,         // 5-minute window
  autoEscalateMs: 120_000,   // 2 minutes
};

export class InterventionService {
  private config: InterventionConfig;
  private state: InterventionState;
  private recentInterventions: number[] = []; // timestamps
  private onIntervention: ((level: InterventionLevel, message: string, driftEvent: DriftEvent) => void) | null = null;

  constructor(config: Partial<InterventionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isActive: false,
      currentLevel: null,
      currentDriftEvent: null,
      lastInterventionTime: null,
      interventionCount: 0,
    };
  }

  /**
   * Register a callback for when an intervention should be shown.
   * In the real app this triggers the Electron overlay/notification.
   */
  setInterventionHandler(
    handler: (level: InterventionLevel, message: string, driftEvent: DriftEvent) => void
  ): void {
    this.onIntervention = handler;
  }

  /**
   * Accept a drift event and determine whether to intervene.
   * Returns null if suppressed by anti-spam, or the intervention details.
   */
  handleDriftEvent(event: DriftEvent): InterventionResult | null {
    // Anti-spam: check cooldown
    if (this.state.lastInterventionTime) {
      const elapsed = event.timestamp - this.state.lastInterventionTime;
      if (elapsed < this.config.cooldownMs) {
        return null;
      }
    }

    // Anti-spam: check rate limit in rolling window
    const windowStart = event.timestamp - this.config.windowMs;
    this.recentInterventions = this.recentInterventions.filter(t => t > windowStart);
    if (this.recentInterventions.length >= this.config.maxPerWindow) {
      return null;
    }

    // Determine level based on escalation
    const level = this.determineLevel(event);
    const message = this.generateMessage(level, event);

    // Update state
    this.state = {
      isActive: true,
      currentLevel: level,
      currentDriftEvent: event,
      lastInterventionTime: event.timestamp,
      interventionCount: this.state.interventionCount + 1,
    };
    this.recentInterventions.push(event.timestamp);

    // Notify handler
    if (this.onIntervention) {
      this.onIntervention(level, message, event);
    }

    // Return result with a placeholder action — the real action comes from respondToIntervention()
    return {
      id: `intervention-${event.id}-${level}`,
      level,
      driftEventId: event.id,
      userAction: 'continue', // default, overridden by user response
      timestamp: event.timestamp,
      message,
    };
  }

  /**
   * Handle user's response to an active intervention.
   */
  respondToIntervention(action: InterventionAction): InterventionResult | null {
    if (!this.state.isActive || !this.state.currentDriftEvent) {
      return null;
    }

    const result: InterventionResult = {
      id: `intervention-${this.state.currentDriftEvent.id}-${this.state.currentLevel}`,
      level: this.state.currentLevel!,
      driftEventId: this.state.currentDriftEvent.id,
      userAction: action,
      timestamp: Date.now(),
      message: this.getResponseMessage(action),
    };

    // Reset state after response
    if (action === 'dismiss' || action === 'return' || action === 'continue') {
      this.state = {
        ...this.state,
        isActive: false,
        currentLevel: null,
        currentDriftEvent: null,
      };
    }

    return result;
  }

  /**
   * Get current intervention state.
   */
  getState(): InterventionState {
    return { ...this.state };
  }

  /**
   * Reset the service (e.g., when user sets new intent).
   */
  reset(): void {
    this.state = {
      isActive: false,
      currentLevel: null,
      currentDriftEvent: null,
      lastInterventionTime: null,
      interventionCount: 0,
    };
    this.recentInterventions = [];
  }

  // ----- Private -----

  private determineLevel(event: DriftEvent): InterventionLevel {
    // Escalation logic:
    // - If no current level or was dismissed, start at 1
    // - If already active and enough time passed, escalate
    // - High drift scores can skip to level 2

    if (!this.state.currentLevel) {
      // First intervention: high drift score → start at level 2
      if (event.driftScore > 0.8) {
        return Level.EXPLAIN_MISMATCH;
      }
      return Level.GENTLE_REMINDER;
    }

    // Escalate from current level
    if (this.state.currentLevel < Level.RETURN_TO_TASK) {
      // Check if user has been drifting long enough to escalate
      if (event.durationMs > this.config.autoEscalateMs) {
        return Math.min(this.state.currentLevel + 1, Level.RETURN_TO_TASK) as InterventionLevel;
      }
    }

    return this.state.currentLevel;
  }

  private generateMessage(level: InterventionLevel, event: DriftEvent): string {
    const intent = event.expectedIntent.description;
    const currentApp = event.currentApp;

    switch (level) {
      case Level.GENTLE_REMINDER:
        return `Hey! Just a gentle nudge — you were planning to focus on "${intent}".`;

      case Level.EXPLAIN_MISMATCH:
        return `You intended to work on "${intent}", but you've been on ${currentApp} for ${this.formatDuration(event.durationMs)}. Is this still related to your task?`;

      case Level.RETURN_TO_TASK:
        return `You've been away from "${intent}" for ${this.formatDuration(event.durationMs)}. Let's get you back on track — ready to return?`;

      default:
        return `Time to refocus on "${intent}".`;
    }
  }

  private getResponseMessage(action: InterventionAction): string {
    switch (action) {
      case 'continue':
        return 'Continuing current activity.';
      case 'dismiss':
        return 'Intervention dismissed.';
      case 'return':
        return 'Returning to task.';
    }
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 1) return 'less than a minute';
    if (minutes === 1) return '1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (remaining === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${remaining}m`;
  }
}
