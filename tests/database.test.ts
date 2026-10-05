import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteDatabase } from '../desktop/core/Database.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('SQLiteDatabase', () => {
  let db: SQLiteDatabase;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `test-db-${Date.now()}.sqlite`);
    db = new SQLiteDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('initializes the database with zero values for today', () => {
    expect(db.getScreenTimeToday()).toBe(0);
    expect(db.getAppUsageToday().length).toBe(0);
    expect(db.getDriftCountToday()).toBe(0);
    expect(db.getSuccessfulReturnsToday()).toBe(0);
    expect(db.getFocusTimeToday()).toBe(0);
    expect(db.getDistractionTimeToday()).toBe(0);
  });

  it('logs activity events and calculates screen time / app usage', () => {
    const timestamp = new Date().toISOString();
    
    db.logActivity({
      id: 'evt-1',
      timestamp,
      source: 'desktop',
      application: 'VS Code',
      window_title: 'Database.ts',
      url: '',
      duration: 3600, // 1 hour
      is_idle: false,
      metadata: {}
    });

    db.logActivity({
      id: 'evt-2',
      timestamp,
      source: 'browser',
      application: 'YouTube',
      window_title: 'Funny cat videos',
      url: 'https://youtube.com',
      duration: 1800, // 30 minutes
      is_idle: false,
      metadata: {}
    });

    db.logActivity({
      id: 'evt-3',
      timestamp,
      source: 'desktop',
      application: 'VS Code',
      window_title: 'Idle time',
      url: '',
      duration: 500, // Idle should not count
      is_idle: true,
      metadata: {}
    });

    db.updateActivityRelevance('evt-1', 'relevant');
    db.updateActivityRelevance('evt-2', 'irrelevant');

    expect(db.getScreenTimeToday()).toBe((3600 + 1800) * 1000); // 1.5 hours in ms
    
    const usage = db.getAppUsageToday();
    expect(usage.length).toBe(2);
    
    const vscode = usage.find(u => u.app === 'VS Code');
    expect(vscode?.durationMs).toBe(3600 * 1000);

    const youtube = usage.find(u => u.app === 'YouTube');
    expect(youtube?.durationMs).toBe(1800 * 1000);

    expect(db.getFocusTimeToday()).toBe(3600 * 1000);
    expect(db.getDistractionTimeToday()).toBe(1800 * 1000);
  });

  it('logs drift events and counts them', () => {
    db.logDrift({
      id: 'drift-1',
      timestamp: Date.now(),
      currentApp: 'Twitter',
      currentTitle: 'Feed',
      expectedIntent: { id: 'int-1', description: 'Work', createdAt: Date.now() },
      driftScore: 0.9,
      durationMs: 60000
    });

    expect(db.getDriftCountToday()).toBe(1);
  });

  it('logs recovery events and counts successful ones', () => {
    db.logRecovery(true);
    db.logRecovery(false);
    db.logRecovery(true);

    expect(db.getSuccessfulReturnsToday()).toBe(2);
  });
});
