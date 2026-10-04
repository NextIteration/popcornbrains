# THE UNPLUGGED
## Member 2 — Browser Extension Design Document

**Module:** Member 2 — Browser Extension  
**Product:** The Unplugged  
**MVP:** 30-hour hackathon build  
**Technology:** Chrome Extension Manifest V3 + TypeScript + Vite + Vitest  
**Communication:** Local HTTP  
**Repository:** Shared monorepo

---

# 1. Purpose

The Browser Extension is the browser-side component of The Unplugged.

Its primary responsibility is to observe limited browser activity while tracking is enabled, convert that activity into the shared `ActivityEvent` format, and send those events to the local The Unplugged desktop application.

The extension should remain lightweight and mostly unobtrusive.

The **desktop application is the main home of The Unplugged**. The extension should not become a second dashboard or duplicate the desktop application's functionality.

---

# 2. Product Role

The core product flow is:

**Set Intent → Observe → Understand → Detect Drift → Intervene → Return → Learn**

For the browser:

**Chrome → Browser Extension → ActivityEvent → Local HTTP → Electron Main Process**

The extension is responsible primarily for the **Observe** stage.

It provides browser activity data that can later be used by the desktop application and intelligence layer for relevance analysis and attention-drift detection.

---

# 3. Module Ownership

## Member 2 owns

- Chrome extension setup
- Manifest V3 configuration
- Active-tab tracking
- Tab activation/change tracking
- Navigation tracking
- URL capture
- Page title capture
- Limited metadata capture
- Browser active-duration tracking
- Normalized `ActivityEvent` generation
- Browser → local-service communication
- Extension-side validation
- Extension tests
- Privacy/consent gate
- Lightweight extension popup UI

## Member 2 does NOT own

- Windows foreground application tracking
- Windows idle detection
- SQLite implementation
- AI relevance analysis
- Attention-drift detection
- Intervention decision logic
- Return-to-Task logic
- Reclaim Score calculation
- Main desktop dashboard
- Predictive distraction
- Cloud synchronization
- Multi-device synchronization

If integration requires a change outside this module, report the required interface change rather than modifying another teammate's module.

---

# 4. Technology Stack

| Component | Technology |
|---|---|
| Browser | Google Chrome |
| Extension | Chrome Extension Manifest V3 |
| Language | TypeScript |
| Build | Vite |
| Testing | Vitest |
| Communication | Local HTTP |
| Shared contracts | TypeScript |
| Repository | Existing team monorepo |

Use the existing repository structure wherever possible.

Do not reorganize the monorepo unnecessarily.

---

# 5. Extension Architecture

```text
┌──────────────────────────────┐
│           CHROME             │
│                              │
│  Tabs / Navigation / Windows │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      BROWSER EXTENSION       │
│                              │
│  Service Worker              │
│  ├── Tab Tracker             │
│  ├── Navigation Tracker      │
│  ├── Duration Tracker        │
│  ├── Metadata Extractor      │
│  ├── Consent Manager         │
│  ├── Event Builder           │
│  ├── Event Validator         │
│  └── Local HTTP Client       │
│                              │
│  Popup UI                    │
└──────────────┬───────────────┘
               │
          ActivityEvent
               │
          Local HTTP
               │
               ▼
┌──────────────────────────────┐
│     ELECTRON MAIN PROCESS    │
│       / LOCAL SERVICE        │
└──────────────────────────────┘
```

The extension should not maintain a separate primary application database.

The desktop application remains the central controller and storage owner for the MVP.

---

# 6. Extension UI Philosophy

The extension should have **minimal UI**.

It should not duplicate the desktop dashboard.

The popup exists mainly to provide:

1. Tracking transparency
2. Current intent visibility
3. Current browser activity visibility
4. Access to the desktop application
5. Privacy/tracking controls

The extension should feel like a **small control panel**, not a second productivity application.

---

# 7. Extension Popup

When the user clicks the Chrome extension icon, the popup should provide a compact view.

Suggested structure:

```text
┌──────────────────────────────┐
│  The Unplugged        🟢     │
│                              │
│  🎯 Current Intent           │
│  Prepare DBMS assignment     │
│                              │
│  ──────────────────────────  │
│                              │
│  Current Activity            │
│  📄 Database Normalization   │
│  example.com                 │
│  Active: 04:32               │
│                              │
│  Tracking                    │
│  ● Enabled                   │
│                              │
│  [ Open Desktop App ]        │
│                              │
│  Privacy & Tracking          │
└──────────────────────────────┘
```

