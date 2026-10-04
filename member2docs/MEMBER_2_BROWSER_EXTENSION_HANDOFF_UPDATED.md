# The Unplugged — Member 2 Browser Extension Handoff (Updated)

## Purpose

This document is the handoff for **Member 2 — Browser Extension** development of The Unplugged.

The next coding agent must **read this entire file before making any changes**. It must inspect the existing repository and preserve the current architecture and team boundaries.

---

# 1. Project / MVP Context

The Unplugged is an intent-aware digital-attention system.

Core MVP flow:

**Set Intent → Observe → Understand → Detect Drift → Intervene → Return → Measure**

Member 2 owns the Chrome browser observation layer.

The browser extension is responsible for:

- Chrome tab/activity tracking
- URL/title/navigation tracking
- limited page metadata
- browser active duration
- normalized browser `ActivityEvent` creation
- browser → local desktop communication
- privacy/consent
- lightweight browser popup

Member 2 does **not** own:

- Windows application tracking
- Windows idle detection
- SQLite implementation
- AI relevance
- drift detection
- intervention logic
- Return-to-Task
- Reclaim Score
- desktop dashboard
- predictive/future features

Do not modify another member's module unless absolutely required for a shared interface. If a shared interface must change, report it first.

---

# 2. Current Development Status

## Working

The following are already implemented and manually verified:

- Manifest V3 extension
- Chrome extension loads successfully
- Extension is visible in `chrome://extensions`
- Popup opens successfully
- Popup UI renders correctly
- First-use consent screen works
- `I Agree & Enable Tracking` works
- Tracking toggle works
- Privacy information is displayed
- Current Intent fallback works
- Extension build succeeds
- Browser tracking implementation exists
- Navigation/tab/window tracking implementation exists
- ActivityEvent creation exists
- Local HTTP client exists
- Mock HTTP receiver exists
- Vitest tests exist
- TypeScript build/check has passed previously

The popup was initially not opening because Vite generated root-relative asset paths such as:

```html
<script type="module" crossorigin src="/popup.js"></script>
```

The fix was adding:

```ts
base: './',
```

to `extension/vite.config.ts`.

After rebuilding, the popup opened successfully.

### Current Vite build command

From repository root:

```bash
npx vite build -c extension/vite.config.ts
```

The build currently succeeds.

A Vite warning about `__dirname` / `configLoader: 'native'` is only a warning; it does not currently prevent the build.

---

# 3. CURRENT UNRESOLVED BUG

## Popup Current Activity is not working

The popup currently displays:

> **No active page detected**

even when a normal Chrome webpage is active.

The popup itself works; only the Current Activity display is broken.

---

# 4. Important Current Architecture

The tracker already maintains the active tab internally.

`extension/src/background/tracker.ts` contains:

```ts
private activeTab: TabState | null = null;
```

and:

```ts
public getActiveTab(): TabState | null {
  return this.activeTab;
}
```

The `TabState` contains:

```ts
export interface TabState {
  tabId: number;
  windowId: number;
  url: string;
  title: string;
  startTime: number;
}
```

The tracker also handles:

- active tab changes
- navigation
- tab closing
- Chrome window focus
- duration finalization
- ActivityEvent creation

The tracker is intended to remain the **single source of truth** for the currently tracked browser tab.

Do NOT create a second tracking system in the popup.

---

# 5. Current Popup Problem

`extension/src/popup/App.tsx` currently initializes activity using:

```ts
const stored = await chrome.storage.local.get(['activeTabInfo']);
if (stored.activeTabInfo) {
  activeTab = stored.activeTabInfo as ActiveTabInfo;
}
```

The problem is that the popup expects `activeTabInfo` in `chrome.storage.local`, while the tracker primarily keeps its current state internally.

Therefore the popup receives `null` and displays:

> No active page detected

---

# 6. Attempted Fix / Important Current State

A message-based solution was attempted.

The intended flow is:

```text
Popup
  ↓
chrome.runtime.sendMessage(GET_CURRENT_ACTIVITY)
  ↓
Background service worker
  ↓
Tracker.getActiveTab()
  ↓
Popup
```

The popup was modified/attempted to request:

```ts
chrome.runtime.sendMessage({
  action: 'GET_CURRENT_ACTIVITY'
});
```

However Chrome then produced:

> `Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.`

This indicates that the popup sent the message but Chrome did not find a matching receiving listener in the running background service worker.

There was also a manual attempt to add a listener similar to:

```ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === 'GET_CURRENT_ACTIVITY') {
    const activeTab = tracker.getActiveTab();

    sendResponse({
      activeTab: activeTab
        ? {
            title: activeTab.title,
            url: activeTab.url,
            startTime: activeTab.startTime,
          }
        : null,
    });

    return true;
  }
});
```

Do **not assume this listener is currently present or correctly built**.

The next agent must inspect the actual current source and generated `dist` files before changing anything.

---

# 7. IMPORTANT: Source vs Dist

The extension uses Vite.

Source files:

