/**
 * ReclaimScoreService — Member 4
 *
 * Computes a deterministic, explainable "Reclaim Score" (0-100)
 * based on focus time, distraction time, drift events, and
 * successful returns.
 *
 * No ML — purely formula-based with transparent breakdown.
 *
 * Formula:
 *   focusScore       = (focusMs / (focusMs + distractionMs)) * 100
 *   distractionPenalty = min(distractionMs / targetMs, 1) * 30
 *   driftPenalty      = min(driftCount / 10, 1) * 20
 *   recoveryBonus    = returnRate * 15
 *
 *   rawScore = focusScore - distractionPenalty - driftPenalty + recoveryBonus
 *   score    = clamp(rawScore, 0, 100)
 */

import type { ReclaimScore, ScoreBreakdown } from '../shared/types.js';
import type { IStatisticsService } from '../statistics/StatisticsService.js';

export interface IReclaimScoreService {
  calculateScore(): ReclaimScore;
}

export interface ScoreConfig {
  distractionTargetMs: number;  // expected max distraction for full penalty
  maxDriftCount: number;        // drift count for full penalty
  distractionWeight: number;    // max points subtracted for distraction
  driftWeight: number;          // max points subtracted for drift
  recoveryWeight: number;       // max points added for recovery
}

const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  distractionTargetMs: 2 * 3600_000,  // 2 hours
  maxDriftCount: 10,
  distractionWeight: 30,
  driftWeight: 20,
  recoveryWeight: 15,
};

export class ReclaimScoreService implements IReclaimScoreService {
  private stats: IStatisticsService;
  private config: ScoreConfig;

  constructor(stats: IStatisticsService, config: Partial<ScoreConfig> = {}) {
    this.stats = stats;
    this.config = { ...DEFAULT_SCORE_CONFIG, ...config };
  }

  /**
   * Calculate the current Reclaim Score with full breakdown.
   */
  calculateScore(): ReclaimScore {
    const focusTime = this.stats.getFocusTime();
    const driftCount = this.stats.getDriftCount();
    const successfulReturns = this.stats.getSuccessfulReturns();
    const distractionMs = this.stats.getDistractionTime();

    const totalActiveMs = focusTime.totalFocusMs + focusTime.totalDistractionMs;

    // Focus score: percentage of active time spent focused (0-100)
    const focusScore = totalActiveMs > 0
      ? (focusTime.totalFocusMs / totalActiveMs) * 100
      : 50; // neutral if no data

    // Distraction penalty: scales linearly up to config weight
    const distractionRatio = Math.min(distractionMs / this.config.distractionTargetMs, 1);
    const distractionPenalty = distractionRatio * this.config.distractionWeight;

    // Drift penalty: scales linearly up to config weight
    const driftRatio = Math.min(driftCount / this.config.maxDriftCount, 1);
    const driftPenalty = driftRatio * this.config.driftWeight;

    // Recovery bonus: return rate * weight
    const returnRate = driftCount > 0 ? successfulReturns / driftCount : 0;
    const recoveryBonus = returnRate * this.config.recoveryWeight;

    // Final score
    const rawScore = focusScore - distractionPenalty - driftPenalty + recoveryBonus;
    const score = Math.round(Math.max(0, Math.min(100, rawScore)));

    const breakdown: ScoreBreakdown = {
      focusScore: Math.round(focusScore),
      distractionPenalty: Math.round(distractionPenalty),
      driftPenalty: Math.round(driftPenalty),
      recoveryBonus: Math.round(recoveryBonus),
    };

    const explanation = this.generateExplanation(score, breakdown, driftCount, successfulReturns, focusTime.focusPercentage);

    return {
      score,
      breakdown,
      explanation,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]!,
    };
  }

  // ----- Private -----

  private generateExplanation(
    score: number,
    breakdown: ScoreBreakdown,
    driftCount: number,
    successfulReturns: number,
    focusPercentage: number,
  ): string {
    const parts: string[] = [];

    // Focus assessment
    if (focusPercentage >= 80) {
      parts.push(`Excellent focus — you spent ${focusPercentage}% of your active time on-task.`);
    } else if (focusPercentage >= 60) {
      parts.push(`Good focus at ${focusPercentage}%, with room to improve.`);
    } else {
      parts.push(`Focus was ${focusPercentage}% — try to reduce context switching.`);
    }

    // Distraction assessment
    if (breakdown.distractionPenalty > 20) {
      parts.push('High distraction time is pulling your score down significantly.');
    } else if (breakdown.distractionPenalty > 10) {
      parts.push('Some distraction time is affecting your score.');
    }

    // Drift assessment
    if (driftCount === 0) {
      parts.push('No drift events — great job staying on track!');
    } else {
      parts.push(`${driftCount} drift event${driftCount > 1 ? 's' : ''} detected.`);
      if (successfulReturns > 0) {
        parts.push(`You recovered ${successfulReturns} time${successfulReturns > 1 ? 's' : ''}, earning a +${breakdown.recoveryBonus} recovery bonus.`);
      }
    }

    // Overall
    if (score >= 80) {
      parts.push('Overall: outstanding productivity today!');
    } else if (score >= 60) {
      parts.push('Overall: solid day with some areas to improve.');
    } else if (score >= 40) {
      parts.push('Overall: an okay day — small changes can make a big difference.');
    } else {
      parts.push('Overall: a tough day. Tomorrow is a fresh start!');
    }

    return parts.join(' ');
  }
}