The exact visual styling should follow the desktop application's visual language.

The popup should use:

- simple typography
- compact cards/sections
- neutral background
- subtle borders
- restrained status colors
- minimal animation
- clear hierarchy

Avoid unnecessary charts, statistics, or gamification.

---

# 8. Popup Information

## 8.1 Tracking Status

Show whether browser tracking is currently active.

Examples:

```text
🟢 Tracking enabled
```

or

```text
⚪ Tracking paused
```

The state must be understandable without technical knowledge.

---

## 8.2 Current Intent

Show the current intent received from the desktop application.

Example:

```text
🎯 Current Intent

Prepare DBMS assignment
```

The extension should display the intent but should not become the primary place for managing it.

Intent Mode belongs to the desktop application.

---

## 8.3 Current Browser Activity

Show the currently active browser page in a privacy-conscious way.

Example:

```text
Current Activity

📄 Database Normalization
example.com

Active: 04:32
```

This gives the user transparency into what is being tracked.

---

## 8.4 Open Desktop App

Provide a clear action:

```text
[ Open The Unplugged ]
```

This should open or bring the desktop application to the foreground.

---

## 8.5 Privacy and Tracking

Provide access to tracking status and privacy information.

The user should always be able to understand whether tracking is enabled.

---

# 9. First-Use Consent UI

The extension must require explicit user consent before collecting or transmitting browser activity.

Suggested first-use screen:

```text
┌─────────────────────────────────┐
│        The Unplugged            │
│                                 │
│     Protect Your Attention      │
│                                 │
│ The Unplugged uses limited      │
│ browser activity to understand  │
│ whether your browsing matches   │
│ your current focus goal.        │
│                                 │
│ We collect:                     │
│ ✓ Websites/URLs                 │
│ ✓ Page titles                   │
│ ✓ Limited page metadata         │
│ ✓ Tab activity & time spent     │
│                                 │
│ We NEVER collect:               │
│ ✕ Passwords                     │
│ ✕ Form inputs                   │
│ ✕ Keystrokes                    │
│ ✕ Screenshots                   │
│ ✕ Cookies                       │
│ ✕ Full page content             │
│                                 │
│ [ I Agree & Enable Tracking ]   │
│ [ Not Now ]                     │
└─────────────────────────────────┘
```

Suggested consent wording:

> The Unplugged uses limited browser activity to understand whether your current browsing matches your focus goal.

> We collect:
> - Websites/URLs visited while tracking is enabled
> - Page titles
> - Limited page metadata
> - Tab activity and time spent

> We do not collect passwords, form inputs, keystrokes, screenshots, cookies, or full page content.

> Browser activity is sent to the local The Unplugged application for processing.

If the user selects **Not Now**, the extension must not collect or transmit browser activity.

---

# 10. Privacy Requirements

The extension must collect only the information required for the MVP.

## Allowed

- Active tab
- Tab ID
- Window ID
- URL
- Page title
- Navigation events
- Tab-switch events
- Active duration
- Limited metadata

## Limited metadata

Only extract:

```text
document.title

<meta name="description">

<meta property="og:title">

<meta property="og:description">
```

## Never collect

- Passwords
- Form inputs
- Keystrokes
- Screenshots
- Cookies
- Clipboard contents
- Video frames
- Full page content
- Full DOM/body text
- Unnecessary browsing data
- AI API keys

Do not introduce additional collection merely because Chrome APIs make it technically possible.

---

# 11. Browser Tracking Behavior

## 11.1 Active Tab

The extension tracks the tab currently active in the Chrome window.

It should not treat every open tab as actively used.

---

## 11.2 Tab Switching

When the user changes from Tab A to Tab B:

```text
Tab A becomes inactive
       ↓
Finalize Tab A active duration
       ↓
Create/send appropriate event
       ↓
Tab B becomes active
       ↓
Start timing Tab B
```

---

# 12. Active Duration

The extension tracks **active-tab duration**, not tab lifetime.

Example:

```text
10:00  Tab A becomes active
10:05  User switches to Tab B
```

Tab A receives approximately:

```text
5 minutes active time
```

If Tab A remains open in the background for another 20 minutes, those 20 minutes are **not** added to Tab A's active duration.

---

# 13. Chrome Window Switching

When the user switches between Chrome windows:

1. Finalize the previously active tab's active period.
2. Identify the active tab in the new window.
3. Start tracking the new active tab.
4. Avoid double-counting time.

---

# 14. Leaving Chrome

If the user leaves Chrome and starts using another application, the extension should stop counting browser active time.

For example:

