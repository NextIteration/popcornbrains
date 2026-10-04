import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { IDatabase } from '../shared/mocks.js';
import type { ActivityEvent, DriftEvent, ActivityEntry } from '../shared/types.js';

export class SQLiteDatabase implements IDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    this.initSchema();
  }

  public close() {
    this.db.close();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_events (
        id TEXT PRIMARY KEY,
        timestamp_ms INTEGER NOT NULL,
        source TEXT NOT NULL,
        application TEXT NOT NULL,
        window_title TEXT,
        url TEXT,
        duration_s INTEGER NOT NULL,
        is_idle INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS drift_events (
        id TEXT PRIMARY KEY,
        timestamp_ms INTEGER NOT NULL,
        current_app TEXT NOT NULL,
        drift_score REAL NOT NULL,
        duration_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recovery_events (
        id TEXT PRIMARY KEY,
        timestamp_ms INTEGER NOT NULL,
        success INTEGER NOT NULL
      );
    `);
  }

  public logActivity(event: ActivityEvent) {
    const stmt = this.db.prepare(`
      INSERT INTO activity_events (id, timestamp_ms, source, application, window_title, url, duration_s, is_idle, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      event.id,
      new Date(event.timestamp).getTime(),
      event.source,
      event.application,
      event.window_title,
      event.url || null,
      event.duration,
      event.is_idle ? 1 : 0,
      JSON.stringify(event.metadata)
    );
  }

  public logDrift(event: DriftEvent) {
    const stmt = this.db.prepare(`
      INSERT INTO drift_events (id, timestamp_ms, current_app, drift_score, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      event.id,
      event.timestamp,
      event.currentApp,
      event.driftScore,
      event.durationMs
    );
  }

  public logRecovery(success: boolean) {
    const stmt = this.db.prepare(`
      INSERT INTO recovery_events (id, timestamp_ms, success)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(
      crypto.randomUUID(),
      Date.now(),
      success ? 1 : 0
    );
  }

  private getStartOfDayMs(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // ----- IDatabase Implementation -----

  getScreenTimeToday(): number {
    const startOfDay = this.getStartOfDayMs();
    const stmt = this.db.prepare(`
      SELECT SUM(duration_s) as total_s 
      FROM activity_events 
      WHERE timestamp_ms >= ? AND is_idle = 0
    `);
    const row = stmt.get(startOfDay) as { total_s: number | null };
    return (row.total_s || 0) * 1000;
  }

  getAppUsageToday(): Array<{ app: string; durationMs: number }> {
    const startOfDay = this.getStartOfDayMs();
    const stmt = this.db.prepare(`
      SELECT application, SUM(duration_s) as total_s 
      FROM activity_events 
      WHERE timestamp_ms >= ? AND is_idle = 0
      GROUP BY application
      ORDER BY total_s DESC
    `);
    const rows = stmt.all(startOfDay) as Array<{ application: string; total_s: number }>;
    return rows.map(r => ({
      app: r.application,
      durationMs: r.total_s * 1000
    }));
  }

  getDriftCountToday(): number {
    const startOfDay = this.getStartOfDayMs();
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM drift_events 
      WHERE timestamp_ms >= ?
    `);
    const row = stmt.get(startOfDay) as { count: number };
    return row.count;
  }

  getSuccessfulReturnsToday(): number {
    const startOfDay = this.getStartOfDayMs();
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM recovery_events 
      WHERE timestamp_ms >= ? AND success = 1
    `);
    const row = stmt.get(startOfDay) as { count: number };
    return row.count;
  }

  getFocusTimeToday(): number {
    // Basic heuristic for focus time vs distraction time based on Mock database structure
    // Since we don't store app categories in DB directly, we'll use a mocked calculation
    // M3 handles AI context scoring, but for dashboard stats we need basic heuristics
    const appUsage = this.getAppUsageToday();
    let focusMs = 0;
    
    // Distraction list
    const distractions = ['youtube', 'twitter', 'facebook', 'reddit', 'netflix'];
    
    for (const usage of appUsage) {
      const appName = usage.app.toLowerCase();
      if (!distractions.some(d => appName.includes(d))) {
        focusMs += usage.durationMs;
      }
    }
    
    return focusMs;
  }

  getDistractionTimeToday(): number {
    const appUsage = this.getAppUsageToday();
    let distractionMs = 0;
    
    const distractions = ['youtube', 'twitter', 'facebook', 'reddit', 'netflix'];
    
    for (const usage of appUsage) {
      const appName = usage.app.toLowerCase();
      if (distractions.some(d => appName.includes(d))) {
        distractionMs += usage.durationMs;
      }
    }
    
    return distractionMs;
  }

  public getRecentActivity(limit: number = 50): ActivityEntry[] {
    const activities = this.db.prepare(`
      SELECT id, timestamp_ms as timestamp, 'focus_start' as type, application || ' - ' || COALESCE(window_title, '') as description
      FROM activity_events
      ORDER BY timestamp_ms DESC
      LIMIT ?
    `).all(limit) as any[];

    const drifts = this.db.prepare(`
      SELECT id, timestamp_ms as timestamp, 'drift' as type, 'Drifted to ' || current_app as description
      FROM drift_events
      ORDER BY timestamp_ms DESC
      LIMIT ?
    `).all(limit) as any[];

    const recoveries = this.db.prepare(`
      SELECT id, timestamp_ms as timestamp, 'recovery' as type, 'Returned to focus' as description
      FROM recovery_events
      ORDER BY timestamp_ms DESC
      LIMIT ?
    `).all(limit) as any[];

    const combined = [...activities, ...drifts, ...recoveries];
    combined.sort((a, b) => b.timestamp - a.timestamp);
    return combined.slice(0, limit);
  }
}
