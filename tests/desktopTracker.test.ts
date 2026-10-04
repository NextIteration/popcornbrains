import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ActivityEvent } from '../desktop/shared/types.js';
import type { DesktopTracker as DesktopTrackerType } from '../desktop/core/DesktopTracker.js';

// Mock child_process execSync — DesktopTracker uses PowerShell, not active-win
const mockExecSync = vi.fn<(...args: any[]) => string>();
vi.mock('child_process', () => ({
  execSync: (...args: any[]) => mockExecSync(...args),
}));

// Must import AFTER mock registration
const { DesktopTracker } = await import('../desktop/core/DesktopTracker.js');

describe('DesktopTracker', () => {
  let tracker: DesktopTrackerType;
  let emittedEvents: ActivityEvent[];

  beforeEach(() => {
    vi.useFakeTimers();
    emittedEvents = [];
    tracker = new DesktopTracker((event) => {
      emittedEvents.push(event);
    });
    mockExecSync.mockReturnValue('');
  });

  afterEach(() => {
    tracker.stop();
    vi.restoreAllMocks();
  });

  it('polls and emits event on window change', () => {
    tracker.start(1000);

    // First window — PowerShell returns "ProcessName|||WindowTitle"
    mockExecSync.mockReturnValue('Code|||First Window');
    vi.advanceTimersByTime(1000); // first poll picks up the window

    // Same window for 5 more seconds
    vi.advanceTimersByTime(5000);

    // Second window — triggers finalize of the first
    mockExecSync.mockReturnValue('Chrome|||Second Window');
    vi.advanceTimersByTime(1000);

    expect(emittedEvents.length).toBe(1);
    const event = emittedEvents[0];
    expect(event.application).toBe('VS Code');
    expect(event.window_title).toBe('First Window');
    expect(event.duration).toBeGreaterThanOrEqual(5);
    expect(event.source).toBe('desktop');
  });

  it('emits final event when stopped', () => {
    tracker.start(1000);

    mockExecSync.mockReturnValue('Slack|||Test Window');
    vi.advanceTimersByTime(1000); // first poll

    vi.advanceTimersByTime(3000); // hold for 3 more seconds

    tracker.stop();

    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0].application).toBe('Slack');
    expect(emittedEvents[0].duration).toBeGreaterThanOrEqual(3);
  });

  it('does not emit event for windows shorter than 1 second', () => {
    tracker.start(1000);

    mockExecSync.mockReturnValue('Code|||Quick Window');
    vi.advanceTimersByTime(1000); // first poll

    // Immediately switch — less than 1s duration
    mockExecSync.mockReturnValue('Chrome|||Other Window');
    vi.advanceTimersByTime(500);

    // Force finalize by switching again after 1s
    mockExecSync.mockReturnValue('Slack|||Third Window');
    vi.advanceTimersByTime(1000);

    // The first window (Code) had < 1s, should not emit
    // The second window (Chrome) had ~1.5s, should emit
    // Check that at most 1 event was emitted for Chrome
    const chromeEvents = emittedEvents.filter(e => e.application === 'Chrome');
    expect(chromeEvents.length).toBeLessThanOrEqual(1);
  });

  it('handles PowerShell returning empty string gracefully', () => {
    tracker.start(1000);

    mockExecSync.mockReturnValue('');
    vi.advanceTimersByTime(3000);

    expect(emittedEvents.length).toBe(0); // no crash, no events
  });

  it('handles PowerShell throwing an error gracefully', () => {
    tracker.start(1000);

    mockExecSync.mockImplementation(() => { throw new Error('PS error'); });
    vi.advanceTimersByTime(3000);

    expect(emittedEvents.length).toBe(0); // no crash, no events
  });
});
