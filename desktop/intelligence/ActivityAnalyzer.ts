import type { UserIntent } from '../shared/types.js';
import type {
  ActivityAssessment,
  ActivityRelevance,
  ContextAnalyzer,
} from './ContextAnalyzer.js';
import type {
  RelevanceAnalyzer,
  RelevanceResult,
} from './RelevanceAnalyzer.js';
import type { ActivityEvent } from './types.js';

export class ActivityAnalyzer {
  constructor(
    private readonly relevanceAnalyzer: RelevanceAnalyzer,
    private readonly contextAnalyzer: ContextAnalyzer,
  ) {}

  async assessActivity(
    activity: ActivityEvent,
    intent: UserIntent,
  ): Promise<ActivityAssessment> {
    if (activity.isIdle) {
      return this.contextAnalyzer.assessActivity(
        activity,
        intent,
        'unknown',
        0,
        'Activity is idle',
      );
    }

    let relevance: RelevanceResult;

    try {
      relevance = await this.relevanceAnalyzer.analyze({
        intent,
        url: activity.url ?? '',
        title: activity.windowTitle,
        metadata: activity.metadata,
      });
    } catch {
      return this.contextAnalyzer.assessActivity(
        activity,
        intent,
        'unknown',
        0,
        'Relevance analysis failed',
      );
    }

    console.log(`[Intelligence] Assessment for "${activity.windowTitle}": ${relevance.category} (Score: ${relevance.relevanceScore}) - Reason: ${relevance.reason}`);

    return this.contextAnalyzer.assessActivity(
      activity,
      intent,
      this.toActivityRelevance(relevance),
      relevance.relevanceScore,
      relevance.reason,
    );
  }

  private toActivityRelevance(
    result: RelevanceResult,
  ): ActivityRelevance {
    if (result.category === 'partially_relevant') {
      return 'unknown';
    }
    return result.category;
  }
}