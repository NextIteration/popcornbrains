import { describe, it, expect, beforeEach } from 'vitest';
import { TimerLogic } from '../dashboard/src/utils/timer.js';
import type { UserIntent } from '../desktop/shared/types.js';

describe('TimerLogic', () => {
  let timer: TimerLogic;
  let mockIntent: UserIntent;

  beforeEach(() => {
    timer = new TimerLogic();
    mockIntent = {
      id: 'intent-1',
      description: 'Test intent',
      createdAt: 1000,
      applicationHints: []
    };
  });

  it('returns 0 if no intent is provided', () => {
    expect(timer.getElapsed(null, false, 2000)).toBe(0);
  });

  it('calculates elapsed time correctly when not paused', () => {
    // 1000ms have passed since createdAt (1000)
    expect(timer.getElapsed(mockIntent, false, 2000)).toBe(1000);
  });

  it('freezes time while paused', () => {
    // start at 1000, now it is 2000
    expect(timer.getElapsed(mockIntent, false, 2000)).toBe(1000);
    
    // pause at 2000
    expect(timer.getElapsed(mockIntent, true, 2000)).toBe(1000);
    
    // time passes to 3000 while paused, elapsed should remain 1000
    expect(timer.getElapsed(mockIntent, true, 3000)).toBe(1000);
  });

  it('resumes correctly after being paused', () => {
    expect(timer.getElapsed(mockIntent, false, 2000)).toBe(1000);
    
    // pause at 2000
    expect(timer.getElapsed(mockIntent, true, 2000)).toBe(1000);
    
    // time passes to 3000 while paused
    expect(timer.getElapsed(mockIntent, true, 3000)).toBe(1000);
    
    // resume at 3000
    expect(timer.getElapsed(mockIntent, false, 3000)).toBe(1000);
    
    // time passes to 4000 while active
    expect(timer.getElapsed(mockIntent, false, 4000)).toBe(2000);
  });

  it('resets completely if a new intent is provided', () => {
    expect(timer.getElapsed(mockIntent, false, 2000)).toBe(1000);
    
    // pause at 2000
    expect(timer.getElapsed(mockIntent, true, 2000)).toBe(1000);
    
    const newIntent: UserIntent = {
      ...mockIntent,
      id: 'intent-2',
      createdAt: 3000
    };
    
    // new intent provided while paused
    // it was created at 3000, now is 4000
    expect(timer.getElapsed(newIntent, true, 4000)).toBe(0); // still paused at 4000
    
    // unpause at 4000
    expect(timer.getElapsed(newIntent, false, 4000)).toBe(0);
    
    // time passes to 5000
    expect(timer.getElapsed(newIntent, false, 5000)).toBe(1000);
  });

  it('calculates correctly even if called multiple times during pause', () => {
    expect(timer.getElapsed(mockIntent, false, 2000)).toBe(1000);
    
    // pause at 2000
    expect(timer.getElapsed(mockIntent, true, 2000)).toBe(1000);
    expect(timer.getElapsed(mockIntent, true, 2500)).toBe(1000);
    expect(timer.getElapsed(mockIntent, true, 3000)).toBe(1000);
    
    // resume at 3000
    expect(timer.getElapsed(mockIntent, false, 3000)).toBe(1000);
    expect(timer.getElapsed(mockIntent, false, 3500)).toBe(1500);
  });
});