```text
Chrome → VS Code
```

The extension should not continue counting the Chrome tab as actively used.

Windows-level application activity is handled by Member 1.

This prevents double-counting and keeps responsibilities separated.

---

# 15. Navigation

Navigation within the active tab must be detected.

Example:

```text
youtube.com
      ↓
youtube.com/watch?v=123
```

The extension should capture the resulting page information as a new relevant browser activity state/event where appropriate.

Navigation must not cause duplicate duration accounting.

---

# 16. Tab Closing

When the active tab is closed:

1. Finalize its active duration.
2. Generate the appropriate event.
3. Stop its timer/state.
4. Do not retain unnecessary tab state.

---

# 17. Rapid Tab Switching

The implementation must correctly handle rapid switching.

Example:

```text
A → B → A → C → B
```

Requirements:

- no duplicated events
- no negative durations
- no overlapping active timers
- no lost active intervals
- final state remains correct

---

# 18. ActivityEvent Contract

The extension must use the shared team contract.

Example:

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

Top-level fields should not be changed without agreement with the team.

Browser-specific information should remain inside `metadata` when it does not belong to the shared top-level contract.

---

# 19. Event Fields

| Field | Purpose |
|---|---|
| `id` | Unique event identifier |
| `timestamp` | Event timestamp |
| `source` | Must be `browser` |
| `application` | Browser application, e.g. `Chrome` |
| `window_title` | Current browser/window title |
| `url` | Current URL |
| `duration` | Active duration |
| `is_idle` | Browser activity idle state |
| `metadata` | Limited page metadata |

The extension must validate events before sending them.

---

# 20. Event Generation

The extension should have a clear separation between:

**Browser observation**

and

**Event construction**

Suggested internal flow:

```text
Chrome Event
     ↓
Tracker
     ↓
Current Browser State
     ↓
Metadata Extraction
     ↓
ActivityEvent Builder
     ↓
Validator
     ↓
Local HTTP Client
```

This separation makes the extension easier to test.

---

# 21. Local HTTP Communication

For the MVP, use Local HTTP rather than WebSocket.

Suggested endpoint:

```text
POST http://localhost:<PORT>/api/activity
```

Headers:

```text
Content-Type: application/json
```

Body:

```text
ActivityEvent
```

The extension should send the normalized event to the local The Unplugged application.

---

# 22. Mock Receiver

Member 2 should be able to develop independently of the complete desktop application.

Create/use a simple mock receiver during development.

The mock receiver should:

- accept `POST /api/activity`
- validate the incoming event
- log valid events
- return success for valid events
- reject malformed events
- allow testing without the Electron application

This allows the browser extension to be completed before full integration.

---

# 23. Local Service Unavailable

If the desktop application is unavailable:

- do not crash the extension
- do not continuously retry
- use bounded retry/simple backoff
- avoid creating a large persistent browser database
- avoid retaining unnecessary browser history

The extension should recover automatically when the local service becomes available again.

---

# 24. Intervention Boundary

The extension may provide browser-side UI capability for an intervention.

However, the extension itself should not independently decide that the user is distracted.

The conceptual responsibility is:

```text
Browser Extension
       │
       │ Activity
       ▼
M3 Intelligence
       │
       ├── Relevance
       │
       └── Drift Detection
              │
              ▼
        M4 Intervention
              │
              ▼
       Browser/Desktop UI
```

Therefore:

- **M2:** collects browser activity
- **M3:** determines relevance and drift
- **M4:** owns intervention strategy and overall intervention behavior

This prevents duplicated decision logic.

---

# 25. Extension UI States

The popup should support the following basic states.

## Consent not given

```text
Tracking unavailable

Enable tracking to let
The Unplugged understand
your browser activity.

[ Enable Tracking ]
```

## Tracking enabled

```text
🟢 Tracking enabled
```

## Tracking paused

```text
⚪ Tracking paused
```

## Desktop app unavailable

```text
🟠 Desktop app unavailable

Activity tracking will
resume when the app reconnects.
```

## No active browser activity

```text
No active page detected
```

The UI should explain states without exposing technical errors to the user.

---

# 26. Automated Testing

Use **Vitest**.

Tests should cover:

## Event validation

- required fields
- invalid fields
- malformed metadata
- valid ActivityEvent

## Event generation

- unique ID
- timestamp
- source
- application
- duration
- metadata

## Metadata

- title present
- description present
- OG title present
- OG description present
- metadata missing
- page with no supported metadata

## Tab tracking

- tab activation
- tab switching
- navigation
- tab closing
- window switching
- rapid switching
- duplicate prevention

