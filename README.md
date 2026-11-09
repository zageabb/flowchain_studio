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

## v1.12.4 · Repeat groups visible and manageable

- **Fixed a live-editor binding bug:** the current flow's group metadata was saved but omitted from the objects passed to the repeat controls and React diagram. The editor now passes each TODAY/TOMORROW flow's `groups` to both components. This is why previously exported HTML could show a repeat while the application showed no square wave or group editor.
- The Steps sidebar now has a clearly labelled **REPEAT GROUPS (N)** section with every saved group, its original step numbers, editable name and repetition count. **Locate** selects its first step; **Hide wave**/**Show wave** controls the connector annotation; **Remove** asks for confirmation and deletes only the repeat metadata, preserving all original steps and links. **Save template** remains available.
- The standalone HTML export uses its own renderer. It already renders original numbered steps and a repeat connection with group metadata, and is verified independently. Old downloaded HTML files are snapshots; export a **new** HTML after updating.
- Repeat annotations are placed only on a real dependency between steps in the selected group. When there is no internal dependency, the group card warns about the missing connection.

## v1.12.3 · Repeat annotation between original numbered steps

- **Fixed the missing numbered steps**: repeat groups no longer replace steps 4 and 5 (or any other selected steps) in the editor, interactive HTML, PNG or PPTX process diagrams. Every original step circle and its existing number remains visible.
- The **full-height square wave is attached to a real dependency between selected steps**, with the same solid/dotted styling as the process. The `×N` label shows repeat count above the connection.
- Wave hover information provides **iteration sublabels** such as `4.1 → 5.1`, `4.2 → 5.2`, without creating duplicate steps or changing source IDs/numbering.
- The HTML viewer preserves individual step hover information and repeat-adjusted cumulative estimates. Repeated step records remain visible in the process timeline.
- Existing v1.12.2 project JSON is compatible: stored group metadata continues to identify the relevant steps. **The browser's saved project is local to each site/origin**; importing an HTML file does not update another site's FlowChain editor. If one view has a repeat and another does not, load the same JSON project on both.

## v1.12.2 · Full-height square-wave repeat connections

- Repeated steps are visualised as **multiple full-height vertical strokes**, staggered horizontally and joined at alternating top/bottom ends like a square wave, on the connection joining the original steps.
- The repeat connector uses the **same solid or dotted line style** as its flow. The repeat count appears as **×N** above the connection, with no separate boxed object or step number.
- Each repetition produces a vertical traversal where space permits; at large repeat counts the view is capped at 12 columns and retains the exact ×N label for readability.
- Actual dependency links connect to the square-wave endpoints, avoiding the detached miniature zigzag. Live, HTML, PNG and editable PowerPoint diagrams share the geometry. Click the repeat connection in the live editor or offline HTML for the underlying subprocess.
- The original process structure, repeat-aware estimates and unchanged numbered source steps remain intact.

## v1.12.1 · Zigzag repeat connector

- Collapsed repeated subprocesses are shown as an **unnumbered zigzag in the connecting line** between the surrounding numbered steps, rather than as a dark boxed node.
- The exact repeat count appears as **×N** above the zigzag. Up to 12 zigzag teeth are drawn individually; higher counts keep a readable symbolic zigzag while the ×N label remains exact.
- Click the zigzag to expand the original steps. Source IDs, source step numbering, process timing, templates and underlying dependencies remain unchanged.
- The live diagram, interactive HTML viewer, PNG and editable PowerPoint all use the same zigzag symbol.

## v1.12 · Reusable subprocesses and repeated actions

- **+ Group / Repeat steps** in the Steps sidebar creates a named subprocess from a contiguous range of existing step numbers. Enter a repeat count (1–1000). The source activities **are not cloned or renumbered**; their original IDs, descriptions, responsibility, dependencies and other details remain editable.
- **Collapsed repeat object**: the process diagram shows one unnumbered zigzag connector (×N) instead of displaying the grouped steps individually. Click the block to expand its original steps. Change the repeat count, rename, expand/collapse or ungroup from the sidebar.
- **Save template** stores a reusable subprocess in the current browser. **Insert template** appends a copy with fresh step IDs and preserved internal dependencies; new steps are numbered normally and can be edited. Template storage is browser-local, not shared between devices. Export JSON for portable process backups.
- **HTML, PNG and PowerPoint** use the collapsed repeat object on flow diagrams. HTML retains all original steps in its step list and provides group hover/click details. PowerPoint uses one compact ScreenTip for the repeat block; no additional repeat-detail slides.
- **Timing**: each repeat is modelled as another serial pass through the group's longest internal dependency path. Total work and waiting hours multiply by the repeat count independently. This is an *estimate*: different durations per repetition, concurrent repetition, rework probability and conditional early exits are not modelled.
- Grouping refuses a range whose dependencies exit and later re-enter the same group. Each original step can belong to at most one group. The JSON remains version 2, now with optional `flows.today.groups` and `flows.tomorrow.groups` metadata.
- **Step numbering** remains on the original step records; the collapsed zigzag is intentionally **unnumbered**. The timeline uses one unnumbered repeat bar when repetitions affect elapsed time.

## v1.11 · Timeline and critical path analysis

- The application includes a **Show timeline** control with separate TODAY and TOMORROW dependency-based timelines. Each bar starts at the earliest permitted time; bars are red when their total float is zero and slate otherwise. Click or keyboard-select a bar to edit that step.
- The timing engine uses an earliest-start forward pass and latest-start backward pass to calculate earliest start, earliest finish, latest start, latest finish and total float for every activity. Multiple parallel critical paths are supported.
- The **standalone interactive HTML** contains both timeline diagrams. Clicking a timeline bar opens the step details and shows early/late timing, total float and critical status.
- The **editable PowerPoint** has a process timing comparison slide with elapsed hours, total work, waiting time, one representative critical path and counts of zero-float activities.
- These are indicative effort/duration estimates. Missing durations are treated as zero. The engine assumes dependencies alone determine start times; it does not include staff capacity, resource leveling, working calendars or dates.

## Visible release version (v1.10.1)

- The application header now shows **FlowChain Studio v1.10.1**, with its number taken directly from the `version` field in `package.json`; the browser tab displays the same version.
- Standalone interactive HTML includes the release version in its page title and heading.
- Exported PowerPoint document metadata and diagram/summary footer text identify the release that generated the file.
- Version numbers follow the package version, not the process document revision. Future releases should bump `package.json` to update the displayed number.

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
