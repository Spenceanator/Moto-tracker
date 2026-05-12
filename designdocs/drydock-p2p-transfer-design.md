# Drydock P2P File Transfer - Design Document

Version: 1.1
Date: May 11, 2026
Status: Implemented (v6.2.0)


## Problem

Photos and video taken on the phone need to get to the PC for listing prep. Current options all fail:

- AirDrop: Apple-only, no Windows support
- PairDrop/Snapdrop: Browser tabs with no wake lock, no retry, no resume. Screen dims and the transfer dies. Connection hiccup and you start over.
- LocalSend: Not in Microsoft Store, separate app install
- Manual: Email/cloud upload is slow and adds friction every single time

Drydock already runs on both phone and PC with shared Supabase auth. It should handle this natively.


## Solution

WebRTC peer-to-peer file transfer built into Drydock as a new source module (`src/transfer.js`). Devices authenticated with the same Supabase account discover each other on the local network via Supabase Realtime presence. Files transfer directly device-to-device, never touching any server. Wake lock keeps the screen alive. Chunked transfer with acknowledgment enables resume on disconnect.


## Current App Architecture

Single HTML file (`app.html`) built from 10 JS source modules via `build.sh` (CI auto-builds on push):

```
src/
  shell_head.html       HTML wrapper, CSS, meta tags, JSZip CDN
  config.js       (44)  SB connection, auth, roles, renderNav (incl Transfer), constants, version
  data.js        (127)  fresh(), migrate(), load(), save(), logAct(), loadJobChat()
  sync.js        (277)  Chat polling, notifications, bell menu, Supabase sync, intake, job sharing
  scan.js         (40)  Receipt scan and listing scan (Claude API calls)
  ui.js           (61)  Icons SVGs, h(), ckbox(), badge(), flash(), compressImg(), CSV export, timer
  components.js  (413)  rLog, rParts, rPhotoLog, rTask, rAddTask, rIssue, rSpecs, rChecklist, rPastePanel, session calc
  views.js       (675)  rLeadView, rBikeView, rSettings, rAnalytics, rExpenses, rMileage, rJobView, rClientView
  home.js        (637)  rHome() with Today, heatmap, sessions, tasks, waiting parts
  transfer.js    (480)  P2P: device identity, broadcast discovery, WebRTC, chunked transfer, zip download, wake lock, retry, UI
  app.js          (37)  R() with input-focus guard, render routing, startup, polling, SW registration
  build.sh              Concatenates shell_head + all JS into app.html
```

Deployed files (GitHub Pages):
```
Moto-tracker/
  app.html            Built output, deployed
  workspace.html      Spatial workspace (separate tool)
  index.html          Login page
  intake.html         Customer intake form
  status.html         Customer-facing job status + chat
  manifest.json       PWA manifest
  sw.js               Service worker for background notifications
```

Existing infrastructure this feature uses:
- Supabase project with REST API (SB_URL, SB_KEY in config.js)
- Supabase auth (email/password, getAuth() in config.js)
- Supabase Realtime (already imported for sync polling)
- localStorage for all app data (key: mototracker_data)
- Service worker registered in app.js
- compressImg() in ui.js for photo handling


## Feature Requirements

### Must Have (v1)
1. Device discovery via Supabase Realtime presence channel
2. WebRTC DataChannel for direct file transfer (no server relay)
3. Chunked transfer with per-chunk acknowledgment
4. Wake lock to prevent screen sleep during transfer
5. Resume from last acknowledged chunk on disconnect
6. Retry logic with exponential backoff on connection failure
7. Progress UI showing per-file and overall transfer state
8. "Send to Device" button in bike/lead photo sections
9. Receive queue with accept/reject per transfer request

### Won't Have (v1)
- Cross-network transfers (internet/NAT traversal) - local network only
- TURN server infrastructure
- Cloud relay fallback
- Syncing transferred files to Supabase storage
- Streaming/preview during transfer
- Multi-peer transfers (one sender, one receiver at a time)