```text
extension/src/
```

Generated Chrome extension files:

```text
extension/dist/
```

Chrome loads the generated extension files.

After source changes, rebuild:

```bash
npx vite build -c extension/vite.config.ts
```

Then reload the extension in:

```text
chrome://extensions
```

Do not assume that changing `src/` automatically changes what Chrome runs.

---

# 8. Extension Structure

Current relevant structure:

```text
extension/
├── manifest.json
├── vite.config.ts
├── tsconfig.json
├── popup.html
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── tracker.ts
│   │   ├── consent.ts
│   │   └── httpClient.ts
│   ├── content/
│   │   └── metadata.ts
│   ├── popup/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── intentProvider.ts
│   │   └── popup.css
│   └── shared/
│       └── eventBuilder.ts
├── tests/
└── dist/
```

The exact current files should be inspected rather than assumed.

---

# 9. Manifest

The extension uses Manifest V3.

Current important configuration:

```json
{
  "manifest_version": 3,
  "name": "The Unplugged Tracking Extension",
  "version": "1.0.0",
  "permissions": [
    "tabs",
    "storage"
  ],
  "host_permissions": [
    "*://*/*"
  ],
  "action": {
    "default_popup": "dist/popup.html",
    "default_title": "The Unplugged"
  },
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  }
}
```

Do not change paths unless inspection proves they are incorrect.

---

# 10. Vite Configuration

Current important configuration includes:

```ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: resolve(__dirname),

  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/metadata.ts'),
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name][extname]',
      }
    }
  }
});
```

The `base: './'` change fixed the popup launch problem.

Do not remove it.

---

# 11. ActivityEvent Contract

The authoritative shared contract is in:

```text
desktop/shared/types.ts
```

Browser events use:

```json
{
  "id": "unique-event-id",
  "timestamp": "2026-10-04T11:30:00.000Z",
  "source": "browser",
  "application": "Chrome",
  "window_title": "Database Normalization Explained",
  "url": "https://example.com/dbms",
  "duration": 120,
  "is_idle": false,
  "metadata": {
    "title": "Database Normalization Explained",
    "description": "Learn 1NF, 2NF and 3NF.",
    "ogTitle": "Database Normalization Explained",
    "ogDescription": "A database normalization tutorial."
  }
}
```

Do not change top-level fields without team agreement.

Browser-specific information should remain in `metadata`.

---

# 12. Browser Tracking Behavior

The extension tracks active browser time, not total tab lifetime.

Example:

```text
10:00 Tab A active
10:05 Tab B active

Tab A = 5 minutes
```

If Tab A remains open in the background, it must not continue accumulating active duration.

The tracker handles:

- active tab
- tab switching
- navigation
- tab closing
- Chrome window focus
- `WINDOW_ID_NONE`
- duration
- ActivityEvent generation

When Chrome loses focus because the user moves to another application such as VS Code or GTA V, the extension stops counting browser active time. Whole-device application tracking belongs to Member 1.

---

# 13. Browser Metadata

Only limited metadata is collected.

Allowed:

- `document.title`
- `<meta name="description">`
- `og:title`
- `og:description`

Do not collect:

- passwords
- form inputs
- keystrokes
- screenshots
- cookies
- clipboard
- video frames
- full page content
- full DOM/body text
- unnecessary browsing data

The implementation may also filter sensitive/internal URLs as already implemented. Preserve sensible privacy hardening unless it conflicts with the MVP.

---

# 14. Consent / Privacy

Tracking is disabled by default until explicit consent.

First use:

```text
Protect Your Attention

[I Agree & Enable Tracking]
[Not Now]
```

The popup explains that the extension collects limited browser activity and does not collect passwords, form inputs, keystrokes, screenshots, cookies, clipboard, or full page content.

Consent is stored using `chrome.storage.local`.

Do not weaken this behavior.

---

# 15. Local HTTP

Browser ActivityEvents are sent to:

```text
POST http://localhost:3001/api/activity
```

The HTTP client supports:

- configurable base URL
- ActivityEvent POST
- bounded retry
- approximately 1s / 2s / 4s backoff
- eventual discard if the local service remains unavailable

A mock receiver exists for independent testing.

Do not add a second browser database.

---

# 16. Intent Provider

The popup contains:

```text
extension/src/popup/intentProvider.ts
```

It currently requests:

```text
GET http://localhost:3001/api/intent
```

If the desktop app is unavailable, it gracefully returns `null`.

Therefore the popup may display:

```text
Current Intent
Not connected
```

This is expected until the real desktop endpoint exists.

M2 does NOT implement the full Intent system.

---

# 17. Current Popup UI

The popup currently contains:

- The Unplugged header
- Tracking status
- Current Intent
- Current Activity
- Tracking toggle
- Open The Unplugged button
- Privacy & Tracking section

The popup is intentionally lightweight.

Do not redesign it.

Do not add a browser button to the desktop UI.

Do not integrate with Member 4's dashboard yet.

---

# 18. Current Known Issue to Solve

