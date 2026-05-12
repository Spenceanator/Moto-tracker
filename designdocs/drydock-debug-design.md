# Drydock Debug System - Design Document

Version: 1.0
Date: May 11, 2026
Status: Implemented (v6.2.0)


## Problem

Drydock runs primarily on an iPhone added to the home screen. When something breaks — a transfer fails silently, a sync drops, a render glitch happens — there's no way to see what happened without plugging the phone into a Mac and opening Safari dev tools. That's a non-starter in the garage with greasy hands and no Mac nearby.

Android has `chrome://inspect` but requires USB and a desktop. Neither platform gives you quick "what just happened" access during active use.

We need console output visible on the device itself, filterable by subsystem, copyable to clipboard so it can be pasted into a chat or sent to another device.


## Solution

An on-screen debug console built into the app as `src/debug.js`. It intercepts all `console.log`, `console.warn`, and `console.error` calls, stores them in a ring buffer, and renders them in a toggleable overlay panel. Hidden by default — triple-tap the nav bar to open it.

Because it's the first file in the build order (before config.js), it captures everything from the moment the app starts — including Supabase connection, auth, sync, and transfer initialization.


## Current Implementation

### File: `src/debug.js` (~140 lines)

**Console interception:** Wraps `console.log`, `console.warn`, and `console.error` with functions that push to a ring buffer before calling the original. Original methods are preserved so browser dev tools still work normally.

```javascript
var _origLog = console.log;
console.log = function() {
  _dbgPush("log", arguments);
  _origLog.apply(console, arguments);
};
```

**Ring buffer:** 500 entries max (`_dbgMax`). When the buffer fills, the oldest entries are dropped. Each entry stores:

```javascript
{
  ts: Date.now(),      // timestamp
  level: "log",        // "log" | "warn" | "error"
  text: "stringified"  // all arguments joined, objects JSON.stringify'd (truncated to 300 chars)
}
```

**Unhandled error capture:** Listens for `window.error` and `unhandledrejection` events, pushing them as error-level entries. This catches things like network failures, undefined variable access, and rejected promises that wouldn't hit a `console.error` call.

**Toggle mechanism:** Triple-tap (3 clicks within 500ms) on the `#site-nav` element. This is invisible to normal use but accessible on any device. No special gesture required, works with mouse or touch.

**Filter buttons:** The toolbar has four filter modes:

| Filter | Shows | Use Case |
|--------|-------|----------|
| ALL | Everything | General debugging |
| ERROR | `console.error` + uncaught exceptions | Finding crashes |
| WARN | `console.warn` only | Finding degraded behavior |
| [TF] | Any log containing `[TF]` in the text | Transfer-specific debugging |

**Copy button:** Copies all currently filtered logs to clipboard with formatted timestamps:

```
14:23:05.123 [log] [TF] WebSocket open, joining channel: realtime:transfer:user@email.com
14:23:05.625 [log] [TF] Channel joined OK
14:23:06.130 [log] [TF] Sending initial ping
14:23:16.131 [log] [TF] New peer discovered: Windows - Chrome desktop
```

**Clear button:** Empties the ring buffer. Useful when starting a fresh test.

**Close button:** Dismisses the panel (same as triple-tap toggle).

