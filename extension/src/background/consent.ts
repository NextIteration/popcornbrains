export class ConsentManager {
  private static readonly CONSENT_KEY = 'tracking_consent';

  static async hasConsented(): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return false;
    }
    const result = await chrome.storage.local.get(this.CONSENT_KEY);
    return !!result[this.CONSENT_KEY];
  }

  static async setConsent(agreed: boolean): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return;
    }
    await chrome.storage.local.set({ [this.CONSENT_KEY]: agreed });
  }
}
