import { ActivityEvent } from '../../../desktop/shared/types';
import { EventBuilder } from '../shared/eventBuilder';

export const API_BASE_URL = 'http://localhost:3001';
const MAX_RETRIES = 3;

export class HttpClient {
  constructor(private baseUrl: string = API_BASE_URL) {}

  public async sendActivityEvent(event: ActivityEvent, retryCount = 0): Promise<boolean> {
    if (!EventBuilder.validate(event)) {
      console.warn('Invalid ActivityEvent format. Discarding.');
      return false;
    }
    try {
      const response = await fetch(`${this.baseUrl}/api/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        return true;
      }
      
      console.warn(`Server responded with ${response.status}`);
      return this.handleRetry(event, retryCount);
    } catch (e) {
      console.warn('Network error or server unavailable:', e);
      return this.handleRetry(event, retryCount);
    }
  }

  private async handleRetry(event: ActivityEvent, retryCount: number): Promise<boolean> {
    if (retryCount >= MAX_RETRIES) {
      console.error('Max retries reached for event. Discarding.');
      return false;
    }

    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    return new Promise(resolve => {
      setTimeout(async () => {
        resolve(await this.sendActivityEvent(event, retryCount + 1));
      }, delay);
    });
  }
}

export const httpClient = new HttpClient();
