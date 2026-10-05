import type { UserIntent } from '../shared/types.js';
import OpenAI from 'openai';

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

export class OpenAIRelevanceAnalyzer implements RelevanceAnalyzer {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL ?? 'gpt-6-luna',
  ) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey,
    });

    this.model = model;
  }

  async analyze(input: RelevanceInput): Promise<RelevanceResult> {
    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content:
            'You classify whether a user activity is relevant to their current intent. Return only the requested structured result.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            intent: input.intent.description,
            applicationHints: input.intent.applicationHints ?? [],
            url: input.url,
            title: input.title,
            metadata: input.metadata ?? {},
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'relevance_result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              relevanceScore: {
                type: 'number',
                minimum: 0,
                maximum: 100,
              },
              category: {
                type: 'string',
                enum: [
                  'relevant',
                  'partially_relevant',
                  'irrelevant',
                ],
              },
              reason: {
                type: 'string',
              },
            },
            required: [
              'relevanceScore',
              'category',
              'reason',
            ],
            additionalProperties: false,
          },
        },
      },
    });

    let parsed: unknown;

    try {
      parsed = JSON.parse(response.output_text);
    } catch {
      throw new Error('OpenAI returned invalid relevance JSON');
    }

    if (!validateRelevanceResult(parsed)) {
      throw new Error('OpenAI returned an invalid relevance result');
    }

    return parsed;
  }
}