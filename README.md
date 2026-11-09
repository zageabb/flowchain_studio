# FlowChain Studio

React/Vite department swimlane flow editor for modelling workflows such as TAIJU's tender-to-delivery data flow.

## Interactive HTML export (offline, read-only)

Click **Export Interactive HTML** to download a single self-contained HTML file. It requires no server, network access, React runtime, or external asset files. Open it in Chrome, Safari or Edge.

- Switch between TODAY, TOMORROW, or both diagrams
- Fit-to-width, zoom in/out and Ctrl+wheel zoom; drag empty canvas space to pan
- Hover over numbered steps for a summary; click a step to see its full details and predecessors
- Search the numbered step lists and independently minimise each diagram
- HTML output is read-only and includes an embedded snapshot of the project (do not share sensitive process details publicly)

## Editor and analysis enhancements

- **Undo / Redo** toolbar actions, including Ctrl/Cmd+Z and Ctrl/Cmd+Y when not editing a text field
- **Connect steps** mode: choose a source numbered step and click the destination, with circular-dependency protection
- Zoom controls and fit-width mode for the editor diagrams
- Named browser-local process snapshots (up to 12) with save, restore and delete. Export JSON for portable backups.
- Comparison highlights added (green), removed (grey), and changed (amber) numbered steps while comparison is visible
- TODAY vs TOMORROW change summary: added, removed, reordered/moved, details changed and prerequisites changed
- Step metadata: responsible role, system, activity type, inputs, outputs, work hours and waiting hours
- Indicative critical-path calculation based on dependencies and estimated hours. Parallel branches use the longest prerequisite. This is an estimate, not a project schedule or resource-constrained simulation.
- Structural diagnostics flag disconnected activities, multiple starts/ends, and count splits and joins.
- Removing a shared department now reassigns affected steps in both flows. Connected-step deletion previews the downstream relinking.

## TODAY / TOMORROW and exports
- Independent TODAY and TOMORROW step sequences, displayed in stacked swimlane diagrams
- Select a mode on the left, or click a diagram node, to edit that mode
- Copy TODAY to TOMORROW to initialize a proposed future process (replaces TOMORROW after confirmation)
- Diagram nodes show **numbers only**; names and descriptions remain in the editor
- Independently choose **Solid** or **Dotted** connecting lines for TODAY and TOMORROW
- **Minimise / Expand** each process diagram independently to save screen space; the left-hand step editor stays available
- Export **three separate high-resolution PNG files**: TODAY diagram, TOMORROW diagram, and a numbered step list covering both flows. The browser may request permission to download multiple files.
- Export one editable **PPTX** with slide 1 = TODAY, slide 2 = TOMORROW, slide 3 = the numbered step list for both flows. Very long lists continue on additional slides.
- Export/import project JSON with both flows; old version 1 single-flow JSON is imported as TODAY and copied to TOMORROW

## Smarter layout and new projects

- Parallel steps sharing the same department/layer now use their prerequisite positions to choose vertical ordering. This reduces avoidable crossing lines in the live view, interactive HTML and exports without changing the dependencies.
- Use **+ New blank process** beneath **Named projects / snapshots** to start a separate process.
- Use **Save snapshot** to keep each process under its own name and **Restore** to switch between saved designs. The active process is still autosaved in browser storage. Snapshot storage is browser-local; export JSON for reliable transfer or backup.
- The new layout is deterministic and not a full obstacle-avoiding routing engine; dense process maps may still need more advanced routing.

## Shared connector drawing

Parallel branches may overlap along an orthogonal trunk (for example, around steps 8–11). FlowChain merges coincident horizontal/vertical connector segments before drawing. This prevents double-weight dotted lines in the browser, exported PNGs, and editable PowerPoint slides without changing the dependency model.

## Parallel steps and joins
- Select a step and use **+ Parallel branch** to create a sibling step with the same prerequisites.
- The **Prerequisites** editor lets you select zero, one or many preceding steps. Multiple steps sharing a prerequisite execute in parallel; a step with two prerequisites joins the branches.
- Graph layout uses dependency layers, not the left-hand list order; renumbering does not change the dependency links.
- Circular dependencies are blocked. Deleting a step reconnects its downstream steps to its prerequisites.
- PNG and editable PPTX exports include parallel connections and preserve each flow's solid/dotted line style.
- JSON now contains each step's `dependsOn` (array of IDs). Older JSON without it becomes a sequential flow automatically.

## Features
- Add, rename, reorder and delete department lanes
- Add, edit, remove and reorder sequential steps
- Insert a step before or after an existing step
- Move steps earlier/later in sequence **independently** of moving up/down to another department
- Click nodes in a live SVG flow diagram to edit
- Drag steps within the ordered list
- Save to and load from JSON, with browser local autosave

## Run

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

Run `npm run build` to produce a distributable `dist/` folder.

## Data format
Version 2 JSON stores `version`, `title`, `subtitle`, shared `departments: [{id,name}]`, and `flows: {today:{steps:[...],lineStyle:'solid'|'dotted'},tomorrow:{steps:[...],lineStyle:'solid'|'dotted'}}`. Each step has `id`, `name`, `description`, `departmentId`, and `dependsOn` (list of predecessor step IDs).
The order of each flow's steps array is its process sequence. The order of the departments array is the swimlane order. Both are independent.

## Status
Active prototype. No backend required. Source-of-truth files remain in the browser until exported as JSON. Run `npm test` and `npm run build` before deploying. Browser behaviour, PowerPoint interoperability, and very large diagrams require practical testing. Advanced auto-routing (ELK.js), multiuser/server-backed projects, and end-to-end browser testing are future development phases.
