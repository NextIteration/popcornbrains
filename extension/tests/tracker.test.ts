import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tracker } from '../src/background/tracker';

describe('Tracker', () => {
  let mockSender: any;
  let tracker: Tracker;

  beforeEach(() => {
    mockSender = vi.fn();
    tracker = new Tracker(mockSender);
    vi.useFakeTimers();
  });

  it('starts tracking correctly', () => {
    tracker.startTracking(1, 10, 'https://example.com', 'Example', 1000);
    expect(tracker.getActiveTab()).toEqual({
      tabId: 1,
      windowId: 10,
      url: 'https://example.com',
      title: 'Example',
      startTime: 1000
    });
  });

  it('finalizes tracking and sends event', () => {
    tracker.startTracking(1, 10, 'https://example.com', 'Example', 1000);
    tracker.finalizeCurrentTab(6000, { title: 'Metadata Title' });

    expect(mockSender).toHaveBeenCalledTimes(1);
    const event = mockSender.mock.calls[0][0];
    
    expect(event.application).toBe('Chrome');
    expect(event.source).toBe('browser');
    expect(event.window_title).toBe('Example');
    expect(event.url).toBe('https://example.com');
    expect(event.duration).toBe(5); // 5000ms -> 5s
    expect(event.metadata.title).toBe('Metadata Title');
    expect(tracker.getActiveTab()).toBeNull();
  });

  it('does not send event if duration is 0', () => {
    tracker.startTracking(1, 10, 'https://example.com', 'Example', 1000);
    tracker.finalizeCurrentTab(1000);
    expect(mockSender).not.toHaveBeenCalled();
  });

  it('handles window losing focus', () => {
    tracker.startTracking(1, 10, 'https://example.com', 'Example', 1000);
    
    // WINDOW_ID_NONE is typically -1
    tracker.handleWindowFocusChanged(-1, -1, 5000);
    
    expect(mockSender).toHaveBeenCalledTimes(1);
    const event = mockSender.mock.calls[0][0];
    expect(event.duration).toBe(4);
    
    expect(tracker.getIsBrowserFocused()).toBe(false);
  });

  it('does not track when browser is not focused', () => {
    tracker.handleWindowFocusChanged(-1, -1, 5000); // lose focus
    tracker.startTracking(2, 10, 'https://another.com', 'Another', 6000);
    expect(tracker.getActiveTab()).toBeNull();
  });

  it('handles rapid tab switching without overlap', () => {
    tracker.startTracking(1, 10, 'https://first.com', 'First', 1000);
    tracker.startTracking(2, 10, 'https://second.com', 'Second', 2000);
    
    expect(mockSender).toHaveBeenCalledTimes(1);
    const event = mockSender.mock.calls[0][0];
    expect(event.url).toBe('https://first.com');
    expect(event.duration).toBe(1);

    expect(tracker.getActiveTab()?.tabId).toBe(2);
  });

  it('handles tab navigation without error and updates active tab', () => {
    tracker.startTracking(1, 10, 'https://first.com', 'First', 1000);
    tracker.handleNavigation(1, 'https://first.com/page2', 'Page 2', 4000);

    expect(mockSender).toHaveBeenCalledTimes(1);
    const event = mockSender.mock.calls[0][0];
    expect(event.url).toBe('https://first.com');
    expect(event.duration).toBe(3);

    expect(tracker.getActiveTab()).toEqual({
      tabId: 1,
      windowId: 10,
      url: 'https://first.com/page2',
      title: 'Page 2',
      startTime: 4000,
    });
  });

  it('stops tracking without sending event when stopTracking is called', () => {
    tracker.startTracking(1, 10, 'https://example.com', 'Example', 1000);
    tracker.stopTracking();

    expect(tracker.getActiveTab()).toBeNull();
    expect(mockSender).not.toHaveBeenCalled();
  });
});
