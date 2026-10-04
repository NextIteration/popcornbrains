# The Unplugged --- Member 2 Coding Agent Guide

## 1. Role

You are implementing **Member 2: Browser Extension**.

Your module collects browser activity and sends normalized events to the
local Electron application.

### You own

-   Chrome MV3 extension
-   tab/activity tracking
-   navigation
-   URL/title/metadata
-   duration
-   consent
-   event creation/validation
-   local HTTP client
-   extension tests
-   extension error handling

### You do NOT own

-   Windows tracking
-   Windows idle detection
-   SQLite
-   AI relevance
-   drift detection
-   intervention
-   Return-to-Task
-   Reclaim Score
-   dashboard

If another module must change, **stop and report the required interface
change**. Do not modify another teammate's module.

------------------------------------------------------------------------

# 2. Rules

1.  Inspect the repository before editing.
2.  Reuse the existing stack and structure.
3.  Use TypeScript + Manifest V3 + Vite.
4.  Use Local HTTP for extension → Electron communication.
5.  Keep the extension independent of AI and SQLite.
6.  Require explicit user consent before tracking.
7.  Collect only the approved browser data.
8.  Do not add broad permissions without justification.
9.  Do not put AI keys in the extension.
10. Do not scrape full pages.
11. Do not collect passwords, forms, keystrokes, screenshots, cookies or
    clipboard.
12. Do not implement drift detection in the extension.
13. Do not implement intervention logic in the extension.
14. Do not create a second database.
15. Test after every implementation stage.
16. Do not hardcode fake dashboard data.
17. Do not change another member's code just to make integration
    convenient.
18. Prefer the smallest implementation that satisfies the PRD.

------------------------------------------------------------------------

# 3. First Agent Task --- Inspect Repository

Before writing code, report:

``` text
- Monorepo structure
- Extension location
- Existing extension files
- Existing shared types
- Existing Electron endpoint/client
- Build command
- Test command
- Existing dependencies
- Files you plan to modify
- Files you will not modify
```

Then implement only the extension changes.

If the repository already has an extension skeleton, extend it rather
than creating another one.

------------------------------------------------------------------------

# 4. Implementation Sequence

``` text
Repository inspection
        ↓
MV3 extension verification
        ↓
Consent
        ↓
Active-tab tracking
        ↓
Navigation tracking
        ↓
Duration tracking
        ↓
Metadata extraction
        ↓
ActivityEvent builder + validator
        ↓
Local HTTP client
        ↓
Mock receiver
        ↓
Retry/error handling
        ↓
Automated tests
        ↓
Manual acceptance tests
        ↓
Electron integration
        ↓
Privacy audit
```

------------------------------------------------------------------------

# 5. Stage 1 --- Manifest V3

Verify: - manifest version 3 - service worker - minimum permissions -
minimum host permissions - Vite build - Chrome loading

Every permission must have a reason.

Do not add permissions for future features.

------------------------------------------------------------------------

# 6. Stage 2 --- Consent

Implement a first-run consent UI.

Required wording should clearly explain: - URLs/websites - titles -
limited metadata - tab activity - time spent - no
passwords/forms/keystrokes/screenshots/cookies/full page content - local
processing

Buttons:

``` text
[I Agree & Enable Tracking]
[Not Now]
```

Tests:

``` text
Decline → no collection
Agree → collection enabled
```

------------------------------------------------------------------------

# 7. Stage 3 --- Active Tab

Use Chrome APIs to track: - active tab - tab ID - window ID - URL -
title

Transition:

``` text
A active
 ↓
B active
 ↓
finalize A
 ↓
start B
```

Avoid duplicate events.

------------------------------------------------------------------------

# 8. Stage 4 --- Navigation

Navigation within the same tab must be handled separately from tab
switching.

``` text
Page A
 ↓
navigate
 ↓
finalize A
 ↓
capture Page B
 ↓
start B
```

------------------------------------------------------------------------

# 9. Stage 5 --- Duration

Track active time, not tab existence.

Example:

``` text
10:00 A active
10:05 B active
→ A duration = 300 seconds
```

Background tabs do not accumulate active duration.

When Chrome is no longer the foreground desktop application, do not
continue counting active browser time. M1 handles the non-browser
activity.

------------------------------------------------------------------------

# 10. Stage 6 --- Metadata

Collect only:

``` text
document.title
meta[name="description"]
meta[property="og:title"]
meta[property="og:description"]
```

Never scrape: - `document.body.innerText` - full DOM - forms - inputs -
video - screenshots

Missing metadata must not break the event.

------------------------------------------------------------------------

# 11. Stage 7 --- ActivityEvent

