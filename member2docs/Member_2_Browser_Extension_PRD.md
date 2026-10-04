# The Unplugged --- Member 2 Browser Extension PRD

## 1. Purpose

Member 2 owns the Chrome browser extension for The Unplugged MVP. The
extension collects only the browser activity required by the system and
sends normalized `ActivityEvent` objects to the local Electron
application.

**Core flow**

``` text
Chrome
  ↓
Browser Extension
  ↓
Collect browser activity
  ↓
Create ActivityEvent
  ↓
Local HTTP
  ↓
Electron Main Process
```

The extension is **not** responsible for AI relevance, drift detection,
intervention, Reclaim Score, SQLite, Windows application tracking, or
the dashboard.

## 2. Team Stack

  Component             Technology
  --------------------- ---------------------------------------
  Desktop               Electron + TypeScript
  Desktop/backend       Node.js through Electron Main Process
  Dashboard             React + TypeScript
  Chrome extension      TypeScript + Chrome Manifest V3
  Database              SQLite + better-sqlite3
  Extension ↔ desktop   Local HTTP
  AI                    LLM API through desktop backend
  Build                 Vite
  Tests                 Vitest
  Shared contracts      TypeScript
  Repository            Single monorepo

## 3. Scope

### Member 2 owns

-   Chrome Manifest V3 extension
-   Active-tab tracking
-   Tab switching
-   Navigation
-   URL and title capture
-   Limited page metadata
-   Active duration
-   Browser/window lifecycle handling
-   `ActivityEvent` creation and validation
-   Browser → local service delivery
-   Consent/tracking gate
-   Extension tests and error handling

### Out of scope

-   Windows foreground/application tracking
-   Windows idle detection
-   SQLite implementation
-   AI relevance
-   Drift detection
-   Intervention
-   Return-to-Task
-   Reclaim Score
-   Dashboard
-   Predictive ML, cloud sync, etc.

If integration requires an external change, report the required
interface change instead of editing another module.

## 4. Data to Collect

Collect only:

-   Active tab
-   Tab ID
-   Window ID
-   URL
-   Page title
-   Navigation events
-   Tab-switch events
-   Active duration
-   Limited metadata:
    -   `<meta name="description">`
    -   `og:title`
    -   `og:description`

Do **not** collect: - passwords - form values - keystrokes -
screenshots - cookies - clipboard - video frames - full page content -
full DOM/body text - unrelated browsing data

## 5. Consent

Tracking must be explicitly enabled by the user.

Example:

> **The Unplugged needs limited browser activity to detect attention
> drift.**
>
> We collect websites/URLs, page titles, limited metadata, tab activity
> and time spent while tracking is enabled.
>
> We do not collect passwords, form inputs, keystrokes, screenshots,
> cookies or full page content.
>
> Browser activity is sent to the local The Unplugged application for
> processing.

``` text
First use
   ↓
Consent screen
   ↓
Agree? ── No ──→ No tracking
   │
  Yes
   ↓
Tracking enabled
```

No activity may be collected before consent. The user must be able to
see whether tracking is enabled.

## 6. Architecture

``` text
                     Chrome
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Tab events     Navigation      Page metadata
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                Activity Collector
                       │
                       ▼
                 Duration Manager
                       │
                       ▼
                ActivityEvent
                       │
                   validation
                       │
                       ▼
                  Local HTTP
                       │
                       ▼
              Electron Main Process
```

Suggested extension modules:

``` text
extension/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── tab-tracker.ts
│   │   ├── navigation-tracker.ts
│   │   ├── duration-tracker.ts
│   │   ├── metadata.ts
│   │   ├── consent.ts
│   │   └── event-builder.ts
│   ├── communication/
│   │   └── local-client.ts
│   ├── types/
│   │   └── activity-event.ts
│   └── popup/
└── tests/
```

Use the existing repository structure if one already exists; do not
reorganize the monorepo unnecessarily.

## 7. ActivityEvent Contract

Use the team's shared contract:

``` json
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

Rules:

  Field            Rule
  ---------------- ----------------------------------------------------------
  `id`             Unique
  `timestamp`      ISO 8601
  `source`         `"browser"`
  `application`    `"Chrome"`
  `window_title`   Current page title where applicable
  `url`            Current URL
  `duration`       Active duration in seconds
  `is_idle`        Do not infer Windows idle state; use agreed shared value
  `metadata`       Only required browser metadata

Do not add top-level fields without agreement with the shared-contract
owner.

## 8. Event Lifecycle

### Active-tab switch

``` text
Tab A active
  ↓
