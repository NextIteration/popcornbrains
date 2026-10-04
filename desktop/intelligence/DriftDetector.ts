import type { DriftEvent, UserIntent } from '../shared/types.js';
import type { ActivityAssessment } from './ContextAnalyzer.js';

export type DriftState =
  | 'NORMAL'
  | 'POTENTIAL_DRIFT'
  | 'MEANINGFUL_DRIFT';

export class DriftDetector {
  private state: DriftState = 'NORMAL';
  private potentialDriftStart: number | null = null;
  private currentAssessment: ActivityAssessment | null = null;
  private emittedForCurrentDrift = false;
  private lastDriftEvent: DriftEvent | null = null;

  constructor(
    private readonly persistenceThresholdMs: number,
  ) {
    if (persistenceThresholdMs <= 0) {
      throw new Error('Persistence threshold must be greater than 0');
    }
  }

  update(assessment: ActivityAssessment): DriftEvent | null {
    this.currentAssessment = assessment;

    if (assessment.activity.isIdle) {
      return null;
    }

    if (
      assessment.relevance === 'relevant' ||
      assessment.relevance === 'unknown'
    ) {
      this.reset();
      return null;
    }

    const timestamp = assessment.activity.timestamp;

    if (this.state === 'NORMAL') {
      this.state = 'POTENTIAL_DRIFT';
      this.potentialDriftStart = timestamp;
      this.emittedForCurrentDrift = false;
      return null;
    }

    if (
      this.state === 'POTENTIAL_DRIFT' &&
      this.potentialDriftStart !== null
    ) {
      const durationMs = timestamp - this.potentialDriftStart;

      if (
        durationMs >= this.persistenceThresholdMs &&
        !this.emittedForCurrentDrift
      ) {
        this.state = 'MEANINGFUL_DRIFT';
        this.emittedForCurrentDrift = true;

        const event = this.createDriftEvent();
        this.lastDriftEvent = event;

        return event;
      }
    }

    return null;
  }

  getState(): DriftState {
    return this.state;
  }

  createDriftEvent(): DriftEvent {
    if (
      this.currentAssessment === null ||
      this.potentialDriftStart === null
    ) {
      throw new Error('No active drift assessment');
    }

    const activity = this.currentAssessment.activity;
    const intent = this.currentAssessment.intent;

    const durationMs = Math.max(
      0,
      activity.timestamp - this.potentialDriftStart,
    );

    const driftScore = Math.min(
      1,
      Math.max(0, 1 - this.currentAssessment.relevanceScore / 100),
    );

    return {
      id: `drift-${activity.id}-${this.potentialDriftStart}`,
      timestamp: activity.timestamp,
      currentApp: activity.application,
      currentTitle: activity.windowTitle,
      expectedIntent: intent,
      driftScore,
      durationMs,
    };
  }

  getLastDriftEvent(): DriftEvent | null {
    return this.lastDriftEvent;
  }

  private reset(): void {
    this.state = 'NORMAL';
    this.potentialDriftStart = null;
    this.emittedForCurrentDrift = false;
    this.currentAssessment = null;
  }
}