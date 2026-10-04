import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesktopTracker } from '../desktop/core/DesktopTracker.js';
import type { ActivityEvent } from '../desktop/shared/types.js';

// Mock active-win module
let mockActiveWinResponse: any = null;
vi.mock('active-win', () => ({
  default: vi.fn(async () => mockActiveWinResponse)
}));

describe('DesktopTracker', () => {
  let tracker: DesktopTracker;
  let emittedEvents: ActivityEvent[];

  beforeEach(() => {
    vi.useFakeTimers();
    emittedEvents = [];
    tracker = new DesktopTracker((event) => {
      emittedEvents.push(event);
    });
    mockActiveWinResponse = null;
  });

  afterEach(() => {
    tracker.stop();
    vi.restoreAllMocks();
  });

  it('polls and emits event on window change', async () => {
    tracker.start(1000);
    
    // First window
    mockActiveWinResponse = { title: 'First Window', owner: { name: 'Code.exe' } };
    vi.advanceTimersByTime(1000);
    await Promise.resolve(); // flush microtasks
    
    // Same window, 5 seconds later
    vi.advanceTimersByTime(5000);
    await Promise.resolve();

    // Second window
    mockActiveWinResponse = { title: 'Second Window', owner: { name: 'Chrome.exe' } };
    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(emittedEvents.length).toBe(1);
    const event = emittedEvents[0];
    expect(event.application).toBe('VS Code');
    expect(event.window_title).toBe('First Window');
    expect(event.duration).toBeGreaterThanOrEqual(5);
    expect(event.source).toBe('desktop');
  });

  it('emits final event when stopped', async () => {
    tracker.start(1000);
    
    mockActiveWinResponse = { title: 'Test Window', owner: { name: 'Slack.exe' } };
    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    
    vi.advanceTimersByTime(3000);
    await Promise.resolve();

    tracker.stop();

    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0].application).toBe('Slack');
    expect(emittedEvents[0].duration).toBeGreaterThanOrEqual(3);
  });
});
