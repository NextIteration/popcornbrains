/**
 * IntentProvider — isolated stub for fetching current intent from the desktop app.
 * Structured so the real GET /api/intent endpoint can be wired in later
 * without redesigning the popup.
 */

export interface CurrentIntent {
  text: string;
}

const INTENT_ENDPOINT = 'http://localhost:3001/api/intent';

export async function fetchCurrentIntent(): Promise<CurrentIntent | null> {
  try {
    const response = await fetch(INTENT_ENDPOINT, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && typeof data.text === 'string') {
      return { text: data.text };
    }
    return null;
  } catch {
    // Desktop app not yet available — return null gracefully
    return null;
  }
}
