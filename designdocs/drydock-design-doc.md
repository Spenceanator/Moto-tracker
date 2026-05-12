# Drydock - Application Design Document

Version: 1.1
Last updated: May 11, 2026
Current app version: v6.2.0 (Data v4)
Current line count: ~3,400 lines (built from 11 source modules)


## What It Is

Drydock is a single-page HTML application for managing a mechanical repair and vehicle flip business. It tracks the full lifecycle of a flip (lead scouting through sale and P&L), service jobs for customers, expenses, mileage, and parts. It runs on GitHub Pages with localStorage for persistence and Supabase for cloud sync, auth, customer intake, and job chat. It's built to run on a phone as the primary interface with desktop as a secondary screen.

The name comes from Star Trek's drydock concept - if the bikes could fly, the garage would be a drydock.


## Origin Story

The app started as "Moto Tracker" - a simple React JSX artifact inside Claude's chat for tracking two motorcycle flip slots. localStorage didn't work in the JSX sandbox, so it moved to a standalone HTML file that could run in Safari and be added to the home screen. The HTML approach stuck because it was downloadable, portable, and localStorage worked natively. It was later rebranded to Drydock when the business identity solidified.


## Evolution Timeline

### Era 1: Moto Tracker (Data v1-v2)

The original version was a single HTML file with vanilla JS. No build system, no modules - everything in one `<script>` tag.

**v1 (Data v1)** - Two bike slots. Each bike had a name, type (flip/keep), description, buy price, target sell, work log (single textarea), tasks (name/done/blocked), and customizable checklists. A Buy checklist and Sell checklist shipped as defaults. Backup/restore via JSON copy-paste. All data in localStorage under key `mototracker_data`.

**v2 (Data v2)** - Added leads pipeline. Leads capture year, make, model, mileage, asking price, estimated sell price, title status, listing source, and status (watching/pursue/pass). Issue assessment per lead with known issues and likely hidden issues, each scored by severity (low/med/high), difficulty (easy/mod/hard), and estimated repair cost. Totals roll up into a rehab estimate with projected margin calculation. One-button convert from lead to bike slot that carries all data forward. Filter chips on the leads tab (All/Pursue/Watching/Pass). Inline delete confirmations replaced browser `confirm()` dialogs.

### Era 2: Full Business Tool (Data v3-v4)

**v3 (Data v3)** - Sold flow and analytics. Green "Mark as Sold" button on bikes captures final sell price and date, computes profit, moves bike to `data.sold[]` archive with full history preserved. Sold tab with aggregate analytics: total profit, flip count, average profit per flip, average days owned, total parts spend, source breakdown. Listing URL and seller info fields on leads. `actualBuyPrice` on bikes (negotiated price vs listing ask). `buyDate` auto-set on convert with running "Day X" counter on cards. `source` field carries through from lead origin.

**v4 (Data v4)** - The current data schema. Service jobs added as a major feature. T-CLOCS+ release checklist (36 items). Task metadata expanded with `createdAt`, `completedAt`, `costLogged` timestamps. Live P&L per bike. Offer calculator on leads. Expense system with category tagging to bikes and jobs. Receipt scanning and listing evaluation via Claude API (chat-based interface, Sonnet for receipts, Opus for listings). Mileage tracker with per-trip vehicle selection. CSV export. `APP_VERSION` constant added for deploy tracking.

### Era 3: Drydock Rebrand + Cloud (v4.5.x)

**v4.5.1** - Three major additions in one release:

Rebrand from Moto Tracker to Drydock across all references (title, meta tags, backups, CSVs, headers).

Vehicle specs system with 19 fields per bike: tire PSI and sizes (front/rear), oil type and capacity, coolant type, brake fluid, fuel octane, spark plug, headlight/turn signal/tail bulbs, chain size, valve clearance, front/rear axle torque, drain bolt torque. Inline editable, specs carry through lead-to-bike conversion. Claude API scan prompt updated to research factory specs. Specs included in paste import JSON schema.

