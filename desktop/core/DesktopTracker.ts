import { execSync } from 'child_process';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ActivityEvent } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PS_SCRIPT = path.join(__dirname, 'get-active-window.ps1');

/**
 * Gets the active window info on Windows using a PowerShell script.
 * No native modules required — works on any Windows machine.
 */
function getActiveWindow(): { title: string; processName: string } | null {
  try {
    const result = execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${PS_SCRIPT}"`,
      { timeout: 4000, encoding: 'utf-8' }
    ).trim();

    const sepIndex = result.indexOf('|||');
    if (sepIndex === -1) return null;
    
    const processName = result.substring(0, sepIndex);
    const title = result.substring(sepIndex + 3);
    if (!processName || !title) return null;
    return { processName, title };
  } catch {
    return null;
  }
}

export class DesktopTracker {
  private timer: NodeJS.Timeout | null = null;
  private currentWindow: {
    title: string;
    owner: string;
    startTime: number;
    lastActiveTime: number;
  } | null = null;
  private onActivityEvent: (event: ActivityEvent) => void;
  private isTracking = false;

  constructor(onActivityEvent: (event: ActivityEvent) => void) {
    this.onActivityEvent = onActivityEvent;
  }

  public start(pollIntervalMs = 3000) {
    if (this.isTracking) return;
    this.isTracking = true;
    
    // Do an immediate first poll
    this.poll();
    
    this.timer = setInterval(() => {
      this.poll();
    }, pollIntervalMs);
  }

  private poll() {
    try {
      const win = getActiveWindow();
      const now = Date.now();
      
      if (!win || !win.title) {
        if (this.currentWindow) {
          this.finalizeCurrentWindow(now);
        }
        return;
      }

      const title = win.title;
      const owner = win.processName;

      const lowerOwner = owner.toLowerCase();
      if (lowerOwner.includes('chrome') || lowerOwner.includes('msedge') || lowerOwner.includes('firefox')) {
        if (this.currentWindow) {
          this.finalizeCurrentWindow(now);
        }
        return;
      }

      if (!this.currentWindow || this.currentWindow.title !== title || this.currentWindow.owner !== owner) {
        if (this.currentWindow) {
          this.finalizeCurrentWindow(now);
        }
        
        this.currentWindow = {
          title,
          owner,
          startTime: now,
          lastActiveTime: now
        };
      } else {
        this.currentWindow.lastActiveTime = now;
      }
    } catch (err) {
      console.error('[DesktopTracker] Error polling active window:', err);
    }
  }

  public stop() {
    this.isTracking = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.currentWindow) {
      this.finalizeCurrentWindow(Date.now());
    }
  }

  private finalizeCurrentWindow(endTime: number) {
    if (!this.currentWindow) return;

    const durationMs = endTime - this.currentWindow.startTime;
    if (durationMs > 1000) {
      const event: ActivityEvent = {
        id: crypto.randomUUID(),
        timestamp: new Date(this.currentWindow.startTime).toISOString(),
        source: 'desktop',
        application: this.formatApplicationName(this.currentWindow.owner),
        window_title: this.currentWindow.title,
        url: '',
        duration: Math.floor(durationMs / 1000),
        is_idle: false,
        metadata: {}
      };
      
      console.log(`[DesktopTracker] ${event.application} — "${event.window_title}" (${event.duration}s)`);
      this.onActivityEvent(event);
    }
    
    this.currentWindow = null;
  }

  private formatApplicationName(processName: string): string {
    const lower = processName.toLowerCase();
    if (lower === 'code' || lower.includes('code')) return 'VS Code';
    if (lower === 'chrome' || lower.includes('chrome')) return 'Chrome';
    if (lower === 'msedge' || lower.includes('edge')) return 'Edge';
    if (lower === 'firefox' || lower.includes('firefox')) return 'Firefox';
    if (lower === 'slack') return 'Slack';
    if (lower === 'discord') return 'Discord';
    if (lower === 'spotify') return 'Spotify';
    if (lower === 'explorer') return 'File Explorer';
    if (lower === 'windowsterminal' || lower === 'wt') return 'Terminal';
    if (lower === 'powershell') return 'PowerShell';
    return processName;
  }
}
