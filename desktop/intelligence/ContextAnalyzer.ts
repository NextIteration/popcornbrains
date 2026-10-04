import type { UserIntent } from '../shared/types.js';
import type { ActivityEvent } from './types.js';

export type ActivityRelevance =
  | 'relevant'
  | 'partially_relevant'
  | 'irrelevant'
  | 'unknown';

export interface ActivityAssessment {
  activity: ActivityEvent;
  intent: UserIntent;
  relevance: ActivityRelevance;
  relevanceScore: number;
  reason: string;
}

export class ContextAnalyzer {
  assessActivity(
    activity: ActivityEvent,
    intent: UserIntent,
    relevance: ActivityRelevance,
    relevanceScore: number,
    reason: string,
  ): ActivityAssessment {
    return {
      activity,
      intent,
      relevance,
      relevanceScore,
      reason,
    };
  }
}