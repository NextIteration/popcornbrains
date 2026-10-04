import { MockRelevanceAnalyzer } from '../desktop/intelligence/RelevanceAnalyzer.js';
import { describe, it, expect } from 'vitest';
import { ContextAnalyzer } from '../desktop/intelligence/ContextAnalyzer.js';
import type { ActivityEvent } from '../desktop/intelligence/types.js';
import type { UserIntent } from '../desktop/shared/types.js';
import { validateRelevanceResult } from '../desktop/intelligence/RelevanceAnalyzer.js';
import { ActivityAnalyzer } from '../desktop/intelligence/ActivityAnalyzer.js';
import { DriftDetector } from '../desktop/intelligence/DriftDetector.js';
import type { ActivityAssessment } from '../desktop/intelligence/ContextAnalyzer.js';

const intent: UserIntent = {
  id: 'intent-001',
  description: 'Study DBMS normalization',
  applicationHints: ['vscode', 'mysql'],
  createdAt: 1000,
};

const activity: ActivityEvent = {
  id: 'activity-001',
  timestamp: 2000,
  source: 'desktop',
  application: 'vscode',
  windowTitle: 'database.ts',
  durationMs: 5000,
  isIdle: false,
};

describe('ContextAnalyzer', () => {
  it('creates a relevant activity assessment', () => {
    const analyzer = new ContextAnalyzer();

    const result = analyzer.assessActivity(
      activity,
      intent,
      'relevant',
      90,
      'Activity matches the current intent',
    );

    expect(result.activity).toEqual(activity);
    expect(result.intent).toEqual(intent);
    expect(result.relevance).toBe('relevant');
    expect(result.relevanceScore).toBe(90);
    expect(result.reason).toBe('Activity matches the current intent');
  });

  it('creates a partially relevant activity assessment', () => {
    const analyzer = new ContextAnalyzer();

    const result = analyzer.assessActivity(
      activity,
      intent,
      'partially_relevant',
      60,
      'Activity is somewhat related to the current intent',
    );

    expect(result.relevance).toBe('partially_relevant');
    expect(result.relevanceScore).toBe(60);
  });

  it('creates an irrelevant activity assessment', () => {
    const analyzer = new ContextAnalyzer();

    const result = analyzer.assessActivity(
      activity,
      intent,
      'irrelevant',
      10,
      'Activity does not match the current intent',
    );

    expect(result.relevance).toBe('irrelevant');
    expect(result.relevanceScore).toBe(10);
  });
});
describe('RelevanceAnalyzer contract', () => {
  it('accepts a structured relevance result', async () => {
    const result = {
      relevanceScore: 95,
      category: 'relevant' as const,
      reason: 'The page directly relates to the current task',
    };

    expect(result.relevanceScore).toBe(95);
    expect(result.category).toBe('relevant');
    expect(result.reason).toBeTruthy();
  });

  it('supports partially relevant results', () => {
    const result = {
      relevanceScore: 55,
      category: 'partially_relevant' as const,
      reason: 'The page is somewhat related to the task',
    };

    expect(result.relevanceScore).toBe(55);
    expect(result.category).toBe('partially_relevant');
  });

  it('supports irrelevant results', () => {
    const result = {
      relevanceScore: 5,
      category: 'irrelevant' as const,
      reason: 'The page is unrelated to the current task',
    };

    expect(result.relevanceScore).toBe(5);
    expect(result.category).toBe('irrelevant');
  });
});
describe('MockRelevanceAnalyzer', () => {
  it('marks activity matching an intent hint as relevant', async () => {
    const analyzer = new MockRelevanceAnalyzer();

    const result = await analyzer.analyze({
      intent,
      url: 'https://github.com/project',
      title: 'vscode project',
    });

    expect(result.relevanceScore).toBe(90);
    expect(result.category).toBe('relevant');
    expect(result.reason).toBeTruthy();
  });

  it('marks unrelated activity as irrelevant', async () => {
    const analyzer = new MockRelevanceAnalyzer();

    const result = await analyzer.analyze({
      intent,
      url: 'https://youtube.com',
      title: 'Funny videos',
    });

    expect(result.relevanceScore).toBe(10);
    expect(result.category).toBe('irrelevant');
    expect(result.reason).toBeTruthy();
  });
});
describe('validateRelevanceResult', () => {
  it('accepts a valid relevance result', () => {
    const result = {
      relevanceScore: 85,
      category: 'relevant',
      reason: 'The page matches the current task',
    };

    expect(validateRelevanceResult(result)).toBe(true);
  });

  it('rejects a score outside the valid range', () => {
    const result = {
      relevanceScore: 120,
      category: 'relevant',
      reason: 'Invalid score',
    };

    expect(validateRelevanceResult(result)).toBe(false);
  });

  it('rejects an invalid category', () => {
    const result = {
      relevanceScore: 50,
      category: 'unknown',
      reason: 'Invalid category',
    };

    expect(validateRelevanceResult(result)).toBe(false);
  });

  it('rejects an empty reason', () => {
    const result = {
      relevanceScore: 50,
      category: 'partially_relevant',
      reason: '   ',
    };

    expect(validateRelevanceResult(result)).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(validateRelevanceResult(null)).toBe(false);
    expect(validateRelevanceResult('invalid')).toBe(false);
    expect(validateRelevanceResult({})).toBe(false);
  });
});
describe('ActivityAnalyzer', () => {
  it('combines relevance analysis into an activity assessment', async () => {
    const relevanceAnalyzer = new MockRelevanceAnalyzer();
    const contextAnalyzer = new ContextAnalyzer();
    const analyzer = new ActivityAnalyzer(
      relevanceAnalyzer,
      contextAnalyzer,
    );

    const activity: ActivityEvent = {
      id: 'activity-002',
      timestamp: 3000,
      source: 'browser',
      application: 'chrome',
      windowTitle: 'vscode documentation',
      url: 'https://example.com/vscode',
      durationMs: 5000,
      isIdle: false,
    };

    const result = await analyzer.assessActivity(activity, intent);

    expect(result.activity).toEqual(activity);
    expect(result.intent).toEqual(intent);
    expect(result.relevance).toBe('relevant');
    expect(result.relevanceScore).toBe(90);
  });

  it('marks idle activity as unknown', async () => {
    const relevanceAnalyzer = new MockRelevanceAnalyzer();
    const contextAnalyzer = new ContextAnalyzer();
    const analyzer = new ActivityAnalyzer(
      relevanceAnalyzer,
      contextAnalyzer,
    );

    const activity: ActivityEvent = {
      id: 'activity-003',
      timestamp: 4000,
      source: 'desktop',
      application: 'vscode',
      windowTitle: 'database.ts',
      durationMs: 5000,
      isIdle: true,
    };

    const result = await analyzer.assessActivity(activity, intent);

    expect(result.relevance).toBe('unknown');
    expect(result.relevanceScore).toBe(0);
    expect(result.reason).toBe('Activity is idle');
  });

  it('handles relevance analyzer failure gracefully', async () => {
    const relevanceAnalyzer = {
      analyze: async () => {
        throw new Error('AI unavailable');
      },
    };

    const contextAnalyzer = new ContextAnalyzer();
    const analyzer = new ActivityAnalyzer(
      relevanceAnalyzer,
      contextAnalyzer,
    );

    const result = await analyzer.assessActivity(activity, intent);

    expect(result.relevance).toBe('unknown');
    expect(result.relevanceScore).toBe(0);
    expect(result.reason).toBe('Relevance analysis failed');
  });
});
describe('DriftDetector', () => {
  const createAssessment = (
    timestamp: number,
    relevance: 'relevant' | 'partially_relevant' | 'irrelevant',
    relevanceScore: number,
  ): ActivityAssessment => ({
    activity: {
      id: `activity-${timestamp}`,
      timestamp,
      source: 'desktop',
      application: 'chrome',
      windowTitle: 'YouTube',
      durationMs: 1000,
      isIdle: false,
    },
    intent,
    relevance,
    relevanceScore,
    reason: 'Test assessment',
  });

  it('starts in NORMAL state', () => {
    const detector = new DriftDetector(5000);

    expect(detector.getState()).toBe('NORMAL');
  });

  it('moves to POTENTIAL_DRIFT when activity becomes irrelevant', () => {
    const detector = new DriftDetector(5000);
    const assessment = createAssessment(1000, 'irrelevant', 10);

    const event = detector.update(assessment);

    expect(detector.getState()).toBe('POTENTIAL_DRIFT');
    expect(event).toBeNull();
  });

  it('does not create meaningful drift before the threshold', () => {
    const detector = new DriftDetector(5000);

    detector.update(createAssessment(1000, 'irrelevant', 10));

    const event = detector.update(
      createAssessment(5000, 'irrelevant', 10),
    );

    expect(detector.getState()).toBe('POTENTIAL_DRIFT');
    expect(event).toBeNull();
  });

  it('creates meaningful drift after the persistence threshold', () => {
    const detector = new DriftDetector(5000);

    detector.update(createAssessment(1000, 'irrelevant', 10));

    const event = detector.update(
      createAssessment(6000, 'irrelevant', 10),
    );

    expect(detector.getState()).toBe('MEANINGFUL_DRIFT');
    expect(event).not.toBeNull();
    expect(event?.durationMs).toBe(5000);
    expect(event?.driftScore).toBe(0.9);
  });

  it('resets to NORMAL when relevant activity returns', () => {
    const detector = new DriftDetector(5000);

    detector.update(createAssessment(1000, 'irrelevant', 10));
    detector.update(createAssessment(3000, 'irrelevant', 10));

    const event = detector.update(
      createAssessment(3500, 'relevant', 90),
    );

    expect(detector.getState()).toBe('NORMAL');
    expect(event).toBeNull();
  });

  it('does not emit duplicate events during continuous drift', () => {
    const detector = new DriftDetector(5000);

    detector.update(createAssessment(1000, 'irrelevant', 10));

    const firstEvent = detector.update(
      createAssessment(6000, 'irrelevant', 10),
    );

    const secondEvent = detector.update(
      createAssessment(7000, 'irrelevant', 10),
    );

    expect(firstEvent).not.toBeNull();
    expect(secondEvent).toBeNull();
    expect(detector.getState()).toBe('MEANINGFUL_DRIFT');
  });

  it('ignores idle activity', () => {
    const detector = new DriftDetector(5000);

    const assessment = createAssessment(1000, 'irrelevant', 10);
    assessment.activity.isIdle = true;

    const event = detector.update(assessment);

    expect(detector.getState()).toBe('NORMAL');
    expect(event).toBeNull();
  });

  it('does not treat unknown relevance as drift', () => {
    const detector = new DriftDetector(5000);

    const assessment = createAssessment(1000, 'irrelevant', 10);
    assessment.relevance = 'relevant';

    const event = detector.update(assessment);

    expect(detector.getState()).toBe('NORMAL');
    expect(event).toBeNull();
  });
});