Task triage system: lead-generated tasks come in as "unverified" (purple dashed border, italic). VERIFY button confirms the issue is real and moves it to ready. Trash to dismiss speculative issues. Separate "Needs Triage" section at top of task list. Unverified tasks can't be blocked. Triage counts shown on home cards.

Cloud sync via Supabase: settings fields for Supabase URL and anon key (paste once per device). Auto-push on every save (2s debounce). Auto-pull on app load (newer timestamp wins). Manual Push/Pull in settings. Sync status dot on home screen (green/red). Supabase credentials stay local per device, excluded from JSON backups. All migration logic refactored into shared `migrate()` function.

**v4.5.2** - Sync fixes and auto-polling. Pull fixed to force sync regardless of timestamps. Supabase credentials preserved per-device during pulls. Polling added: lightweight timestamp-only check every 15 seconds, auto-accepts remote changes if no local edits pending, amber sync dot for conflicts (both sides changed), instant poll on app resume via visibility change listener.

### Era 4: Auth + Multi-Page + Customer Features (v5.x)

**v5.0.0** - Auth system and multi-page architecture.

Login page (`index.html`) with Supabase email/password auth. Session tokens in localStorage persist across refreshes. Auth gate on app.html redirects to login if no valid session. RLS policies lock down Supabase tables to authenticated users only.

Service jobs redesigned: customer name field, vehicle info, job-specific tasks, quoted price, labor timer (tap to start/stop, accumulates, manual override for corrections). Status flow: intake -> in-progress -> waiting -> done -> delivered, with single-tap advance. Jobs sorted by status on home tab. Active job count in header subtitle.

Work log upgraded from single textarea to timestamped entry array (`log: [{id, ts, text}]`). Timeline UI with vertical markers, date/time headers, newest first. Add/edit/delete per entry. Activity logging feeds first 60 chars per entry. Old `workLog` and `notes` strings auto-migrate to first log entry.