Use:

``` typescript
interface ActivityEvent {
  id: string;
  timestamp: string;
  source: "browser";
  application: "Chrome";
  window_title: string | null;
  url: string | null;
  duration: number;
  is_idle: boolean;
  metadata: {
    title?: string | null;
    description?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
  };
}
```

Example:

``` json
{
  "id": "evt-123",
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
    "ogDescription": "Database normalization tutorial."
  }
}
```

Validate before sending.

------------------------------------------------------------------------

# 12. Stage 8 --- Local HTTP

Use:

``` text
POST http://localhost:<PORT>/api/activity
```

with JSON body equal to the validated `ActivityEvent`.

Do not implement AI calls here.

Do not store an AI API key in the extension.

------------------------------------------------------------------------

# 13. Stage 9 --- Mock Receiver

Create/use a minimal mock receiver.

It should: - validate events - log events - return success - reject
malformed events

This lets the extension be completed independently of the rest of the
team.

Do not add SQLite to the mock.

------------------------------------------------------------------------

# 14. Stage 10 --- Failure Handling

Handle: - local service unavailable - timeout - malformed event -
missing metadata - restricted page - tab close - Chrome close -
service-worker restart

Use a small bounded retry/queue only if needed.

Do not build a persistent browser database.

------------------------------------------------------------------------

# 15. Stage 11 --- Automated Testing

Use Vitest.

Minimum:

``` text
✓ schema validation
✓ metadata extraction
✓ missing metadata
✓ duration calculation
✓ tab activation
✓ tab switching
✓ navigation
✓ tab close
✓ window switching
✓ rapid switching
✓ duplicate prevention
✓ consent off
✓ consent on
✓ HTTP success
✓ HTTP failure
✓ malformed event
✓ retry behavior
```

------------------------------------------------------------------------

# 16. Stage 12 --- Integration

Only after the extension works with the mock receiver:

1.  Locate the agreed Electron endpoint.
2.  Configure the extension to use it.
3.  Send the exact same `ActivityEvent`.
4.  Verify Electron receives it.
5.  Do not change the schema just for integration.
6.  If the backend contract is incompatible, stop and report the
    mismatch.

------------------------------------------------------------------------

# 17. Forbidden Changes

Never implement or modify:

``` text
Windows foreground tracker
Windows idle detector
SQLite schema/implementation owned by another module
AI relevance
Drift detector
Intervention engine
Return-to-Task
Reclaim Score
Dashboard
Predictive ML
Cloud sync
```

If asked to implement one of these, explain that it is outside Member 2
scope.

------------------------------------------------------------------------

# 18. Privacy Audit Before Completion

Verify:

``` text
[ ] Consent required
[ ] Tracking can remain disabled
[ ] No passwords
[ ] No form inputs
[ ] No keystrokes
[ ] No screenshots
[ ] No cookies
[ ] No clipboard
[ ] No full-page scraping
[ ] No video frames
[ ] No unnecessary permissions
[ ] No API keys in extension
[ ] Only approved metadata
[ ] Only ActivityEvent sent to local service
```

------------------------------------------------------------------------

# 19. Final Demo Test

Demonstrate:

``` text
Enable tracking
      ↓
Open DBMS page
      ↓
Capture URL/title/metadata
      ↓
Switch to unrelated tab
      ↓
Finalize first activity
      ↓
Capture second activity
      ↓
Navigate
      ↓
Finalize previous page
      ↓
Capture new page
      ↓
Send ActivityEvents to Electron
```

Also demonstrate:

``` text
Chrome
 ↓
GTA V
 ↓
Chrome
```

The extension must stop counting active browser time while GTA V is
foreground. M1 records GTA V separately.

------------------------------------------------------------------------

# 20. Definition of Done

``` text
[ ] MV3
[ ] TypeScript
[ ] Vite build works
[ ] Consent works
[ ] Active tab works
[ ] Tab switching works
[ ] Navigation works
[ ] URL works
[ ] Title works
[ ] Metadata works
[ ] Duration works
[ ] Multiple tabs work
[ ] Multiple windows work
[ ] Tab close works
[ ] Rapid switching works
[ ] Duplicate prevention works
[ ] ActivityEvent validated
[ ] Local HTTP works
[ ] Mock receiver works
[ ] Electron integration works
[ ] Error handling works
[ ] Vitest tests pass
[ ] Privacy audit passes
[ ] No M1/M3/M4 code modified
```

## Final Principle

The extension answers:

> **What is happening in Chrome, and for how long?**

It does not answer:

> **Is this a distraction?**

That decision belongs to the intelligence/drift layer.
