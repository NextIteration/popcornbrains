import type { UserIntent } from '../../../desktop/shared/types.js';

export class TimerLogic {
  private accumulatedPauseMs = 0;
  private pauseStart: number | null = null;
  private lastIntentId: string | null = null;
  private lastPausedState = false;

  getElapsed(intent: UserIntent | null, isTrackingPaused: boolean, now: number): number {
    if (!intent) {
      this.accumulatedPauseMs = 0;
      this.pauseStart = null;
      this.lastIntentId = null;
      this.lastPausedState = isTrackingPaused;
      return 0;
    }

    if (this.lastIntentId !== intent.id) {
      this.accumulatedPauseMs = 0;
      this.pauseStart = isTrackingPaused ? intent.createdAt : null;
      this.lastIntentId = intent.id;
      this.lastPausedState = isTrackingPaused;
    } else if (this.lastPausedState !== isTrackingPaused) {
      if (isTrackingPaused) {
        this.pauseStart = now;
      } else if (this.pauseStart !== null) {
        this.accumulatedPauseMs += now - this.pauseStart;
        this.pauseStart = null;
      }
      this.lastPausedState = isTrackingPaused;
    }

    let currentPause = 0;
    if (isTrackingPaused && this.pauseStart !== null) {
      currentPause = now - this.pauseStart;
    }
    const totalPause = this.accumulatedPauseMs + currentPause;
    return Math.max(0, now - intent.createdAt - totalPause);
  }
}

export const globalTimer = new TimerLogic();
