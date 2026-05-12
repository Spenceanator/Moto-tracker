# Drydock Sync System - Design Document

Version: 1.0
Date: May 11, 2026
Status: Implemented (v6.3.0)


## Problem

Drydock syncs data between devices (phone, laptop, desktop) via Supabase. The original sync system treated the entire data blob as atomic — one timestamp for everything, last-write-wins. If two devices were used between syncs, whichever saved last would overwrite the other's changes entirely, even if they edited completely different things.

Real scenario that triggered this rewrite: user spent a session on the laptop editing jobs and bikes, but the phone had a slightly newer `_ts`. On the next sync, all laptop work was silently discarded because the phone's blob timestamp was newer.


## Solution

Entity-level merge. Every entity (bike, lead, job, expense, trip, customer, sold item) gets its own `_ts` timestamp that only updates when that specific entity changes. On sync, we merge entity-by-entity — if device A edited bike #1 and device B edited bike #2, both changes are preserved.


## How It Works

### Per-Entity Timestamps (data.js)

**Snapshot diffing** detects which entities actually changed on each `save()` call.

```
save() flow:
1. Set data._ts = Date.now()  (blob-level timestamp, still used for pull trigger)
2. For each collection (bikes, leads, sold, expenses, trips, jobs, customers):
   a. JSON.stringify each entity (excluding _ts) → "snapshot key"
   b. Compare to _lastSnap[collection][entity.id]
   c. If different → entity._ts = now (this entity was modified)
   d. Update _lastSnap with new snapshot key
3. Persist to localStorage
4. Trigger syncPush()
```

This is automatic — no call-site changes needed. Any code that mutates an entity and calls `save()` will correctly stamp only the changed entities.

**`_updateSnapshot()`** rebuilds the snapshot baseline. Called:
- After `data = load()` in ui.js (initial load)
- After each successful sync merge (so the next save() diffs against post-merge state)

**Migration:** `migrate()` stamps `_ts = data._ts` (the blob timestamp) on any entity that doesn't have one. This gives pre-6.3.0 data a uniform starting point for merge comparisons.


### Merge Algorithm (sync.js)

**`mergeData(local, remote)`** produces a merged dataset from two versions:

```
For each collection (bikes, leads, sold, expenses, trips, jobs, customers):
  Build maps: localMap[id] → entity, remoteMap[id] → entity
  For each unique id across both:
    - Only in local  → keep local  (new entity created on this device)
    - Only in remote → take remote (new entity created on other device)
    - In both        → keep whichever has higher _ts
```

**Cross-collection dedup:** After merging, if an entity ID exists in `sold[]`, remove it from `bikes[]`. This handles the case where one device sold a bike while another edited it — the sale action wins.

**Activity log:** Merged by union with dedup key `ts|action|id`. Sorted by timestamp, capped at 2000 entries.

