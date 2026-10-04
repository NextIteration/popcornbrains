import { ActivityEvent, ActivityMetadata } from '../../../desktop/shared/types';

export class EventBuilder {
  static build(
    windowTitle: string,
    url: string,
    durationMs: number,
    metadata: ActivityMetadata
  ): ActivityEvent | null {
    if (durationMs < 0) {
      return null;
    }
    
    // Ensure URL is a string and valid enough for tracking
    if (!url || typeof url !== 'string') {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: 'browser',
      application: 'Chrome',
      window_title: windowTitle || 'Unknown',
      url: url,
      duration: Math.round(durationMs / 1000), // convert to seconds
      is_idle: false,
      metadata: metadata || {}
    };
  }

  static validate(event: any): boolean {
    if (!event || typeof event !== 'object') return false;
    if (typeof event.id !== 'string') return false;
    if (typeof event.timestamp !== 'string') return false;
    if (event.source !== 'browser') return false;
    if (event.application !== 'Chrome') return false;
    if (typeof event.window_title !== 'string') return false;
    if (typeof event.url !== 'string') return false;
    if (typeof event.duration !== 'number' || event.duration < 0) return false;
    if (typeof event.is_idle !== 'boolean') return false;
    if (!event.metadata || typeof event.metadata !== 'object') return false;
    return true;
  }
}
