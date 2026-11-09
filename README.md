# FlowChain Studio

React/Vite department swimlane flow editor for modelling workflows such as TAIJU's tender-to-delivery data flow.

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
A JSON object with `version`, `title`, `subtitle`, `departments: [{id,name}]`, and `steps: [{id,name,description,departmentId}]`.
The order of the steps array is the process sequence. The order of the departments array is the swimlane order. Both are independent.

## Status
Initial prototype. No backend required. Files remain in your browser unless exported as JSON.
