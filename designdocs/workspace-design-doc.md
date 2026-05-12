# Workspace - Application Design Document

Version: 1.0
Last updated: May 11, 2026
File: workspace.html


## What It Is

Workspace is a spatial canvas tool for organizing projects, code architecture, and work tasks as draggable node cards with connections between them. It's a schematic editor - not a list, not a kanban board, but a freeform 2D map that mirrors how you actually think about systems. It lives alongside Drydock as a separate page in the same authenticated multi-page app, sharing the same Supabase project and login session.

The core insight behind it: the problem with starting work isn't not knowing what to do - it's not being able to cross the gap between seeing the map and moving your feet. Workspace addresses this with focus mode, session memory, task decomposition, and daily intention setting.


## Architecture

### Deployment

Single HTML file (`workspace.html`) deployed to GitHub Pages alongside the rest of the Drydock project. Uses React via Babel standalone (CDN) for the canvas rendering. Shares the same auth system, nav bar, and Supabase project as Drydock.

```
Moto-tracker/
  workspace.html    This file
  index.html        Shared login
  app.html          Drydock (linked via nav)
```

### Tech Stack

React (via CDN Babel transform) inside a single HTML file. No build step - workspace.html is edited and deployed directly, unlike app.html which compiles from source modules.

Canvas rendering uses absolute-positioned div nodes on a pannable/zoomable surface. Connections render as SVG lines in an overlay. All interaction (drag, select, connect, zoom, pan) is handled through React state and mouse/touch event handlers.

### Data Storage

Each notebook stores its data in localStorage under key `ws-nb-{notebook_id}`. Cloud sync uses the Supabase `notebooks` table (separate from Drydock's `sync` table - intentionally decoupled so Drydock data migrations don't affect workspace data).

Sync mechanics mirror Drydock: 2-second debounced push on every save, pull on load, 15-second polling interval, instant check on tab focus, auto-accept remote changes when no local edits pending.

### Auth

Same session as Drydock. Auth token stored in localStorage under `drydock_auth`. No valid session redirects to `index.html`. Role gating wired through shared `getRole()` and `canAccess()` functions - owner and employee roles can access workspace, customer role cannot.


## Notebooks

Multiple independent canvases, each with its own nodes, connections, and sync row. Designed for context separation (e.g., WildWorks brain vs personal projects brain).

### Data Model

```
Notebook list (localStorage: ws-notebooks):
[{ id: "default", name: "Personal", color: "#64748b" }, ...]

Active notebook (localStorage: ws-active-nb):
"default"

Per-notebook data (localStorage: ws-nb-{id}):
{
  nodes: [{
    id, x, y, w, h,
    title, notes, color,
    tasks: [{ id, name, done, blocked, blockedReason }],
    log: [{ id, ts, text }],
    lastSession: { ts, duration, taskName, microStep, exitNote },
    collapsed: false
  }],
  connections: [{ from: nodeId, to: nodeId, label: "" }],
  groups: [{ id, name, nodeIds: [], color }],
  dailyIntention: { date: "YYYY-MM-DD", text: "" },
  momentum: { tasksToday: 0, focusMinutes: 0 },
  camera: { x, y, zoom }
}
```

### Notebook Management

Nav bar shows notebook tabs next to page links. Active notebook highlighted with its color. "+" button creates a new notebook (prompts for name, auto-assigns color from a preset palette). Switching notebooks saves current state, updates `ws-active-nb`, and reloads with the new notebook's data.

Migration: old `ws-v7` localStorage data (from before notebooks existed) auto-migrates to the default notebook on first load.

Cloud sync: each notebook syncs independently to its own row in the `notebooks` table using `ws-nb-{id}` as the row ID. Notebook list itself also syncs so notebooks appear on all devices.


## Canvas

### Nodes

Draggable cards on the canvas. Each node has:

