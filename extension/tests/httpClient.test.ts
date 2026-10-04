import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient, API_BASE_URL } from '../src/background/httpClient';
import { ActivityEvent } from '../../desktop/shared/types';

describe('HttpClient', () => {
  let client: HttpClient;
  const mockEvent: ActivityEvent = {
    id: 'test-event-123',
    timestamp: new Date().toISOString(),
    source: 'browser',
    application: 'Chrome',
    window_title: 'Test Window',
    url: 'https://example.com',
    duration: 5000,
    is_idle: false,
    metadata: {}
  };

  beforeEach(() => {
    client = new HttpClient();
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('1. Valid ActivityEvent successfully sent, 2. Correct POST method, 3. Correct endpoint, 4. Correct JSON body, 5. Correct Content-Type, 6. Successful server response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const result = await client.sendActivityEvent(mockEvent);
    expect(result).toBe(true);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockEvent)
    });
  });

  it('7. Non-2xx response and 9. Bounded retry behavior', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const promise = client.sendActivityEvent(mockEvent);
    
    // Initial fetch happens immediately
    await Promise.resolve(); // flush initial fetch promise

    // Retry 1: 1s
    vi.runAllTimers();
    await Promise.resolve(); 
    await Promise.resolve();

    // Retry 2: 2s
    vi.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();

    // Retry 3: 4s
    vi.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();

    const result = await promise;
    expect(result).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('8. Connection refused/server unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'));

    const promise = client.sendActivityEvent(mockEvent);
    
    await Promise.resolve();
    vi.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();
    vi.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();
    vi.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();

    const result = await promise;
    expect(result).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('10. Invalid ActivityEvent is not sent', async () => {
    const invalidEvent = { ...mockEvent, duration: -1 }; // Invalid because duration < 0

    const result = await client.sendActivityEvent(invalidEvent);
    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