## Duration

- active duration
- switch finalization
- background tab not counted
- leaving Chrome
- returning to Chrome

## Consent

- tracking disabled by default before consent
- consent enabled
- consent declined
- tracking disabled after being enabled

## HTTP

- successful request
- local service unavailable
- malformed response/request
- retry behavior

---

# 27. Manual Testing

The extension must also be tested manually in Chrome.

### Test 1 — Active tab

Open a page and verify that it becomes the current activity.

### Test 2 — Tab switching

Switch between two tabs and verify that only the active tab accumulates active time.

### Test 3 — Navigation

Navigate to another page and verify that the activity changes correctly.

### Test 4 — Multiple tabs

Open several tabs and switch between them.

### Test 5 — Rapid switching

Rapidly switch between tabs and verify that events and durations remain correct.

### Test 6 — Tab closing

Close the active tab and verify that its active period is finalized.

### Test 7 — Window switching

Switch between Chrome windows and verify correct timing.

### Test 8 — Leave Chrome

Switch from Chrome to VS Code or another application and verify that browser active time stops.

### Test 9 — Metadata

Test pages with and without supported metadata.

### Test 10 — Consent

Verify that no tracking occurs before consent and that tracking starts after consent.

### Test 11 — Receiver unavailable

Stop the local receiver and verify graceful failure/retry.

### Test 12 — Real integration

Run the extension against the actual Electron local receiver.

---

# 28. Security and Privacy Principles

The extension follows a **data minimization** principle.

Collect only what is necessary for:

- understanding current browser activity
- measuring active browser duration
- comparing browser activity with the user's current intent
- detecting attention drift through the intelligence layer

The extension should not become a general browser surveillance tool.

The user should always be able to determine:

1. Whether tracking is enabled.
2. What type of information is collected.
3. Where that information is sent.
4. How to stop tracking.

---

# 29. Visual Design Direction

The extension should inherit the desktop application's visual system.

### General style

- calm
- minimal
- clean
- non-judgmental
- compact
- explainable

### Avoid

- bright gamification
- excessive animations
- large statistics
- complicated graphs
- warning-heavy UI
- distracting notifications

The extension's UI should support the product philosophy:

> **Help the user regain attention without becoming another source of distraction.**

---

# 30. Suggested Component Structure

A possible extension structure:

```text
extension/
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   │
│   ├── tracking/
│   │   ├── tab-tracker.ts
│   │   ├── navigation-tracker.ts
│   │   └── duration-tracker.ts
│   │
│   ├── metadata/
│   │   └── metadata-extractor.ts
│   │
│   ├── consent/
│   │   └── consent-manager.ts
│   │
│   ├── events/
│   │   ├── event-builder.ts
│   │   └── event-validator.ts
│   │
│   ├── communication/
│   │   └── local-client.ts
│   │
│   ├── popup/
│   │   ├── App.tsx
│   │   └── components/
│   │
│   └── tests/
│
├── manifest.json
└── vite.config.ts
```

This is a suggested logical structure. If the existing monorepo already has an established structure, follow that structure instead of forcing this exact layout.

---

# 31. Shared Visual Contract

The extension should visually align with the desktop application.

Use the same:

- typography family
- primary text style
- border treatment
- card treatment
- icon style
- status semantics
- spacing philosophy

The extension can use a more compact layout because its available screen area is small.

---

# 32. MVP Definition of Done

Member 2 is complete when:

- Chrome extension uses Manifest V3.
- TypeScript implementation is working.
- Consent is required before tracking.
- Active tabs are tracked.
- Navigation is tracked.
- Tab switching is tracked.
- Chrome window switching is handled.
- Active duration is calculated correctly.
- Leaving Chrome stops browser active-time counting.
- Required metadata is extracted.
- `ActivityEvent` is generated according to the shared contract.
- Events are validated.
- Events are sent through Local HTTP.
- Mock receiver works.
- Local-service failure is handled gracefully.
- Popup UI displays tracking state.
- Popup UI displays current intent/activity where integration permits.
- Privacy information is accessible.
- Vitest tests pass.
- Manual browser tests pass.
- No prohibited data is collected.

---

# 33. Final Design Principle

The browser extension should be **mostly invisible while working and immediately understandable when opened**.

Its job is not to make the user spend more time inside the extension.

Its job is to quietly provide accurate browser activity information to The Unplugged while giving the user clear control and transparency over tracking.

**The desktop app is the control center.  
The browser extension is the browser-side sensor and lightweight control panel.**
