import { ConsentManager } from './consent';
import { Tracker } from './tracker';

import { httpClient } from './httpClient';

const tracker = new Tracker((event) => httpClient.sendActivityEvent(event));

// ── MV3 keepalive ─────────────────────────────────────────────────────────
// Chrome MV3 service workers are suspended after ~30 seconds of inactivity.
// Without a keepalive, all in-memory Tracker state (activeTab, isBrowserFocused)
// is destroyed mid-session, causing startTime to be reset to the wake-up time
// rather than the real tab-entry time.  A repeating alarm prevents suspension.

const KEEPALIVE_ALARM = 'tracking-keepalive';

function scheduleKeepalive() {
  chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.4 }); // ~24s interval
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEPALIVE_ALARM) {
    // No-op: the alarm itself is enough to prevent suspension by waking the SW.
    // Restore isBrowserFocused if it was lost on a prior involuntary suspension.
    if (!tracker.getIsBrowserFocused()) {
      // Only restore if we have an active tab; otherwise leave focus state alone.
      // Do nothing — the next onActivated/onFocusChanged will fix state.
    }
  }
});

scheduleKeepalive();

async function getMetadataFromTab(tabId: number): Promise<any> {
  try {
    const timeout = new Promise((resolve) => setTimeout(() => resolve({}), 150));
    const response = await Promise.race([
      chrome.tabs.sendMessage(tabId, { action: 'GET_METADATA' }),
      timeout
    ]);
    return response || {};
  } catch (e) {
    // Content script might not be loaded or tab is restricted
    return {};
  }
}

const SESSION_KEY = 'active_tab_session';

async function persistTabSession(tabId: number, windowId: number, url: string, title: string, startTime: number) {
  await chrome.storage.local.set({ [SESSION_KEY]: { tabId, windowId, url, title, startTime } });
}

async function clearTabSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

async function handleActiveTabChange(tabId: number, windowId: number, startTime: number = Date.now()) {
  const hasConsented = await ConsentManager.hasConsented();
  if (!hasConsented) return;

  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.url) {
      tracker.handleWindowFocusChanged(windowId, chrome.windows.WINDOW_ID_NONE, startTime);
      tracker.startTracking(tabId, windowId, tab.url, tab.title || '', startTime);
      await persistTabSession(tabId, windowId, tab.url, tab.title || '', startTime);
    }
  } catch (e) {
    console.error('Error getting tab info', e);
  }
}

