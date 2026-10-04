import { describe, it, expect } from 'vitest';
import { EventBuilder } from '../src/shared/eventBuilder';

describe('EventBuilder', () => {
  it('builds a valid ActivityEvent', () => {
    const event = EventBuilder.build('My Title', 'https://example.com', 5000, { title: 'My Title' });
    
    expect(event).not.toBeNull();
    expect(event?.source).toBe('browser');
    expect(event?.application).toBe('Chrome');
    expect(event?.duration).toBe(5);
    expect(event?.window_title).toBe('My Title');
    expect(event?.metadata.title).toBe('My Title');
    
    expect(EventBuilder.validate(event)).toBe(true);
  });

  it('rejects negative duration', () => {
    const event = EventBuilder.build('Title', 'url', -1000, {});
    expect(event).toBeNull();
  });

  it('rejects missing or invalid url', () => {
    const event = EventBuilder.build('Title', '', 1000, {});
    expect(event).toBeNull();
  });

  it('validator catches malformed events', () => {
    const invalidEvent = {
      id: '123',
      // missing timestamp
      source: 'browser',
      application: 'Chrome',
      window_title: 'title',
      url: 'url',
      duration: 10,
      is_idle: false,
      metadata: {}
    };
    expect(EventBuilder.validate(invalidEvent)).toBe(false);

    const invalidSource = {
        ...invalidEvent,
        timestamp: new Date().toISOString(),
        source: 'not-browser'
    };
    expect(EventBuilder.validate(invalidSource)).toBe(false);
  });
});
