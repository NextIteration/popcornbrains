import { SQLiteDatabase } from './core/Database.js';
import { ActivityService } from './core/ActivityService.js';
import { IntentService } from './core/IntentService.js';
import type { ServerServices } from './core/Server.js';

// M3
import { ContextAnalyzer } from './intelligence/ContextAnalyzer.js';
import { ActivityAnalyzer } from './intelligence/ActivityAnalyzer.js';
import { DriftDetector } from './intelligence/DriftDetector.js';
import {
  MockRelevanceAnalyzer,
  GeminiRelevanceAnalyzer,
  OpenAIRelevanceAnalyzer,
} from './intelligence/RelevanceAnalyzer.js';
import type { ActivityEvent as IntelligenceActivityEvent } from './intelligence/types.js';

// M4
import { StatisticsService } from './statistics/StatisticsService.js';
import { ReclaimScoreService } from './score/ReclaimScoreService.js';
import { InterventionService } from './intervention/InterventionService.js';
import { RecoveryService } from './recovery/RecoveryService.js';
import { MockTrackingService } from './shared/mocks.js';

import type { ActivityEvent } from './shared/types.js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ override: true });

// --- Dependency Injection Setup ---

const dbPath = path.join(process.cwd(), 'data', 'app.sqlite');
const db = new SQLiteDatabase(dbPath);

const intentService = new IntentService();

const statsService = new StatisticsService(db);
const scoreService = new ReclaimScoreService(statsService);

const interventionService = new InterventionService();

// RecoveryService expects ITrackingService — use mock for now
const mockTracking = new MockTrackingService();
const recoveryService = new RecoveryService(mockTracking);

const services: ServerServices = {
  db,
  statsService,
  scoreService,
  intentService,
  interventionService,
  recoveryService
};

const activityService = new ActivityService(services);

// --- M3 Intelligence Pipeline Wiring ---

const relevanceAnalyzer = process.env.GEMINI_API_KEY
  ? new GeminiRelevanceAnalyzer()
  : process.env.OPENAI_API_KEY
    ? new OpenAIRelevanceAnalyzer()
    : new MockRelevanceAnalyzer();
const contextAnalyzer = new ContextAnalyzer();
const activityAnalyzer = new ActivityAnalyzer(relevanceAnalyzer, contextAnalyzer);
const driftDetector = new DriftDetector(60_000); // 60s persistence threshold

/**
 * Adapt shared/types ActivityEvent → intelligence/types ActivityEvent.
 * The M3 intelligence pipeline uses its own ActivityEvent shape with
 * different field names (windowTitle vs window_title, durationMs vs duration, etc.).
 */
function toIntelligenceEvent(event: ActivityEvent): IntelligenceActivityEvent {
  return {
    id: event.id,
    timestamp: new Date(event.timestamp).getTime(),
    source: event.source as 'desktop' | 'browser',
    application: event.application,
    windowTitle: event.window_title,
    url: event.url || undefined,
    durationMs: event.duration * 1000,
    isIdle: event.is_idle,
    metadata: event.metadata as Record<string, unknown> | undefined,
  };
}

activityService.onActivity(async (event: ActivityEvent) => {
  const currentIntent = intentService.getCurrentIntent();
  if (!currentIntent) return; // No intent = no drift detection possible

  const intelligenceEvent = toIntelligenceEvent(event);
  const assessment = await activityAnalyzer.assessActivity(intelligenceEvent, currentIntent);
  db.updateActivityRelevance(event.id, assessment.relevance);
  const driftEvent = driftDetector.update(assessment);

  if (driftEvent) {
    // Log drift to DB and pass to M4 InterventionService
    db.logDrift(driftEvent);
    interventionService.handleDriftEvent(driftEvent);
  }
});

// --- Boot ---
console.log('┌──────────────────────────────────────────┐');
console.log('│     PopcornBrains Backend — Running       │');
console.log('│                                          │');
console.log('│  Desktop Tracker:  polling active window  │');
console.log('│  HTTP Server:      http://localhost:3001   │');
console.log('│  Dashboard:        npm run dev             │');
console.log('└──────────────────────────────────────────┘');
activityService.start();
