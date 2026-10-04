import { ActivityMetadata } from '../../../desktop/shared/types';
import { EventBuilder } from '../shared/eventBuilder';

export interface TabState {
  tabId: number;
  windowId: number;
  url: string;
  title: string;
  startTime: number;
}

export class Tracker {
  private activeTab: TabState | null = null;
  private isBrowserFocused: boolean = true;
  private pendingEvents: any[] = []; // In a real app, send these to HTTP receiver

  constructor(private eventSender: (event: any) => void) {}

  public getActiveTab(): TabState | null {
    return this.activeTab;
  }

  public getIsBrowserFocused(): boolean {
    return this.isBrowserFocused;
  }

  public startTracking(tabId: number, windowId: number, url: string, title: string, startTime: number = Date.now()) {
    if (!this.isBrowserFocused) return; // Do not start tracking if Chrome is not focused

    if (this.activeTab && this.activeTab.tabId === tabId && this.activeTab.url === url) {
      return; // Already tracking this exact tab and URL
    }

    this.finalizeCurrentTab(startTime);

    if (url && !url.startsWith('chrome://')) {
      this.activeTab = { tabId, windowId, url, title, startTime };
    }
  }

  public finalizeCurrentTab(endTime: number = Date.now(), metadata: ActivityMetadata = {}) {
    if (this.activeTab && this.isBrowserFocused) {
      const durationMs = endTime - this.activeTab.startTime;
      if (durationMs > 0) {
        const event = EventBuilder.build(this.activeTab.title, this.activeTab.url, durationMs, metadata);
        if (event && EventBuilder.validate(event)) {
          this.eventSender(event);
        }
      }
    }
    this.activeTab = null;
  }

  public stopTracking() {
    this.activeTab = null;
  }

  public handleWindowFocusChanged(windowId: number, WINDOW_ID_NONE: number, currentTime: number = Date.now()) {
    if (windowId === WINDOW_ID_NONE) {
      // Chrome lost focus
      this.finalizeCurrentTab(currentTime);
      this.isBrowserFocused = false;
    } else {
      // Chrome gained focus
      this.isBrowserFocused = true;
      // The actual tab state will be updated by chrome.tabs.query in the service worker
    }
  }

  public handleNavigation(tabId: number, url: string, title: string, currentTime: number = Date.now()) {
    if (this.activeTab && this.activeTab.tabId === tabId) {
      const windowId = this.activeTab.windowId;
      this.finalizeCurrentTab(currentTime);
      this.startTracking(tabId, windowId, url, title, currentTime);
    }
  }

  public handleTabClosed(tabId: number, currentTime: number = Date.now()) {
    if (this.activeTab && this.activeTab.tabId === tabId) {
      this.finalizeCurrentTab(currentTime);
    }
  }
}
