# FlowChain Studio

React/Vite department swimlane flow editor for modelling workflows such as TAIJU's tender-to-delivery data flow.

## TODAY / TOMORROW and exports
- Independent TODAY and TOMORROW step sequences, displayed in stacked swimlane diagrams
- Select a mode on the left, or click a diagram node, to edit that mode
- Copy TODAY to TOMORROW to initialize a proposed future process (replaces TOMORROW after confirmation)
- Diagram nodes show **numbers only**; names and descriptions remain in the editor
- Independently choose **Solid** or **Dotted** connecting lines for TODAY and TOMORROW
- **Minimise / Expand** each process diagram independently to save screen space; the left-hand step editor stays available
- Export combined high-resolution **PNG** with both flows
- Export editable **PPTX** with one slide per flow and native PowerPoint lines, shapes and labels
- Export/import project JSON with both flows; old version 1 single-flow JSON is imported as TODAY and copied to TOMORROW

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
Initial prototype. No backend required. Files remain in your browser unless exported as JSON.