Drydock rebrand finalized throughout: header shows "DRYDOCK", amber (#f59e0b) on near-black (#0a0a0a) palette.

**v5.1.0** - Customer-facing pages.

Job sharing: generates a unique share token per job. Customer status page (`status.html`) shows job status, vehicle info, work timeline, and a two-way chat. Customer can see progress without calling. Mechanic sends messages from the job view in Drydock.

Intake form (`intake.html`): public page (no auth). Customer submits name, vehicle, problem description, photos. Creates an entry in the `job_public` Supabase table. Shows up as intake items in the Drydock app for the mechanic to review and convert to active jobs.

Chat system (`job_chat` Supabase table): real-time two-way messaging between mechanic and customer. Token-based auth for customers (no account needed). user_agent metadata logged per message. Chat polling with auto-refresh.

**v5.2.0** - User agent metadata on customer chat messages for browser/device logging.

**v5.3.0** - PWA support. `manifest.json` with amber theme and standalone display. Service worker (`sw.js`) for background chat polling and browser notifications. Notification click navigates directly to the relevant job's chat tab.

**v5.4.0 - v5.5.0** - Parts tracking on Today view. In-transit parts with status indicators and age counters (days since ordered). Parts section shows across bikes and jobs.

**v5.7.x** - Today view refinements. Bell notification icon with shake animation when unread messages exist. Weekly activity summary (expandable). Expense tracking audit and reconciliation - task cost "in expenses" toggle wired to actually create expense entries.

**v5.9.x** - Chat notification race condition fixed. Unread badge now clears instantly on click (bell menu, Today unread section, browser notification) instead of waiting for the `loadJobChat` fetch to complete. Previously the read marker only set after the fetch finished, creating a flicker where badges would briefly re-appear.

### Era 5: Source Split + Stabilization (v6.x)

**v6.0.0** - Source code split from monolith to 9 modules (now 11 with debug.js and transfer.js):

```
src/
  shell_head.html              HTML wrapper, CSS, meta tags, CDN scripts (JSZip)
  debug.js       (140 lines)   On-screen debug console, console interception, ring buffer, filter UI
  config.js       (44 lines)   Constants, SB connection, auth, roles, nav (incl Transfer), version
  data.js        (127 lines)   fresh(), migrate(), load(), save(), logAct(), loadJobChat()
  sync.js        (277 lines)   Chat polling, notifications, bell menu, Supabase sync, intake, job sharing
  scan.js         (40 lines)   Receipt + listing scan (Claude API)
  ui.js           (61 lines)   Icons, h(), ckbox(), badge(), flash(), compressImg(), CSV export, timer
  components.js  (413 lines)   rLog, rParts, rPhotoLog, rTask, rAddTask, rIssue, rSpecs, rChecklist, rPastePanel, session calc
  views.js       (675 lines)   rLeadView, rBikeView, rSettings, rAnalytics, rExpenses, rMileage, rJobView, rClientView
  home.js        (637 lines)   rHome() - Today view, heatmap, sessions, tasks, waiting parts
  transfer.js    (940 lines)   P2P file transfer: device identity, broadcast discovery, WebRTC, chunked transfer, zip packaging, wake lock, retry, device chat, debug logging, transfer view UI
  app.js          (37 lines)   R() with input-focus guard, render routing, startup, polling, SW registration
  build.sh                     Concatenates shell_head.html + all JS into app.html
```

Build workflow: edit individual src files, run `cd src && bash build.sh`, output is `app.html`. GitHub Actions CI auto-builds app.html from src/ on push. Verified lossless against original monolith via diff.

**v6.1.2** - Timezone fix across the entire app. Every day boundary calculation was using `toISOString()` which returns UTC - at 6pm Mountain time, UTC thinks it's tomorrow. Added `localDateStr()` helper using `getFullYear/getMonth/getDate` for local time. Replaced 11 instances across components.js, home.js, and views.js. Supabase timestamps stay UTC where appropriate. Also: cleaner status change labels ("Status -> in-progress" instead of just "-> in-progress") and grammar fix ("1 action" not "1 actions").

**v6.2.0** - P2P file transfer via WebRTC. New `src/transfer.js` module (~480 lines). Devices on the same Supabase account discover each other via broadcast ping/pong on a Supabase Realtime channel (`transfer:{email}`). WebRTC DataChannel handles direct device-to-device file transfer — files never touch any server. Chunked protocol (64KB/chunk) with per-chunk ack, wake lock, exponential backoff retry, and resume state. Received files bundled into a timestamped zip via JSZip CDN. Transfer nav button added to config.js. iOS safe area fix for the nav bar (was hidden under the notch). Input-focus guard on `R()` prevents background re-renders from erasing text in active inputs. CI auto-build via GitHub Actions.

Key implementation notes from v6.2.0 development:
- Originally used Supabase Realtime presence API for discovery, but the raw Phoenix WebSocket presence protocol was unreliable without the JS SDK. Replaced with simple broadcast ping/pong (10s interval, 30s expiry).
- Transfer request payload kept lightweight (file count + preview) — full manifest sent over DataChannel after WebRTC connects. Large manifests (30+ files) exceeded Supabase broadcast size limits and silently dropped.
- Chrome throttles rapid sequential `a.click()` downloads (~10-12 max). Zipping received files into one download solved this.
- `shell_head.html` has a persistent truncation bug when written via the Edit/Write file tools — must be written via bash heredoc to avoid file corruption at ~8KB boundary.
- On-screen debug console (`debug.js`) added as first build module — intercepts all console output from app startup. Triple-tap nav bar to toggle. Filter by level or `[TF]` tag for transfer diagnostics.
- Device chat added to the transfer view — text messaging between devices via the same Supabase broadcast channel. Includes "Paste Logs" button that dumps the last 50 debug entries into chat for cross-device debugging (phone to PC to Cowork workflow).
- Comprehensive `[TF]` diagnostic logging added throughout the transfer flow — WebSocket lifecycle, peer discovery, signaling, WebRTC/ICE, DataChannel state, chunk progress, zip packaging, error paths. See `drydock-debug-design.md` for the instrumentation guide and roadmap.


## Current Architecture

### Deployed Files (GitHub Pages)

```
Moto-tracker/
  index.html          Login page (Supabase email/password auth)
  app.html             Drydock main app (built output, ~2400 lines)
  workspace.html       Spatial workspace (separate tool, see workspace doc)
  intake.html          Customer intake form (public, no auth)
  status.html          Customer job status + chat (token-based)
  manifest.json        PWA manifest (amber theme, standalone)
  sw.js                Service worker (background chat polling, notifications)
  src/                 Source modules (not deployed, development only)
```

### Data Model (Data v4)

All data stored in localStorage under key `mototracker_data` and synced to Supabase `sync` table as a JSON blob.

```
{
  version: 4,
  bikes: [{
    id, name, type ("flip"|"keep"), description,
    buyPrice, actualBuyPrice, targetSell, buyDate, source,
    tasks: [{ id, name, done, blocked, blockedReason, note, cost, costLogged,
              createdAt, completedAt, verified }],
    log: [{ id, ts, text }],
    checklistTemplates: [{ id, name, items: [string] }],
    photo, photos: [],
    specs: { tirePsiFront, tirePsiRear, tireSizeFront, tireSizeRear,
             oilType, oilCapacity, fuelType, sparkPlug, chainSize,
             coolantType, brakeFluid, bulbHeadlight, bulbTurnSignal,
             bulbTail, valveClearance, torqueAxleFront, torqueAxleRear,
             torqueDrain, notes },
    parts: [{ id, name, status, source, orderedDate, cost, days }],
    expenses: [{ id, date, amount, category, note, bikeId }],
    originLead: { ...full lead object preserved on conversion }
  }],
  leads: [{
    id, year, make, model, askingPrice, estSellPrice, mileage,
    titleStatus, listingSource, listingUrl, sellerName, sellerContact,
    flipDifficulty, partsAvailability, demandLevel, estDaysToSell,
    status ("watching"|"pursue"|"pass"), notes, photo,
    knownIssues: [{ name, severity, difficulty, cost }],
    hiddenIssues: [{ name, severity, difficulty, cost }],
    specs: { ...same 19 fields }
  }],
  sold: [{
    ...full bike object at time of sale,
    sellPrice, sellDate, profit, daysOwned
  }],
  jobs: [{
    id, customerName, vehicle, problem, status,
    quotedPrice, tasks: [], log: [], parts: [],
    shareToken, laborSessions: [{ start, end }],
    createdAt
  }],
  customers: [{ id, name, email, phone, vehicles: [], jobIds: [] }],
  expenses: [{ id, date, amount, category, note, bikeId, jobId }],
  mileage: [{ id, date, distance, vehicle, purpose, bikeId }],
  checklistTemplates: [{ id, name, items: [] }],
  activity: [{ id, ts, type, text, entityType, entityId }],
  _ts: timestamp,
  apiKey: "...",
  supabaseUrl: "...",
  supabaseKey: "..."
}
```

### Supabase Schema

```sql
-- Main app data (JSON blob sync)
sync (id text PK, data jsonb, updated_at timestamptz)

-- Customer intake submissions (public write)
job_public (id uuid PK, token text, name text, vehicle text,
            problem text, photos text[], status text, created_at timestamptz)

-- Two-way job chat (public read/write by token)
job_chat (id uuid PK, token text, sender text, message text,
          sender_email text, user_agent text, ip_hint text, created_at timestamptz)

-- Workspace notebooks (separate from Drydock data)
notebooks (id text PK, data jsonb, updated_at timestamptz)
```

RLS policies: `sync`, `notebooks` require authenticated role. `job_public` and `job_chat` allow anonymous insert/select filtered by token.

### Auth Flow

1. User opens any page -> auth gate checks localStorage for valid session token
2. No token or expired -> redirect to `index.html`
3. Login form POSTs to Supabase `/auth/v1/token?grant_type=password`
4. Success -> session stored in localStorage (`drydock_auth`), redirect to `app.html`
5. All Supabase API calls include `Authorization: Bearer {access_token}`

### Sync Architecture

Two-tier sync: localStorage is the render buffer, Supabase is the source of truth.

Push: every `save()` debounces 2 seconds then upserts the full data blob to Supabase `sync` table.

Poll: every 15 seconds, a lightweight fetch checks only the `updated_at` timestamp. If remote is newer and no local edits pending, auto-pull and re-render. If both sides changed, amber sync dot signals conflict for manual resolution.

App resume: visibility change listener triggers immediate poll on tab focus / phone unlock.

### Claude API Integration

Two-tier model using the API key stored in app data:

Sonnet: receipt scanning (photo -> parsed expense data) and lightweight chat tasks.

Opus: listing evaluation (URL or pasted text -> full lead JSON with specs, issues, comps, market analysis) and flip research.

Interface is a chat-based panel within the scan view. System prompts include the full lead JSON schema and specs schema so output can be pasted directly into the app.

### Role System (Prepared, Not Yet Active)

```
owner:    app.html, workspace.html (full access)
employee: app.html, workspace.html (future: scoped to assigned jobs)
customer: intake.html, status.html (public, token-based)
```

`getRole()` currently returns "owner" for all authenticated users. When a users table is added to Supabase, this function swaps to a role lookup by email. Nav rendering, page access checks, and feature gating all flow from this single function.

### PWA / Notifications

`manifest.json` enables Add to Home Screen with standalone display mode and amber theme color. Service worker (`sw.js`) runs background polling on active job chat tokens. When new messages arrive, triggers browser Notification API with job context. Notification click navigates to the specific job's chat tab with immediate read-mark.


## Key Design Decisions

**Single HTML file output.** The app compiles to one file. No bundler, no framework, no node_modules. Vanilla JS with a `h()` DOM helper function. This was a deliberate choice: the app needs to work offline, be trivially deployable to GitHub Pages, and be editable by a single person without build toolchain complexity.

**localStorage + JSON blob sync.** The entire app state is one JSON object. This keeps the local experience fast and offline-capable while Supabase handles cross-device sync. The tradeoff is no relational queries on the server side - all filtering and aggregation happens client-side in JS. Migration to proper Supabase tables is on the roadmap for when query complexity demands it.

**Data preservation through transitions.** When a lead converts to a bike, the full original lead object is stored as `originLead`. When a bike is sold, the full bike object (including all tasks, logs, expenses) moves to `data.sold[]`. No data is dropped at any lifecycle transition.

**Customer features without customer accounts.** Share tokens give customers access to their specific job's status and chat without requiring account creation. The intake form writes to a public table. This keeps the customer experience frictionless while maintaining security through token-based access.

**Build rule: always bump APP_VERSION on every file delivery. GitHub Actions CI auto-builds app.html from src/ on push — commit only src/ changes, not app.html. Local build.sh is for testing only.**


## Upcoming / Planned

Listed roughly by priority:

- ~~P2P file transfer~~ — **Shipped in v6.2.0.** See `drydock-p2p-transfer-design.md`. Remaining work: "Send to Device" button in bike/lead photo sections, attach received files directly to entities.
- Real Supabase schema (proper tables replacing JSON blob, SQL analytics)
- Auth + user tracking (who changed what, audit trail)
- Real-time subscriptions (WebSocket replacing polling)
- Multiple photos per entity (needs file storage, not base64 in localStorage)
- Activity timeline (full audit log view)
- Listing generator (auto-compose marketplace posts from bike data)
- Parts inventory (cross-bike parts tracking and reorder alerts)
- Jarvis integration (slide-out chat panel, configurable server URL, WebSocket for autonomous messages)
- Sensor API endpoint integration (Jarvis reads Drydock data from Supabase)


## Branding

Identity: mech stencil D mark, amber on near-black palette.
Typography: Orbitron 800 for display / Share Tech Mono for data.
Design language: square linecaps, no curves in mark, angular elements.
Status colors: green (complete/synced), amber (warning/active), red (error/overdue), cyan (watching/info), purple (unverified/triage).
