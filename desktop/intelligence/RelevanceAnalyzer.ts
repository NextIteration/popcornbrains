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
            `You are a precise focus-drift detector. Your ONLY job is to decide whether the user's current screen activity is semantically related to their stated focus intent.

CRITICAL RULES:
- Compare the ACTUAL CONTENT (window title, page title, URL path, metadata) against the intent's meaning. Do NOT judge by platform/domain alone.
- A YouTube video titled "DBMS Normalization Lecture" IS relevant to intent "Study DBMS normalization" — the platform is irrelevant, the content matters.
- A YouTube video titled "Top 10 Gaming Moments" is NOT relevant to intent "Study DBMS normalization" — even though both are on YouTube.
- Mark "irrelevant" ONLY when the content is CLEARLY unrelated to the intent. When in doubt, prefer "partially_relevant".
- For relevanceScore: 70-100 = clearly on-topic, 40-69 = tangentially related, 0-39 = clearly off-topic.
- In "reason", explain what the content is about and why it does or does not match the intent.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            intentDescription: input.intent.description,
            applicationHints: input.intent.applicationHints ?? [],
            windowTitle: input.title,
            url: input.url,
            pageMetadata: input.metadata ?? {},
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

export class GeminiRelevanceAnalyzer implements RelevanceAnalyzer {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
  ) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.apiKey = apiKey;
    this.model = model;
  }

  async analyze(input: RelevanceInput): Promise<RelevanceResult> {
    const prompt = `You are a precise focus-drift detector. Your ONLY job is to decide whether the user's current screen activity is semantically related to their stated focus intent.

CRITICAL RULES:
- Compare the ACTUAL CONTENT (window title, page title, URL path, metadata) against the intent's meaning. Do NOT judge by platform/domain alone.
- A YouTube video titled "DBMS Normalization Lecture" IS relevant to intent "Study DBMS normalization" — the platform is irrelevant, the content matters.
- A YouTube video titled "Top 10 Gaming Moments" is NOT relevant to intent "Study DBMS normalization" — even though both are on YouTube.
- Similarly, a Wikipedia article about "Database Normal Forms" IS relevant to DBMS study, but a Wikipedia article about "History of Cricket" is NOT.
- Mark "irrelevant" ONLY when the content is CLEARLY unrelated to the intent. When in doubt, prefer "partially_relevant".
- Consider the intent description AND any application hints when judging relevance.

User's Focus Intent: ${input.intent.description}
Allowed Apps / Keywords: ${input.intent.applicationHints?.join(', ') || 'None'}

Current Activity:
Window Title: ${input.title}
URL: ${input.url || 'N/A'}
Page Metadata: ${input.metadata ? JSON.stringify(input.metadata) : 'N/A'}

Return a JSON object with:
1. "relevanceScore": 0-100. 70-100 = clearly on-topic, 40-69 = tangentially related, 0-39 = clearly off-topic.
2. "category": exactly one of "relevant", "partially_relevant", or "irrelevant".
3. "reason": one sentence explaining what the content is about and why it does or does not match the intent.`;

    const modelName = this.model.startsWith('models/')
      ? this.model.replace('models/', '')
      : this.model;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                relevanceScore: { type: 'NUMBER' },
                category: {
                  type: 'STRING',
                  enum: ['relevant', 'partially_relevant', 'irrelevant'],
                },
                reason: { type: 'STRING' },
              },
              required: ['relevanceScore', 'category', 'reason'],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini API error (${response.status} ${response.statusText}): ${errorText}`,
      );
    }

    const data = (await response.json()) as any;
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("========== GEMINI OUTPUT ==========");
    console.log(textResponse);
    console.log("===================================");

    if (!textResponse) {
      throw new Error('Unexpected empty response format from Gemini');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(textResponse);
    } catch {
      throw new Error('Gemini returned invalid relevance JSON');
    }

    if (!validateRelevanceResult(parsed)) {
      throw new Error('Gemini returned an invalid relevance result');
    }

    return parsed;
  }
}
