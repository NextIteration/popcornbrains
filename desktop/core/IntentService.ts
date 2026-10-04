import type { UserIntent } from '../shared/types.js';

export class IntentService {
  private currentIntent: UserIntent | null = null;

  public setIntent(description: string) {
    this.currentIntent = {
      id: `intent-${Date.now()}`,
      description,
      createdAt: Date.now(),
      applicationHints: []
    };
    return this.currentIntent;
  }

  public clearIntent() {
    this.currentIntent = null;
  }

  public getCurrentIntent(): UserIntent | null {
    return this.currentIntent;
  }
}