- Title (editable inline)
- Notes (expandable textarea)
- Color (configurable via color picker - tap the dot icon on a selected node, row of swatches appears)
- Tasks (checkable list with blocked/unblocked state)
- Work log (timestamped entries, same format as Drydock's rLog)
- Last session indicator (from focus mode - shows "Last: 12m on Fix event handler" + exit note)
- Collapse toggle (shrinks to title-only for overview)

Node sizing is automatic based on content, with minimum width. Nodes can overlap. Z-ordering follows selection (selected node comes to front).

### Connections

Directional lines between nodes rendered as SVG in an overlay layer.

Visual style: solid lines with animated flowing dashes (marching ants from origin to destination at 0.8s loop). Origin end has a circle dot, destination end has an arrowhead triangle. Line thickness 2.5px at 90% opacity. Faint solid track underneath so the path is visible even behind nodes.

Creating: click first node (becomes "from"), click second node (becomes "to"). Connection direction follows click order.

Labels: click any connection line to open an inline label editor at the midpoint. Labels render with a dark background pill for readability against the grid. Labels persist and sync.

Deleting: Shift+click a connection to delete it.

### Camera

Pan: click and drag on empty canvas space.
Zoom: scroll wheel or pinch gesture. Zoom level persists in notebook data.
Camera position persists across sessions.

### Multi-Select and Groups

Shift+click nodes to multi-select (amber border highlight). Selected nodes can be dragged together, grouped, or bulk-operated on.

Groups: named collections of nodes. Visual treatment TBD but data model supports it with `groups: [{ id, name, nodeIds, color }]`.


## Focus Mode

The core productivity feature. Select a node, trigger focus (keyboard shortcut or button), and everything else disappears. No panel, no other nodes, no canvas. Just:

- The node name
- Its ready (unblocked, incomplete) tasks
- The first ready task highlighted as THE thing
- A quiet timer counting up
- A single text field: "What's the first physical action?" for a micro-step entry

The micro-step is intentionally tiny ("Open the file." "Read the function signature." "Set a breakpoint.") so there's nothing to build anticipatory pressure around. The timer isn't for productivity measurement - it's evidence. When the internal resistance says "you can't do this," the timer shows you've been doing it for 14 minutes.

### Session Memory

On exit (Escape key), focus mode saves a snapshot:

```
{
  ts: timestamp,
  duration: seconds,
  taskName: "Fix event handler",
  microStep: "Set breakpoint in onClick",
  exitNote: "left off debugging event firing in editor"
}
```

The exit note field ("Where you left off...") saves context so the morning rebuild takes seconds instead of 30 minutes of re-reading code. Node cards show the last session summary on the canvas: "Last: 12m on Fix event handler" + exit note in italics.

Sessions persist in notebook data and sync to cloud.


## Daily Intention

On first open each day, a simple overlay asks: "What's the one thing today?" Single text field, not a list. The intention pins below the top bar for the rest of the day as an ambient anchor. Click the pinned text to edit/update it. Skip button if you don't want to set one. Persists per-day in notebook data.


## Momentum Strip

Thin green bar along the bottom of the screen that fills as you complete tasks and log focus time during the day.

Formula: `tasks_done_today * 12% + focus_minutes * 2%`, capped at 100%.

Ambient - always visible without clicking anything. No streaks, no points, no gamification. Just a quiet indicator that you've been making progress.


## Decompose Tool

Two-mode tool for breaking work down into spatial nodes. Accessed via `d` key or "decompose" button in the top bar.

### Mode A: Manual (No API)

Left panel: paste ticket text, design doc, or any description of work.

Workflow:
1. Highlight a chunk of text in the left panel
2. Click "selection -> node" - that text becomes a node's notes in the right panel
3. Name the node, add tasks with "+ task" button
4. Repeat for each component you identify
5. "+ blank" button for components you know about but aren't in the text
6. "Place N nodes on canvas" drops everything onto the current view with connections wired

Numbered step labels guide the flow. Button flashes red if you click "selection -> node" without highlighting text first. New nodes auto-focus the title input.

### Mode B: Claude-Assisted (Requires API Key)

Uses the Claude API key already stored in the Drydock app data.

Workflow:
1. Paste ticket + optional context ("what do you already understand?")
2. Conversational: Claude proposes a systems schematic (components, data flow, dependencies - not a project plan)
3. Refine over 2-3 exchanges
4. Say "place" and Claude outputs JSON that becomes nodes with tasks and connections
5. Nodes preview at the bottom before final placement

System prompt instructs Claude to think in components and data flow, not task lists. First task on first component must be completable in under 2 minutes (matching the micro-step philosophy).

### Both Modes

Escape to close with confirm dialog if work in progress: "Discard decompose work?" with discard / keep working options.


## Relationship to Drydock

Workspace and Drydock are sibling pages in the same authenticated app, linked via a shared nav bar. They share:

- Login session (same `drydock_auth` localStorage key)
- Supabase project (same URL and anon key)
- Role system (same `getRole()` / `canAccess()` functions)
- Nav bar (Drydock | Workspace links, sign out button)

They do NOT share:

- Data storage (Drydock uses `sync` table, Workspace uses `notebooks` table)
- Data model (completely independent schemas)
- Source code (Drydock has a build system, Workspace is a single file)

This separation is intentional. Drydock's planned migration to proper Supabase tables won't affect workspace data. Different access controls can be applied independently. A customer seeing their job status never sees the workspace. An employee could potentially have workspace access scoped to specific notebooks.


## Supabase Table

```sql
CREATE TABLE notebooks (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read" ON notebooks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth write" ON notebooks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth update" ON notebooks
  FOR UPDATE USING (auth.role() = 'authenticated');
```


## Design Language

Workspace uses a blue-tinted palette to visually distinguish from Drydock's amber. The nav bar highlights the current page in its respective color (amber for Drydock, blue for Workspace).

Canvas background: dark grid on near-black. Node cards: dark surface with lighter text. Connections: colored lines with animated flow direction. Focus mode: stripped-down dark overlay, timer in monospace, minimal UI.


## Upcoming / Planned

- Jarvis integration: the workspace becomes the knowledge layer for Jarvis. Claude (via API or Jarvis server) can see the full node graph - nodes, connections, tasks, block reasons, focus session history, exit notes - and answer questions like "what did I work on last week," "what's upstream of this component," or "I'm stuck on this node, what am I missing." Grounded in structured spatial data, not conversation transcripts.

- Enhanced group management: visual treatment for groups on the canvas (colored boundaries, collapse to summary), group-level operations (move all, export, archive).

- Search: find nodes by title, task name, or log content across notebooks.

- Templates: save a node configuration (with tasks and structure) as a reusable template for common project patterns.

- Mobile improvements: touch-optimized canvas interactions, responsive layout for phone use (currently desktop-primary).
