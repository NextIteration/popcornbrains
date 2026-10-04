import type { UserIntent } from '../shared/types.js';

export type RelevanceCategory =
  | 'relevant'
  | 'partially_relevant'
  | 'irrelevant';

export interface RelevanceInput {
  intent: UserIntent;
  url: string;
  title: string;
  metadata?: Record<string, unknown>;
}

export interface RelevanceResult {
  relevanceScore: number;
  category: RelevanceCategory;
  reason: string;
}
export function validateRelevanceResult(
  result: unknown,
): result is RelevanceResult {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  const value = result as Record<string, unknown>;

  return (
    typeof value.relevanceScore === 'number' &&
    value.relevanceScore >= 0 &&
    value.relevanceScore <= 100 &&
    Number.isFinite(value.relevanceScore) &&
    (value.category === 'relevant' ||
      value.category === 'partially_relevant' ||
      value.category === 'irrelevant') &&
    typeof value.reason === 'string' &&
    value.reason.trim().length > 0
  );
}
export interface RelevanceAnalyzer {
  analyze(input: RelevanceInput): Promise<RelevanceResult>;
}

export class MockRelevanceAnalyzer implements RelevanceAnalyzer {
  async analyze(input: RelevanceInput): Promise<RelevanceResult> {
    const text =
      `${input.url} ${input.title}`.toLowerCase();

    const hints = input.intent.applicationHints ?? [];

    for (const hint of hints) {
      if (text.includes(hint.toLowerCase())) {
        return {
          relevanceScore: 90,
          category: 'relevant',
          reason: 'The activity matches an intent hint',
        };
      }
    }

    if (text.includes(input.intent.description.toLowerCase())) {
      return {
        relevanceScore: 90,
        category: 'relevant',
        reason: 'The activity matches the current intent',
      };
    }

    return {
      relevanceScore: 10,
      category: 'irrelevant',
      reason: 'The activity does not match the current intent',
    };
  }
}