// Initial tracking on service worker startup / wake-up.
// Restore persisted session startTime so that a woken service worker accurately
// reflects the real time the user started on the current tab — not the wake time.
chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
  if (tabs.length > 0 && tabs[0].id && tabs[0].windowId) {
    const tab = tabs[0];
    const hasConsented = await ConsentManager.hasConsented();
    if (!hasConsented) return;

    let startTime = Date.now();
    try {
      const stored = await chrome.storage.local.get(SESSION_KEY);
      const session = stored[SESSION_KEY];
      if (session && session.tabId === tab.id && session.url === tab.url) {
        // Restore the real startTime from before the suspension
        startTime = session.startTime;
      }
    } catch (_) { /* ignore storage errors */ }

    await handleActiveTabChange(tab.id!, tab.windowId!, startTime);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const switchTime = Date.now();
  const oldTab = tracker.getActiveTab();
  if (oldTab) {
    const metadata = await getMetadataFromTab(oldTab.tabId);
    tracker.finalizeCurrentTab(switchTime, metadata);
  }
  await clearTabSession();
  await handleActiveTabChange(activeInfo.tabId, activeInfo.windowId, switchTime);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const hasConsented = await ConsentManager.hasConsented();
  if (!hasConsented) return;

  if (changeInfo.url || changeInfo.title) {
    const activeTabInfo = tracker.getActiveTab();
    if (activeTabInfo && activeTabInfo.tabId === tabId) {
       if (changeInfo.url && changeInfo.url !== activeTabInfo.url) {
           // It's a navigation
           const metadata = await getMetadataFromTab(tabId);
           tracker.finalizeCurrentTab(Date.now(), metadata);
           tracker.handleWindowFocusChanged(tab.windowId, chrome.windows.WINDOW_ID_NONE);
           tracker.startTracking(tabId, tab.windowId, changeInfo.url, tab.title || '');
       }
    } else if (!activeTabInfo && tab.active && tab.url && !tab.url.startsWith('chrome://')) {
       tracker.handleWindowFocusChanged(tab.windowId, chrome.windows.WINDOW_ID_NONE);
       tracker.startTracking(tabId, tab.windowId, tab.url, tab.title || '');
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const oldTab = tracker.getActiveTab();
  if (oldTab && oldTab.tabId === tabId) {
     const metadata = await getMetadataFromTab(tabId); // might fail if tab is gone
     tracker.finalizeCurrentTab(Date.now(), metadata);
     await clearTabSession();
  }
});

// Listen for consent/tracking toggle changes via storage
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes['tracking_consent']) {
    const enabled = Boolean(changes['tracking_consent'].newValue);
    if (!enabled) {
      tracker.stopTracking();
      await clearTabSession();
    } else {
      // Re-enabled: start a NEW active session from 0 for the currently focused tab
      await clearTabSession();
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        if (tabs.length > 0 && tabs[0].id && tabs[0].windowId) {
          const tab = tabs[0];
          if (tab.url && !tab.url.startsWith('chrome://')) {
            const now = Date.now();
            tracker.handleWindowFocusChanged(tab.windowId, chrome.windows.WINDOW_ID_NONE, now);
            tracker.startTracking(tab.id, tab.windowId, tab.url, tab.title || '', now);
            await persistTabSession(tab.id, tab.windowId, tab.url, tab.title || '', now);
          }
        }
      });
    }
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  const hasConsented = await ConsentManager.hasConsented();
  if (!hasConsented) return;

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    const oldTab = tracker.getActiveTab();
    if (oldTab) {
        const metadata = await getMetadataFromTab(oldTab.tabId);
        tracker.finalizeCurrentTab(Date.now(), metadata);
        tracker.handleWindowFocusChanged(windowId, chrome.windows.WINDOW_ID_NONE);
        // Keep session persisted so we can restore startTime when focus returns
    } else {
        tracker.handleWindowFocusChanged(windowId, chrome.windows.WINDOW_ID_NONE);
    }
  } else {
    tracker.handleWindowFocusChanged(windowId, chrome.windows.WINDOW_ID_NONE);
    
    // Find active tab in new focused window, restoring startTime if available
    chrome.tabs.query({ active: true, windowId: windowId }, async (tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0];
        if (tab.id && tab.url) {
          let startTime = Date.now();
          try {
            const stored = await chrome.storage.local.get(SESSION_KEY);
            const session = stored[SESSION_KEY];
            if (session && session.tabId === tab.id && session.url === tab.url) {
              startTime = session.startTime;
            }
          } catch (_) { /* ignore */ }
          tracker.startTracking(tab.id, windowId, tab.url, tab.title || '', startTime);
          await persistTabSession(tab.id, windowId, tab.url, tab.title || '', startTime);
        }
      }
    });
  }
});


chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === 'GET_CURRENT_ACTIVITY') {
    (async () => {
      const hasConsented = await ConsentManager.hasConsented();
      if (!hasConsented) {
        tracker.stopTracking();
        await clearTabSession();
        sendResponse({ activeTab: null });
        return;
      }

      let activeTab = tracker.getActiveTab();

      if (!activeTab) {
        try {
          const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (tabs.length > 0) {
            const tab = tabs[0];
            if (tab.id && tab.windowId && tab.url && !tab.url.startsWith('chrome://')) {
              let startTime = Date.now();
              try {
                const stored = await chrome.storage.local.get(SESSION_KEY);
                const session = stored[SESSION_KEY];
                if (session && session.tabId === tab.id && session.url === tab.url) {
                  startTime = session.startTime;
                }
              } catch (_) { /* ignore */ }
              tracker.handleWindowFocusChanged(tab.windowId, chrome.windows.WINDOW_ID_NONE);
              tracker.startTracking(tab.id, tab.windowId, tab.url, tab.title || '', startTime);
              await persistTabSession(tab.id, tab.windowId, tab.url, tab.title || '', startTime);
              activeTab = tracker.getActiveTab();
            }
          }
        } catch (e) {
          console.error('Error getting active tab in GET_CURRENT_ACTIVITY', e);
        }
      }

      sendResponse({
        activeTab: activeTab
          ? {
              title: activeTab.title,
              url: activeTab.url,
              startTime: activeTab.startTime,
            }
          : null,
      });
    })();

    return true;
  }
});