**Top-level fields:**
- `apiKey` — keep local (never overwrite from remote)
- `leadPrompt` — keep from whichever blob is newer
- `checklistTemplates` — keep from whichever blob is newer
- `vehicles[]` — merge by union (both sides' vehicles kept)


### Push Flow (_doSync)

```
_doSync() flow:
1. GET remote data from Supabase (with data + updated_at)
2. If remote exists:
   a. mergeData(local, remote) → merged
   b. Apply merged data locally (data = migrate(merged))
   c. Update localStorage
   d. Rebuild snapshot
   e. PATCH merged data to Supabase
3. If no remote: POST local data as-is
```

The key change from the old system: push now **reads** the remote before writing, and merges. This prevents the "blind overwrite" bug where pushing from device B would erase device A's un-pulled changes.


### Pull Flow (syncPull)

```
syncPull() flow:
1. GET remote data from Supabase
2. If remote._ts > local._ts (or force=true):
   a. mergeData(local, remote) → merged
   b. Apply merged data locally
   c. Update localStorage + snapshot
   d. Flash "Synced from cloud"
3. Otherwise: skip (local is newer)
```

Pull also merges now instead of replacing. Even if the remote is "newer" overall, individual entities that are newer locally are preserved.


## Edge Cases

### Two devices edit the same entity
The entity with the higher `_ts` wins. The other device's changes to that specific entity are lost. This is acceptable because:
- The merge granularity is per-entity (bike, job, lead), not per-field
- Sub-entity merge (e.g., two people editing different fields of the same bike) would require CRDT-level complexity
- In practice, Drydock is single-user across devices — simultaneous edits to the same entity are rare

### Entity moved to sold[]
When a bike is sold, it moves from `bikes[]` to `sold[]`. If the other device hasn't synced yet, it still has the bike in `bikes[]`. After merge:
- `sold[]` has the bike (from the selling device)
- `bikes[]` also has it (from the non-synced device)
- Cross-collection dedup removes it from `bikes[]`

### New entity on one device
Entity exists locally but not remotely (or vice versa). Treated as "newly created" and kept. This means you can't delete entities via sync — a deleted entity on device A will reappear when device B syncs (because B still has it).

**Future improvement:** Soft-delete with `_deleted: true` flag and a tombstone retention window.

### First sync after upgrade
Existing entities get `_ts = data._ts` (the blob timestamp) via migration. All entities start with the same timestamp. The first save() on each device builds the snapshot baseline. From the second save() onward, only actually changed entities get new timestamps.

### Offline for extended period
Device goes offline for days, accumulates many changes. On reconnect, push triggers a merge. All entities changed offline get their local `_ts` from when they were last saved. Remote entities changed on other devices keep their `_ts`. Merge picks the newer version of each entity correctly.

### Activity log divergence
Both devices generate activity entries. Since entries have millisecond-precision timestamps and are deduped by `ts|action|id`, they merge cleanly via union. Near-simultaneous entries from different devices are both preserved (different timestamps).


## Logging

All sync operations use `[SYNC]` tagged logging for the debug console:

| Log | When |
|-----|------|
| `[SYNC] Push started` | syncPush debounce fires |
| `[SYNC] Remote exists, merging before push` | Remote data found, merge happening |
| `[SYNC] No remote row, creating` | First-ever push |
| `[SYNC] Push complete` | Successful write to Supabase |
| `[SYNC] Push failed: <error>` | Network or Supabase error |
| `[SYNC] Pull started, force=<bool>` | Pull initiated |
| `[SYNC] Merging — local _ts:<n>, remote _ts:<n>` | Pull merge happening |
| `[SYNC] Pull skipped — local is newer` | No merge needed |
| `[SYNC] Pull failed: <error>` | Network or Supabase error |
| `[SYNC] Merge complete — local-only:<n>, remote-only:<n>, both:<n>` | Merge stats |

To add a `[SYNC]` filter button in the debug console, update `debug.js`:
```javascript
["all","error","warn","tf","sync"].forEach(...)
```


## Files

### Modified
- `src/data.js` — Added `_lastSnap`, `_snapCols`, `_snapKey()`, `_updateSnapshot()`. Modified `save()` for snapshot diffing. Added entity `_ts` migration in `migrate()`. Bumped `APP_VERSION` to 6.3.0.
- `src/sync.js` — Added `mergeData()`. Rewrote `_doSync()` to merge-before-push. Rewrote `syncPull()` to merge instead of replace. Added `[SYNC]` logging throughout.
- `src/ui.js` — Added `_updateSnapshot()` call after `data = load()`.

### Dependencies
- None. Pure vanilla JS, no new libraries.


## Future Improvements

1. **Soft deletes:** Add `_deleted: true` + `_deletedAt` timestamp. Filter deleted entities from UI. On merge, a delete wins if `_deletedAt > _ts` of the other side's version. Tombstones expire after 30 days.

2. **[SYNC] debug filter button:** Add to debug.js filter array for sync-specific log viewing.

3. **Conflict notification:** When merge detects both sides edited the same entity, flash a warning: "Conflict on [bike name] — kept newer version from [device]." Requires tracking which side won.

4. **Sub-entity merge:** For high-value entities like jobs (which have tasks[], log[], parts[]), merge at the sub-array level. Each task/log/part gets its own `_ts`. This prevents losing a task addition just because the other device edited a different task on the same job.

5. **Sync history:** Keep a log of recent sync events (timestamp, direction, entity counts) viewable in settings. Helps diagnose "where did my data go" situations.
