import { SQLiteDatabase } from './Database.js';
import { DesktopTracker } from './DesktopTracker.js';
import { ActivityServer, ServerServices } from './Server.js';
import type { ActivityEvent } from '../shared/types.js';

export class ActivityService {
  private tracker: DesktopTracker;
  private server: ActivityServer;
  
  // M3's DriftDetector or other systems can subscribe to the unified stream here
  private unifiedListeners: Array<(event: ActivityEvent) => void> = [];

  constructor(private services: ServerServices) {
    // 1. Initialize Desktop Tracker
    this.tracker = new DesktopTracker((event) => {
      this.handleIncomingEvent(event);
    });

    // 2. Initialize HTTP Server for Browser Extension events
    this.server = new ActivityServer(this.services);
    this.server.onActivity((event) => {
      // The server already logs it to the DB, but we still broadcast it to our pipeline
      this.notifySubscribers(event);
    });
  }

  private handleIncomingEvent(event: ActivityEvent) {
    // Log to DB
    this.services.db.logActivity(event);
    
    // Broadcast to pipeline
    this.notifySubscribers(event);
  }

  private notifySubscribers(event: ActivityEvent) {
    for (const listener of this.unifiedListeners) {
      listener(event);
    }
  }

  public onActivity(listener: (event: ActivityEvent) => void) {
    this.unifiedListeners.push(listener);
  }

  public start() {
    console.log('[ActivityService] Starting unified pipeline...');
    this.tracker.start(); // Start desktop polling
    this.server.start(3001); // Start HTTP server on port 3001
  }

  public stop() {
    console.log('[ActivityService] Stopping unified pipeline...');
    this.tracker.stop();
    this.server.stop();
  }
}