Tab B becomes active
  ↓
Finalize A
  ↓
Calculate A duration
  ↓
Create/send A event
  ↓
Start B timing
```

### Navigation

``` text
Page A
  ↓
Navigation
  ↓
Finalize A
  ↓
Capture Page B
  ↓
Start B timing
```

### Tab close

``` text
Active tab
  ↓
Close
  ↓
Finalize duration
  ↓
Send event
```

### Window switch

``` text
Chrome Window 1 / Tab A
          ↓
Chrome Window 2 / Tab B
          ↓
Finalize A
          ↓
Start B
```

### Leaving Chrome

If the user moves to another desktop application, the extension must
stop counting the browser tab as actively used. M1 handles the
non-browser activity.

## 9. Duration Rules

Measure **active-tab duration**, not tab lifetime.

``` text
10:00 Tab A active
10:05 Tab B active
→ A = 5 minutes
```

If A remains open in the background until 11:00, the extra 55 minutes
are not counted for A.

Handle rapid switching without duplicate or missing events.

## 10. Metadata

Read only:

``` text
document.title
meta[name="description"]
meta[property="og:title"]
meta[property="og:description"]
```

Missing metadata should become `null`/omitted fields. Do not scrape the
page body or full DOM.

Restricted Chrome pages may only provide limited information; fail
gracefully.

## 11. Communication

Use **Local HTTP** for the MVP:

``` text
Extension
   │ POST /api/activity
   ▼
localhost
   ▼
Electron Main Process
```

Suggested endpoint:

``` text
POST http://localhost:<PORT>/api/activity
Content-Type: application/json
```

The extension does not contain an AI API key.

## 12. Mock Receiver

Before the real Electron receiver is ready, use a small mock receiver:

``` text
Extension
   ↓
POST /api/activity
   ↓
Mock receiver
   ↓
Validate + log + respond
```

It must accept valid events, reject malformed events and allow
integration testing without SQLite.

## 13. Failure Handling

If the local service is unavailable: - Do not crash the extension. - Use
a small bounded queue/retry mechanism if needed. - Use simple backoff. -
Do not keep sensitive browsing data indefinitely. - Do not create a
large browser-side database.

Other failures: - Missing URL/title → valid event with null/empty
value. - Missing metadata → continue. - Restricted page → use what is
available. - Service-worker restart → recover necessary active state.

## 14. Testing

Use Vitest.

### Automated tests

-   ActivityEvent validation
-   ID/timestamp generation
-   Metadata extraction
-   Missing metadata
-   Duration calculation
-   Tab activation
-   Tab switching
-   Navigation
-   Tab close
-   Window switching
-   Rapid switching
-   Duplicate prevention
-   Consent enabled/disabled
-   HTTP success/failure
-   Malformed event
-   Retry behavior

### Manual tests

1.  Open Chrome and verify active-tab tracking.
2.  Switch tabs and verify previous duration.
3.  Navigate within a tab.
4.  Open multiple tabs and switch rapidly.
5.  Close an active tab.
6.  Switch Chrome windows.
7.  Leave Chrome for GTA V/VS Code and verify browser duration stops.
8.  Verify metadata.
9.  Decline consent and verify no collection.
10. Accept consent and verify events.
11. Test receiver unavailable.
12. Test with the real Electron receiver.

## 15. Acceptance Criteria

-   MV3 extension builds and loads.
-   Explicit consent is required.
-   Active tab is detected.
-   Tab switches and navigation are detected.
-   URL/title/required metadata are captured.
-   Active duration is correct.
-   Multiple tabs/windows work.
-   Tab closure works.
-   Rapid switching produces no duplicate events.
-   `ActivityEvent` matches the shared contract.
-   Events reach the local HTTP receiver.
-   Mock receiver works.
-   Receiver failures are handled gracefully.
-   Automated tests pass.
-   No prohibited data is collected.
-   No unnecessary permissions are used.
-   No AI API key exists in the extension.

## 16. Definition of Done

``` text
Consent
  ↓
Browser activity begins
  ↓
Active tab detected
  ↓
URL/title/metadata captured
  ↓
Tab/navigation changes detected
  ↓
Active duration calculated
  ↓
ActivityEvent generated
  ↓
Validated
  ↓
POST /api/activity
  ↓
Electron receives event
```

The extension answers:

> **What browser activity is the user currently engaged in, and how long
> were they actively engaged with it?**

It does not decide whether the activity is a distraction.
