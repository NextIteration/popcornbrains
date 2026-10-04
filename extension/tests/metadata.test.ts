import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractMetadata } from '../src/content/metadata';

describe('Metadata extraction', () => {
  beforeEach(() => {
    // Setup a simple DOM mock since we run in node environment for tests
    (globalThis as any).document = {
      title: 'Default Title',
      querySelector: (selector: string) => null
    };
  });

  afterEach(() => {
    delete (globalThis as any).document;
  });

  it('extracts basic title', () => {
    const metadata = extractMetadata();
    expect(metadata.title).toBe('Default Title');
    expect(metadata.description).toBe('');
    expect(metadata.ogTitle).toBe('');
    expect(metadata.ogDescription).toBe('');
  });

  it('extracts all metadata fields when present', () => {
    (globalThis as any).document = {
      title: 'Full Title',
      querySelector: (selector: string) => {
        if (selector === 'meta[name="description"]') {
          return { getAttribute: () => 'A description' };
        }
        if (selector === 'meta[property="og:title"]') {
          return { getAttribute: () => 'OG Title' };
        }
        if (selector === 'meta[property="og:description"]') {
          return { getAttribute: () => 'OG Description' };
        }
        return null;
      }
    };

    const metadata = extractMetadata();
    expect(metadata.title).toBe('Full Title');
    expect(metadata.description).toBe('A description');
    expect(metadata.ogTitle).toBe('OG Title');
    expect(metadata.ogDescription).toBe('OG Description');
  });

  it('handles missing metadata gracefully', () => {
    (globalThis as any).document = {
      title: '',
      querySelector: () => null
    };
    
    const metadata = extractMetadata();
    expect(metadata.title).toBe('');
    expect(metadata.description).toBe('');
  });
});