**Visual design:** Fixed to the bottom of the viewport, takes 45% of the screen height. Dark background (#0c0c0c) with amber border matching the app theme. JetBrains Mono font at 10px. Color-coded by level: gray for log, amber for warn, red for error. Auto-scrolls to bottom unless the user has scrolled up to read history.


## Build Position

debug.js is the **first** file in `build.sh`'s FILES array:

```bash
FILES=(
  debug.js        # MUST be first — intercepts console before anything runs
  config.js
  data.js
  sync.js
  ...
)
```

This is critical. If debug.js loads after config.js, it misses Supabase connection logs, auth initialization, and early errors. Moving it later in the build order will create blind spots.


## Logging Convention: Subsystem Tags

All debug logging uses a `[TAG]` prefix convention so logs can be filtered by subsystem. The debug console's `[TF]` filter button demonstrates this — it filters for any log line containing `[TF]`.

### Current Tags

| Tag | Module | What It Covers |
|-----|--------|----------------|
| `[TF]` | transfer.js | WebSocket lifecycle, peer discovery, signaling, WebRTC/ICE state, DataChannel open/close, manifest exchange, chunk send/receive progress, download/zip flow, reconnect attempts, errors |

### Recommended Future Tags

| Tag | Module | What to Instrument |
|-----|--------|-------------------|
| `[SYNC]` | sync.js | Supabase push/pull, timestamp comparison, conflict detection, polling intervals, error responses |
| `[AUTH]` | config.js | Login/logout, token refresh, session expiry, auth gate redirects |
| `[DATA]` | data.js | Load/save cycles, migration triggers, localStorage read/write errors, data size |
| `[CHAT]` | sync.js | Chat message send/receive, polling, notification triggers, SW message passing |
| `[SCAN]` | scan.js | Claude API calls, receipt/listing scan start/complete/error, response parsing |
| `[SW]` | app.js / sw.js | Service worker registration, activation, push config, background poll |
| `[INTAKE]` | sync.js | Intake form submissions received, conversion to jobs |
| `[RENDER]` | app.js | R() calls, deferred renders, forced renders, render timing |


## How to Add Logging to a Module

### Step 1: Identify Critical Paths

For any module, the most valuable log points are:

- **Entry points**: When a feature activates (e.g., sync starts, scan initiated)
- **State transitions**: When something changes (e.g., connected → disconnected, status changes)
- **External calls**: Before and after network requests (Supabase, Claude API)
- **Error paths**: Every `catch` block, every fallback, every "this shouldn't happen"
- **User-facing decisions**: Why something was shown or hidden (e.g., "skipping render because input focused")

### Step 2: Add Tagged Logs

```javascript
// Good — tagged, contextual, includes relevant data
console.log("[SYNC] Push started, data size:", JSON.stringify(data).length, "bytes");
console.log("[SYNC] Pull complete, remote timestamp:", remoteTs, "local:", localTs);
console.warn("[SYNC] Conflict detected, both sides changed since last sync");
console.error("[SYNC] Push failed:", error.message, "status:", error.status);

// Bad — no tag, no context
console.log("syncing...");
console.log(data);
```

### Step 3: Control Verbosity

Not every log needs to fire on every event. For high-frequency operations (chunk transfers, polling), log periodically:

```javascript
// Log every 10th chunk, not every chunk
if (chunkIndex === 0 || chunkIndex % 10 === 0) {
  console.log("[TF] Sending chunk", chunkIndex + "/" + totalChunks);
}
```

For polling loops, log state changes rather than every poll:

```javascript
// Don't log "polling..." every 15 seconds
// Do log when the poll finds something
console.log("[SYNC] Poll detected remote change, pulling");
```

### Step 4: Add a Filter Button (Optional)

If the subsystem generates enough logs to warrant its own filter, add a button in `debug.js`:

In the `_dbgCreate` function, the filter buttons are generated from an array:

```javascript
["all", "error", "warn", "tf"].forEach(function(f) { ... });
```

To add a new filter (e.g., SYNC):

```javascript
["all", "error", "warn", "tf", "sync"].forEach(function(f) { ... });
```

And update `_dbgFiltered()`:

```javascript
function _dbgFiltered() {
  if (_dbgFilter === "all") return _dbgLogs;
  if (_dbgFilter === "tf") return _dbgLogs.filter(function(l) { return l.text.indexOf("[TF]") > -1 });
  if (_dbgFilter === "sync") return _dbgLogs.filter(function(l) { return l.text.indexOf("[SYNC]") > -1 });
  return _dbgLogs.filter(function(l) { return l.level === _dbgFilter });
}
```

The button label for custom filters uses brackets: `[TF]`, `[SYNC]`, etc. Level filters (ALL, ERROR, WARN) are uppercase without brackets.


## Implementation Roadmap

### Phase 1: Transfer Diagnostics (Done)

Comprehensive `[TF]` logging across the entire transfer flow. Covers WebSocket lifecycle, peer discovery, signaling, WebRTC connection, DataChannel state, chunk progress (every 10th), manifest exchange, zip packaging, download trigger, reconnect attempts, and all error paths. Filterable via the `[TF]` button.

### Phase 2: Device Chat for Log Sharing

A simple text chat between devices on the transfer channel. Primary use case: copy debug logs on the phone, paste into chat, read on PC, paste into Cowork for analysis. Uses the same Supabase Realtime broadcast channel — no new infrastructure. See transfer design doc for details.

### Phase 3: Sync and Auth Instrumentation

Add `[SYNC]` and `[AUTH]` tags to sync.js and config.js. These are the next most common failure modes after transfer — silent sync failures, auth token expiry, poll conflicts. Add corresponding filter buttons.

### Phase 4: Full Module Coverage

Instrument remaining modules: `[DATA]`, `[CHAT]`, `[SCAN]`, `[SW]`, `[INTAKE]`, `[RENDER]`. At this point every subsystem has tagged logging and the debug console becomes a full diagnostic tool.

### Phase 5: Log Export

Beyond clipboard copy, add:

- **Share via transfer chat**: One-tap to send the current filtered log buffer to a connected device
- **Download as .txt**: For archival or sharing via other channels
- **Structured JSON export**: For automated analysis


## Design Principles

1. **Zero overhead when closed.** The console only renders when open. Log interception is lightweight (string concat + array push). No DOM work happens in the background.

2. **Never break the app.** All debug code is wrapped to fail silently. A bug in the debug system must never take down the app it's debugging.

3. **No build flags.** The debug system ships in production. There's no "debug build" vs "release build." It's always there, always intercepting, just invisible until you triple-tap. This means the same build you're debugging is the same build users see.

4. **Copy-paste is the API.** The primary output mechanism is clipboard copy. This keeps the system simple and works everywhere — paste into a chat, a note, a text file, Cowork, whatever.

5. **Tags are conventions, not infrastructure.** There's no registry of valid tags, no enforcement, no tag validation. Just prefix your log with `[TAG]` and the filter will find it. This keeps the barrier to adding instrumentation as low as possible.


## Files

### Created
- `src/debug.js` (~140 lines) — On-screen debug console with console interception, ring buffer, filter UI, clipboard copy

### Modified
- `src/build.sh` — debug.js added as first entry in FILES array
- `src/transfer.js` — ~40 `[TF]` tagged log statements added across all transfer code paths

### Dependencies
- None. debug.js is pure vanilla JS with no imports or external libraries.