ONLY solve this first:

> Popup Current Activity says "No active page detected" despite a normal Chrome page being active.

Required final behavior:

```text
CURRENT ACTIVITY

<page title>
<domain>

Active: 00:XX
```

The activity should come from the existing Tracker.

Preferred architecture:

```text
Chrome
  ↓
Tracker
  ↓
Service Worker
  ↓
GET_CURRENT_ACTIVITY message
  ↓
Popup
  ↓
Current Activity card
```

Do not implement a second tracker.

---

# 19. Credit-Conservation Rule

The team has limited Antigravity/Gemini/Claude credits.

Therefore:

- Use small, focused prompts.
- Do not perform broad refactors.
- Do not rewrite working code.
- Do not run expensive/redundant tasks unnecessarily.
- Do not redesign architecture.
- Do not add future features.
- Diagnose before modifying.
- Make the smallest possible change.
- Avoid running the full test suite after every tiny change.
- Do not ask the agent to inspect unrelated modules.

For the current bug, the first prompt should be **diagnosis only**.

Suggested first prompt:

```text
We need to fix ONE existing bug in Member 2 only.

The Chrome extension and popup already work.

Bug:
The popup shows "No active page detected" even when a normal Chrome webpage is active.

An attempted fix added a popup message:
GET_CURRENT_ACTIVITY

but Chrome then showed:
"Could not establish connection. Receiving end does not exist."

Read this entire handoff first.

Then inspect ONLY:
- extension/manifest.json
- extension/src/background/service-worker.ts
- extension/src/background/tracker.ts
- extension/src/popup/App.tsx
- extension/vite.config.ts

Determine why the popup cannot communicate with the background service worker.

DO NOT MODIFY FILES YET.

Give me ONLY:
1. root cause
2. exact file that needs changing
3. minimal change required

Do not run the full test suite or make unrelated changes.
```

Only after the diagnosis should the agent be instructed to implement the fix.

---

# 20. Testing Status

Previously reported:

- 96/96 Vitest tests passed
- TypeScript build/check passed
- Vite build passed

The exact current count must be rechecked if source files have changed since that report.

Do not claim the old test count represents the current state without rerunning tests.

---

# 21. Build / Chrome Testing

Build:

```bash
npx vite build -c extension/vite.config.ts
```

Then:

```text
chrome://extensions
```

Reload the unpacked extension.

Manual verification:

1. Extension loads.
2. Popup opens.
3. Consent works.
4. Tracking toggle works.
5. Open normal webpage.
6. Current Activity should show page title/domain.
7. Switch tabs.
8. Verify activity changes.
9. Navigate.
10. Verify activity updates.
11. Leave Chrome.
12. Verify browser active duration stops.
13. Return to Chrome.
14. Verify tracking resumes.

---

# 22. Git / Team Rules

Member 2 should eventually work on:

```text
feature/browser-extension
```

Do not push directly to `main`.

Do not modify Member 4's branch.

Preferred flow:

```text
feature/browser-extension
        ↓
commit
        ↓
push
        ↓
PR
        ↓
review
        ↓
main
```

Before committing, inspect:

```bash
git status
git diff
```

Pay particular attention to shared files such as:

```text
desktop/shared/types.ts
package.json
package-lock.json
vitest.config.ts
```

because these may have been modified during M2 implementation and may affect other teammates.

Do not blindly overwrite other members' changes.

---

# 23. M2 Boundary

Member 2 is responsible for:

```text
Chrome
 ↓
Browser Extension
 ↓
ActivityEvent
 ↓
Local HTTP
 ↓
Desktop
```

Member 2 is NOT responsible for:

```text
AI relevance
Drift detection
Intervention
Return-to-Task
Reclaim Score
Dashboard
SQLite implementation
Windows tracking
```

Keep these boundaries intact.

---

# 24. Final Handoff State

At the moment of this handoff:

### Confirmed working

- Extension installation/loading
- Popup opening
- Popup UI
- Consent
- Tracking toggle
- Browser tracker implementation
- ActivityEvent generation
- Local HTTP implementation
- Mock receiver
- Vite build
- Previously reported automated tests

### Currently broken / unfinished

- Popup Current Activity display
- Popup ↔ background service worker communication for `GET_CURRENT_ACTIVITY`

### Not yet integrated

- Real Electron `/api/activity`
- Real Electron `/api/intent`
- Member 3 AI relevance
- Member 3 drift detection
- Member 4 intervention/UI integration
- Full desktop dashboard integration

---

# 25. Absolute Instruction to Next Agent

**READ THIS ENTIRE HANDOFF FIRST.**

Then inspect the current repository before changing anything.

Do not assume that attempted fixes described here are currently present in source or `dist`.

Do not rebuild the architecture.

Do not rewrite the extension.

Do not modify other members' modules.

Do not spend credits on unrelated improvements.

For the immediate task, diagnose the `GET_CURRENT_ACTIVITY` / service-worker communication issue first, then make the smallest possible fix.
