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
- Export one editable **PPTX** with TODAY and TOMORROW diagrams, numbered step lists, an executive summary and step-level ScreenTips including work/wait hours, without per-step appendix slides. Very long entries continue onto further slides.
- Export/import project JSON with both flows; old version 1 single-flow JSON is imported as TODAY and copied to TOMORROW

## Process hours and cumulative HTML hover (v1.10)

- **Interactive HTML**: above each TODAY/TOMORROW process, the live indicator shows **elapsed hours through the hovered step / total estimated elapsed process hours**. For example `120 / 300 h`, updating to `135.2 / 300 h` as the pointer moves. The indicator updates for keyboard focus and resets to `0 / total` when the pointer leaves a step.
- Each process also displays **total work hours** and **total waiting hours** across all its activities. Those summed hours can exceed elapsed hours if work runs in parallel.
- The numerator comes from each step's completion time in the dependency graph: **maximum predecessor finish + the step's work hours + its waiting hours**. The denominator is the maximum finish of any step. These figures are *estimates*, not progress measurements or resource-constrained schedules.
- **PowerPoint**: TODAY and TOMORROW diagram slides each display elapsed process hours, total work hours and total waiting hours. The executive overview also shows those totals for both processes. No step-by-step timing hover bar is added to PPTX; the ScreenTips continue to show per-step hours.
- Missing durations contribute zero in this estimate; users should populate all relevant step estimates before interpreting the totals.

## PowerPoint ScreenTips instead of step-detail slides (v1.9)

- Each numbered node in the TODAY and TOMORROW diagrams has a native PowerPoint hyperlink ScreenTip. Hover to see a short step summary: title, department, responsible role, system/application, activity type, work hours and waiting hours. Remaining space includes inputs, outputs, description and prerequisites where possible.
- The hover link targets the same diagram slide so clicking a numbered node does not navigate away. In numbered step lists, linked step names navigate to the relevant flow diagram and show a ScreenTip.
- **No per-step appendix slides** and no multi-slide lists of individual changes. Keep the two flow diagrams, the numbered step list (which may paginate for larger flows), and the executive comparison overview.
- Native PowerPoint ScreenTips are compact plain-text tooltips; text may be shortened to fit. Full step information remains in the standalone interactive HTML export and editable JSON source.
- Some viewers, including browser previews, may not display hyperlink ScreenTips. Test in desktop PowerPoint (especially on Mac) for the desired hover behaviour.

## Complete HTML and PowerPoint step records (v1.8)

- **Interactive HTML**: hover over a numbered step to see its department, description, estimated work hours and waiting hours. Clicking shows a detailed, searchable record including owner, system/application, activity type, inputs, outputs, work hours, waiting hours, combined work+wait, description and prerequisite steps. Missing values are identified rather than inferred.
- **PowerPoint**: preserves TODAY and TOMORROW diagrams, numbered legend and process-improvement summary. Provides compact hover ScreenTips on each numbered flow step and step-list entry instead of per-step appendix slides. Full, unabridged values remain in HTML and JSON.
- Every hour figure is a user-entered estimate. Combined work+wait is an individual step total, **not** elapsed end-to-end workflow duration, especially with parallel paths.
- All fields are preserved in the JSON project model. ScreenTips are plain text and may abbreviate lengthy values.

## Automatic ELK layout (v1.7)

Select **Layout → ELK automatic** in the editor to use the Eclipse Layout Kernel's layered graph ordering, or **Standard** for the original reliable layout. ELK.js loads only when needed. The process remains left-to-right and each step remains in its assigned department swimlane; ELK determines the order of parallel nodes within each lane and stage. It does not change step IDs, dependency links or the editable JSON schema.

- Preview re-runs the calculation when the process changes and shows **Arranging…** until ready.
- PNG, editable PPTX, and standalone interactive HTML exports compute the selected ELK layout afresh so they match the current data.
- If ELK cannot load, the browser shows the standard layout and reports the problem. Exports in ELK mode report errors rather than silently generating a mismatched output.
- The ELK projection deliberately preserves fixed swimlanes and graph stages. It is not unrestricted free-form ELK placement, and remaining connector crossings are possible.

## Parallel route channels and presentation summary (v1.6)

- Orthogonal connectors now use separate midpoint tracks for *unrelated* parallel branches in the same column gap. Connected split/join branches keep shared trunks, and coincident strokes are still merged before drawing. This is a lightweight deterministic router, **not** the full ELK.js engine.
- All three diagram outputs (live SVG, offline HTML, and PNG/PPTX export) use the same connection routing logic.
- PowerPoint keeps **slide 1: TODAY**, **slide 2: TOMORROW**, and the numbered step list next, then adds an **executive process improvement overview**.
- The overview shows process step counts, manual/automated activity counts, added/removed/moved/modified steps, changed connections, and indicative critical-path time if time estimates exist in both processes.
- Additional editable slides list named changes in manageable pages of up to 16 items. No ungrounded benefit claims or percent improvements are inserted.

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
