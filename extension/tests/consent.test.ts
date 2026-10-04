import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsentManager } from '../src/background/consent';

describe('ConsentManager', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn(async (data: Record<string, any>) => {
            Object.assign(mockStorage, data);
          })
        }
      }
    };
  });

  afterEach(() => {
    delete (globalThis as any).chrome;
  });

  it('defaults to no consent if not set', async () => {
    const hasConsented = await ConsentManager.hasConsented();
    expect(hasConsented).toBe(false);
  });

  it('saves and retrieves consent state', async () => {
    await ConsentManager.setConsent(true);
    expect(await ConsentManager.hasConsented()).toBe(true);

    await ConsentManager.setConsent(false);
    expect(await ConsentManager.hasConsented()).toBe(false);
  });
});