## Technical Design

### Device Identity

On first load, generate a persistent device ID and store in localStorage:

```javascript
// Key: drydock_device_id
function getDeviceId() {
  var id = localStorage.getItem('drydock_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('drydock_device_id', id);
  }
  return id;
}
```

Device name derived from user-agent parsing: "iPhone - Safari", "Windows - Chrome", "Android - Chrome". User-configurable override stored in localStorage as `drydock_device_name`.


### Discovery via Supabase Realtime Broadcast

~~Originally designed to use Supabase Realtime presence API, but the raw Phoenix WebSocket presence protocol proved unreliable without the Supabase JS SDK — presence diffs were inconsistent and re-tracking triggered rate limits (`Client presence rate limit exceeded`).~~

**Implemented: Broadcast ping/pong discovery.** Devices announce themselves via broadcast events on the same channel used for signaling. No presence API used.

```
Channel name: transfer:{user_email}

Ping broadcast (every 10 seconds):
{
  event: "ping",
  from: "device_uuid",
  fromName: "iPhone - Safari",
  fromType: "mobile"
}

Peer expiry: 30 seconds without a ping → removed from device list
```

When the transfer view opens, the device joins the channel and starts pinging. Other devices collect pings into `_tfPeers` with a `lastSeen` timestamp. Stale peers (no ping for 30s) are automatically pruned. This runs entirely on the broadcast mechanism — the same one that already works for WebRTC signaling — so discovery reliability matches signaling reliability.


### Signaling via Supabase Realtime

WebRTC requires a signaling channel to exchange SDP offers/answers and ICE candidates. Supabase Realtime broadcast events on the same channel handle this - no separate signaling server needed.

```
Broadcast events on channel transfer:{user_id}:

  offer         SDP offer from sender to specific receiver (by device_id)
  answer        SDP answer from receiver to sender
  ice           ICE candidate exchange (bidirectional)
  transfer-req  Sender requests transfer (file manifest)
  transfer-ack  Receiver accepts
  transfer-rej  Receiver rejects
  transfer-resume  Reconnected peer signals readiness to resume from chunk N
```

All broadcast events include a `to` field with the target device_id so devices can filter messages not intended for them.


### WebRTC Connection

```javascript
var rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
```

STUN only (no TURN). This means local network only for v1. Both devices behind the same router will connect directly. Cross-network would require TURN infrastructure which is out of scope.

Connection flow:
1. Sender creates RTCPeerConnection
2. Sender creates DataChannel (label: "drydock-transfer", ordered: true)
3. Sender creates SDP offer, sets local description
4. Sender broadcasts offer via Supabase Realtime
5. Receiver creates RTCPeerConnection, sets remote description from offer
6. Receiver creates SDP answer, sets local description
7. Receiver broadcasts answer via Supabase Realtime
8. Both sides exchange ICE candidates via broadcast
9. DataChannel opens, transfer begins


### Chunk Protocol

```
Chunk size: 64KB (65536 bytes)

Sender -> Receiver (per chunk):
{
  type: "chunk",
  fileIndex: 0,
  chunkIndex: 42,
  totalChunks: 65,
  fileName: "IMG_001.jpg",
  fileSize: 4200000,
  fileType: "image/jpeg",
  data: ArrayBuffer
}

Receiver -> Sender (per chunk ack):
{
  type: "ack",
  fileIndex: 0,
  chunkIndex: 42,
  status: "ok"
}

Sender -> Receiver (transfer complete):
{
  type: "done"
}
```

Sender waits for ack before sending next chunk. This creates backpressure and prevents buffer overflow on slower devices. If ack doesn't arrive within 5 seconds, sender retransmits the chunk (up to 3 retries before treating as disconnect).

