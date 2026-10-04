export type ActivitySource = 'desktop' | 'browser';

export interface ActivityEvent {
  id: string;
  timestamp: number;
  source: ActivitySource;
  application: string;
  windowTitle: string;
  url?: string;
  durationMs: number;
  isIdle: boolean;
  metadata?: Record<string, unknown>;
}