Binary data encoding: chunks sent as ArrayBuffer over the DataChannel. Metadata messages (type, fileIndex, etc.) sent as JSON strings on the same channel. Receiver distinguishes by checking if the incoming message is a string (JSON metadata) or ArrayBuffer (chunk data).

Actual wire format per chunk:
1. Sender sends JSON string: `{ type: "meta", fileIndex, chunkIndex, totalChunks, fileName, fileSize, fileType }`
2. Sender sends ArrayBuffer: the raw chunk bytes
3. Receiver pairs the most recent meta with the next ArrayBuffer it receives
4. Receiver sends JSON string: `{ type: "ack", fileIndex, chunkIndex, status: "ok" }`


### Transfer Request Flow

Before any WebRTC connection, the sender requests permission from the receiver via Supabase Realtime.

**Note:** The transfer-req is sent as a lightweight broadcast (file count + total size + first 5 file names as preview). The full file manifest is too large for WebSocket broadcast when sending many files (30+ photos/videos would exceed Supabase's broadcast message size limit and silently drop). The full manifest is sent over the DataChannel after the WebRTC connection is established.

```
transfer-req payload (lightweight, via WebSocket broadcast):
{
  from: device_id,
  fromName: "iPhone - Safari",
  fileCount: 28,
  totalBytes: 1600000000,
  preview: ["IMG_001.jpg", "IMG_002.jpg", "IMG_003.jpg", "IMG_004.jpg", "IMG_005.jpg"]
}

Full manifest (sent over DataChannel after connection):
{
  type: "manifest",
  files: [
    { name: "IMG_001.jpg", size: 4200000, type: "image/jpeg" },
    ...all files
  ]
}
```

Receiver sees a prompt: "iPhone - Safari wants to send 28 files (1.5 GB). [first 5 names shown, '...and 23 more']  Accept / Reject"

On accept, receiver broadcasts `transfer-ack` and both sides begin the WebRTC handshake. On reject, receiver broadcasts `transfer-rej` and sender sees "Transfer declined."


### Resume State

Persisted in localStorage so a page refresh or disconnect can resume:

```json
// Key: drydock_transfer_state
{
  "id": "uuid",
  "direction": "send|receive",
  "peerDeviceId": "...",
  "files": [
    {
      "name": "IMG_001.jpg",
      "size": 4200000,
      "type": "image/jpeg",
      "chunksCompleted": 42,
      "totalChunks": 65
    }
  ],
  "startedAt": "ISO timestamp",
  "lastChunkAt": "ISO timestamp"
}
```

On reconnect:
1. Device rejoins presence channel
2. Detects saved transfer state in localStorage
3. Broadcasts `transfer-resume` with the file index and chunk number to resume from
4. Peer acknowledges and both re-establish WebRTC
5. Transfer picks up from the last acked chunk

If the peer doesn't respond within 30 seconds of the resume broadcast, the transfer state is cleared and the user is notified.


### Wake Lock

```javascript
var wakeLock = null;

function acquireWakeLock() {
  if ('wakeLock' in navigator) {
    navigator.wakeLock.request('screen').then(function(lock) {
      wakeLock = lock;
      lock.addEventListener('release', function() { wakeLock = null; });
    }).catch(function(e) {
      console.warn('Wake lock failed:', e);
    });
  }
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}
```

Acquired when transfer begins (after accept). Released when transfer completes or is cancelled. Progressive enhancement - works in Chrome/Edge, limited support in Safari/Firefox. Transfer still works without it, just risks screen sleep on long transfers.

Visibility change handler re-acquires if the lock was released by the browser:

```javascript
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && transferInProgress && !wakeLock) {
    acquireWakeLock();
  }
});
```


### Retry and Reconnection

Three levels of retry:

1. Chunk retry: No ack within 5 seconds, resend same chunk. 3 attempts max.
2. Connection retry: DataChannel closes unexpectedly. Exponential backoff (2s, 4s, 8s, 16s) up to 4 attempts. Re-establish WebRTC from the signaling step. Resume from last acked chunk.
3. Full reconnect: Both devices lost presence. On rejoin, check localStorage for transfer state, broadcast resume request.

ICE connection state monitoring:

```javascript
pc.oniceconnectionstatechange = function() {
  if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
    startReconnect();
  }
};
```


### Receiving Files

Receiver accumulates chunks per file in memory (array of ArrayBuffers). When all chunks for a file arrive, they're assembled into a Blob.

**Download packaging:** When multiple files are received (2+), they are bundled into a timestamped zip file using JSZip (loaded from CDN: `cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js`). The zip is named `drydock-transfer-YYYY-MM-DD_HHMMSS.zip` and triggered as a single browser download. Single files download directly without zipping. This avoids Chrome's mass-download throttling which silently blocks rapid sequential `a.click()` downloads (observed: 28 files selected, only 11 downloaded).

**Completion card:** After transfer completes, a dismissible card shows the result — direction (sent/received), peer name, total size, file list with individual sizes, and a note about download location ("Saved as a zip file in your Downloads folder"). A notification sound plays on completion.


## UI Design

Match existing Drydock aesthetic: amber (#f59e0b) on near-black (#111), Orbitron 800 for headers, Share Tech Mono for data, square linecaps, angular elements.

### Transfer View (new nav entry)

Top section: "Nearby Devices" header with a scanning animation (rotating radar sweep or pulsing dots). Lists discovered devices as cards:

```
+---------------------------------------+
|  [phone icon]  iPhone - Safari        |
|  Online now                           |
|                          [Send Files] |
+---------------------------------------+
|  [desktop icon]  Windows - Chrome     |
|  Online now                           |
|                          [Send Files] |
+---------------------------------------+
```

Bottom section: "Transfer History" - recent transfers with timestamp, file count, total size, status (completed/failed/cancelled).

### Progress UI

Full-width segmented progress bar (industrial/mechanical feel - discrete blocks filling rather than smooth gradient):

```
Sending to Windows - Chrome
IMG_001.jpg  [################--------]  67%  2.8/4.2 MB
IMG_002.jpg  [------------------------]  waiting
Overall      [########----------------]  35%  2.8/8.0 MB

[Cancel]
```

### "Send to Device" Button

Appears in the photo section of bike and lead detail views (inside `rPhotoLog` in components.js) when at least one other device is discovered on the presence channel. Tapping it enters a file picker to select which photos to send, then initiates the transfer request.

### Incoming Transfer Prompt

Modal overlay:

```
+---------------------------------------+
|                                       |
|  iPhone - Safari wants to send        |
|  2 files (7.6 MB)                     |
|                                       |
|  IMG_001.jpg  (4.2 MB)               |
|  IMG_002.jpg  (3.4 MB)               |
|                                       |
|  [ Reject ]          [ Accept ]       |
+---------------------------------------+
```


### Device Chat

A simple text chat between connected devices, built on the same Supabase Realtime broadcast channel used for discovery and signaling. Primary use case: copy debug logs on the phone, paste into chat, read on PC, paste into Cowork for analysis.

```
Broadcast event: chat-msg
{
  event: "chat-msg",
  from: "device_uuid",
  fromName: "iPhone - Safari",
  text: "message content",
  ts: 1715443200000
}
```

**State:** `_tfChatMsgs` array, max 100 messages. Session-only (not persisted to localStorage). Messages include timestamp, sender device ID, sender name, and text content.

**UI:** Chat section appears at the bottom of the transfer view when the channel is connected. Features:

- Scrollable message list with sender-aligned bubbles (own messages right, others left)
- Textarea input with Send button (works with the input-focus guard so typing isn't interrupted)
- "Paste Logs" button: one-tap to dump the last 50 filtered debug console entries into the chat
- "Copy All" button: copies entire chat history to clipboard
- "Clear" button: empties the chat

**Debug log dumps** are rendered in a smaller monospace font with a scrollable container inside the chat bubble, so large log pastes don't overwhelm the view.

**No WebRTC required:** Chat messages go through the Supabase Realtime broadcast, same as pings and signaling. This means chat works as soon as both devices are on the transfer view — no file transfer or WebRTC connection needed.


## Files Affected

### New
- `src/transfer.js` (~940 lines) - All P2P logic: device identity, Supabase Realtime broadcast discovery (ping/pong), WebRTC signaling, DataChannel connection management, chunk protocol with ack, manifest exchange over DataChannel, zip packaging of received files (JSZip), resume state, wake lock, retry logic with exponential backoff, device chat (broadcast-based text messaging with debug log dump), comprehensive `[TF]` diagnostic logging, transfer view UI, progress components, completion card, incoming transfer modal, chat UI.
- `src/debug.js` (~140 lines) - On-screen debug console. Intercepts console.log/warn/error, 500-entry ring buffer, triple-tap nav bar to toggle, filter buttons (ALL/ERROR/WARN/[TF]), copy to clipboard, clear, unhandled error capture. See `drydock-debug-design.md` for full details and instrumentation guide.

### Modified
- `src/shell_head.html` - JSZip CDN script tag. iOS safe area fix: nav bar `padding-top:var(--safe-top)`, `height:calc(40px + var(--safe-top))`, app container matching padding. Previously the fixed nav sat under the iOS notch.
- `src/config.js` - Transfer nav button in `renderNav()`. Uses inline navigation (`cv="transfer";...;R()`) to avoid scoping collision with local `var nav` DOM element.
- `src/data.js` - Version bump to 6.2.0.
- `src/app.js` - Transfer view route in `R()`. Input-focus guard: `R()` defers re-render when an input/textarea/select is focused (prevents text erasure from background sync/poll). `R(true)` forces through. `focusout` listener fires deferred render. Channel join on startup, leave on `beforeunload`.
- `src/ui.js` - `nav()` calls `R(true)` for forced render on explicit navigation.
- `build.sh` - Added `debug.js` as first entry and `transfer.js` between `home.js` and `app.js` in FILES array.

### Not modified (deferred to future)
- `src/components.js` - "Send to Device" button in `rPhotoLog` not yet implemented.
- `src/views.js` - No changes needed; transfer view route handled in `app.js`.


## Supabase Changes

No new tables required. Realtime presence and broadcast work on ephemeral channels without any database backing. The existing Supabase project just needs Realtime enabled (which it already is for sync polling).

Verify in Supabase dashboard: Project Settings > API > Realtime > Enabled. No additional configuration needed.


## Build Order

1. Device identity + presence discovery (localStorage device ID, Supabase Realtime presence, discovery UI)
2. Signaling (SDP offer/answer exchange, ICE candidate relay via Supabase broadcast)
3. Basic transfer (WebRTC DataChannel, chunked send/receive with ack, progress UI)
4. Wake lock (acquire on transfer start, release on end, re-acquire on visibility change)
5. Resume/retry (persist chunk state to localStorage, detect disconnect, reconnect and resume from last ack)
6. Integration (wire into bike/lead photo views, "Send to Device" button, attach received files to entities)


## Testing Plan

Step 1-2 can be validated with console logs on two browser tabs on the same machine (both authenticated to Supabase). Steps 3-6 need two actual devices on the same wifi - phone and PC.

Quick smoke test per build step:
1. Open app on two devices, both see each other in the transfer view
2. One device creates an offer, other receives it, ICE candidates exchange, DataChannel opens
3. Send a small file (single photo), verify it arrives intact. Send 10+ photos, verify all arrive
4. Start a multi-file transfer, lock the phone screen, verify transfer continues
5. Mid-transfer, toggle airplane mode on the phone for 5 seconds, verify transfer resumes
6. From a bike's photo section, tap "Send to Device", select photos, verify they arrive and can be attached to the same bike on the receiving device
