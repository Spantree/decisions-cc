# decisionapp

A standalone React component for [Pugh decision matrices](https://en.wikipedia.org/wiki/Decision-matrix_method) — weighted multi-criteria comparison tables with interactive scoring, color-coded cells, and dark mode support.

## Install

Install directly from GitHub (no registry required):

```bash
npm install Spantree/decisionapp
```

Pin to a specific commit or tag:

```bash
npm install Spantree/decisionapp#v0.1.0
npm install Spantree/decisionapp#abc1234
```

Peer dependencies — bring your own:
- `react` 18+
- `react-dom` 18+
- `@radix-ui/themes` 3+

`zustand` is a regular dependency and is installed automatically.

## Quick start

PughMatrix always reads its data from a Zustand store. Create a store with `createPughStore`, pass it to `PughStoreProvider`, and render `PughMatrix` inside the provider:

```tsx
import { PughMatrix, createPughStore, PughStoreProvider } from 'decisionapp';
import 'decisionapp/styles.css';
import '@radix-ui/themes/styles.css';

const store = createPughStore({
  criteria: [
    { id: 'cost', label: 'Cost' },
    { id: 'speed', label: 'Speed' },
    { id: 'quality', label: 'Quality' },
  ],
  tools: [
    { id: 'option-a', label: 'Option A' },
    { id: 'option-b', label: 'Option B' },
    { id: 'option-c', label: 'Option C' },
  ],
  scores: [
    { id: '1', toolId: 'option-a', criterionId: 'cost', score: 8, label: 'Low', timestamp: 1707600000000 },
    { id: '2', toolId: 'option-a', criterionId: 'speed', score: 6, label: 'Medium', timestamp: 1707600000000 },
    { id: '3', toolId: 'option-a', criterionId: 'quality', score: 9, label: 'Excellent', timestamp: 1707600000000 },
    { id: '4', toolId: 'option-b', criterionId: 'cost', score: 5, label: 'Medium', timestamp: 1707600000000 },
    { id: '5', toolId: 'option-b', criterionId: 'speed', score: 9, label: 'Fast', timestamp: 1707600000000 },
    { id: '6', toolId: 'option-b', criterionId: 'quality', score: 7, label: 'Good', timestamp: 1707600000000 },
  ],
});

function App() {
  return (
    <PughStoreProvider store={store}>
      <PughMatrix />
    </PughStoreProvider>
  );
}
```

Cells are always editable — click any cell to add a score, label, or comment directly to the store.

## Props

PughMatrix accepts only presentational props. All data lives in the store.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `highlight` | `string` | no | Tool ID to visually highlight a column |
| `showWinner` | `boolean` | no | Highlight the highest weighted-total column in gold with a crown (default `false`) |
| `isDark` | `boolean` | no | Enable dark mode styling (default `false`) |

### Criterion & Tool

Criteria and tools are objects with a stable `id` and a display `label`. Scores reference items by ID, so renaming a label never breaks existing score data.

```ts
interface Criterion {
  id: string;    // stable identifier used in scores and weights
  label: string; // display text (can be renamed freely)
}

interface Tool {
  id: string;    // stable identifier used in scores and highlight
  label: string; // display text (can be renamed freely)
}
```

### ScoreEntry

```ts
interface ScoreEntry {
  id: string;           // unique identifier
  toolId: string;       // tool ID (column)
  criterionId: string;  // criterion ID (row)
  score?: number;       // 1–10 (optional — omit for comment-only entries)
  label?: string;       // descriptive text shown below the score (required when score is provided)
  comment?: string;     // optional comment
  timestamp: number;    // epoch ms — used for ordering (latest wins)
}
```

Multiple entries per (toolId, criterionId) pair are allowed — this is how score history works. The component displays the most recent entry that has a `score` and shows all entries (including comment-only ones) in a hover tooltip sorted newest-first. Comment-only entries do not overwrite the displayed score.

### Score history

Add multiple entries for the same cell to track revisions over time:

```ts
const scores = [
  // Original score
  { id: 'a1', toolId: 'react', criterionId: 'cost', score: 9, label: 'Free', timestamp: 1707600000000 },
  // Revised score — this one displays because it has a later timestamp
  { id: 'a2', toolId: 'react', criterionId: 'cost', score: 7, label: 'Revised', comment: 'Hidden infra costs', timestamp: 1707686400000 },
];
```

The cell shows `7 / Revised`. Hovering reveals both entries with dates and comments.

### Comment-only entries (dialog)

Add comment-only entries to have a discussion on a cell without changing its score:

```ts
const scores = [
  // Original score
  { id: 'a1', toolId: 'react', criterionId: 'cost', score: 9, label: 'Free', timestamp: 1707600000000 },
  // Comment-only follow-up — score remains 9 / Free
  { id: 'a2', toolId: 'react', criterionId: 'cost', comment: 'But what about hosting?', timestamp: 1707686400000 },
  { id: 'a3', toolId: 'react', criterionId: 'cost', comment: 'Vercel free tier covers it', timestamp: 1707772800000 },
];
```

The cell still displays `9 / Free` with its original color. Hovering reveals the full thread of scores and comments. In the edit form, score and label fields are marked as optional — submitting with only a comment creates a comment-only entry.

### Validation

Each score entry's `toolId` and `criterionId` must match an `id` in the `tools` and `criteria` arrays. The component throws an error if any entry references an unrecognized tool or criterion, listing the allowed values in the error message.

## Store API

### Creating a store

```tsx
import { createPughStore, PughStoreProvider, PughMatrix } from 'decisionapp';

const store = createPughStore({
  criteria: [
    { id: 'cost', label: 'Cost' },
    { id: 'speed', label: 'Speed' },
    { id: 'quality', label: 'Quality' },
  ],
  tools: [
    { id: 'option-a', label: 'Option A' },
    { id: 'option-b', label: 'Option B' },
  ],
  scores: [
    { id: '1', toolId: 'option-a', criterionId: 'cost', score: 8, label: 'Low', timestamp: Date.now() },
  ],
});

function App() {
  return (
    <PughStoreProvider store={store}>
      <PughMatrix />
    </PughStoreProvider>
  );
}
```

### Renaming tools and criteria

Labels can be renamed without breaking score references, since scores use stable IDs:

```ts
store.getState().renameTool('option-a', 'Widget A');
store.getState().renameCriterion('cost', 'Total Cost of Ownership');
```

### Persisted store (localStorage)

```tsx
import { createPughStore, createLocalStoragePersister, PughStoreProvider, PughMatrix } from 'decisionapp';

const store = createPughStore({
  criteria: [
    { id: 'cost', label: 'Cost' },
    { id: 'speed', label: 'Speed' },
  ],
  tools: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  persistKey: 'my-matrix',
  persister: createLocalStoragePersister(),
});

function App() {
  return (
    <PughStoreProvider store={store}>
      <PughMatrix />
    </PughStoreProvider>
  );
}
```

Data survives page reloads. The built-in localStorage persister also listens for `storage` events, so changes sync across browser tabs.

### Custom persisters

Implement the `Persister` interface to store data anywhere (IndexedDB, Supabase, a REST API, etc.):

```ts
import type { Persister } from 'decisionapp';

const myPersister: Persister = {
  load: (key) => fetchFromMyBackend(key),
  save: (key, value) => postToMyBackend(key, value),
  remove: (key) => deleteFromMyBackend(key),
  subscribe: (key, cb) => {
    // Optional: real-time sync
    const unsub = myRealtimeClient.on(key, (val) => cb(val));
    return unsub;
  },
};
```

### Reading/writing store state from outside React

The store returned by `createPughStore` is a vanilla Zustand store. You can read and mutate it outside of React:

```ts
const store = createPughStore({
  criteria: [{ id: 'cost', label: 'Cost' }],
  tools: [{ id: 'a', label: 'A' }],
});

// Read
console.log(store.getState().scores);

// Write
store.getState().addScore({
  id: '1', toolId: 'a', criterionId: 'cost', score: 8, label: 'Low', timestamp: Date.now(),
});

// Rename
store.getState().renameTool('a', 'Option A');
```

## Features

- **Interactive weights** — each criterion has an adjustable weight (0–10) that updates totals in real time
- **Color-coded cells** — scores map to a red-to-green HSL gradient, tuned for both light and dark backgrounds
- **Column highlighting** — pass `highlight="option-b"` (tool ID) to call out a specific column with a primary-color border
- **Collapsible totals row** — weighted totals are hidden by default; toggle with the button below the table
- **Dark mode** — pass `isDark={true}` or detect it from your app's theme system
- **Score history** — multiple entries per cell; hover to see all revisions in a tooltip (latest scored entry wins)
- **Comment-only entries** — add comments without changing a cell's score, enabling threaded discussion on any cell
- **Inline editing** — click any cell to add a new score + label, a comment, or both
- **Rename support** — rename tool/criterion labels without breaking score references (`renameTool`, `renameCriterion`)

## Dark mode

Pass the `isDark` prop to toggle:

```tsx
<PughStoreProvider store={store}>
  <PughMatrix isDark={true} />
</PughStoreProvider>
```

If you're in a framework with a theme hook (e.g. Next.js, Docusaurus), wire it up:

```tsx
// Next.js example with next-themes
import { useTheme } from 'next-themes';

function MyMatrix() {
  const { resolvedTheme } = useTheme();
  return (
    <PughStoreProvider store={store}>
      <PughMatrix isDark={resolvedTheme === 'dark'} />
    </PughStoreProvider>
  );
}
```

### CSS variable overrides

Override the default theme by setting these variables on a parent element:

```css
.my-wrapper {
  --pugh-primary: #0070f3;
  --pugh-head-bg: #1a1a2e;
  --pugh-head-text: #e0e0e0;
  --pugh-bg: #16213e;
  --pugh-text: #d4d4d4;
  --pugh-border-color: #333;
}
```

## Using with Docusaurus (greenfield guide)

This section walks through wiring up `decisionapp` with Zustand state in a Docusaurus site from scratch.

### 1. Install dependencies

```bash
npm install Spantree/decisionapp @radix-ui/themes
```

(`zustand` is included as a transitive dependency of `decisionapp`.)

### 2. Create a wrapper component

Docusaurus uses `useColorMode` for dark mode detection. Create a wrapper that:
- Creates (or reuses) a Zustand store
- Wraps `PughMatrix` in a `PughStoreProvider`
- Passes the Docusaurus color mode through as `isDark`

```tsx
// src/components/PughMatrixWidget.tsx
import { useMemo } from 'react';
import {
  PughMatrix,
  createPughStore,
  PughStoreProvider,
  createLocalStoragePersister,
} from 'decisionapp';
import 'decisionapp/styles.css';
import '@radix-ui/themes/styles.css';
import { useColorMode } from '@docusaurus/theme-common';
import type { Criterion, Tool, ScoreEntry } from 'decisionapp';

interface PughMatrixWidgetProps {
  /** Row definitions — the evaluation criteria. */
  criteria: Criterion[];
  /** Column definitions — the options being compared. */
  tools: Tool[];
  /** Initial scores to seed the matrix with. */
  scores?: ScoreEntry[];
  /** localStorage key for persistence. Omit for in-memory only. */
  persistKey?: string;
  /** Tool ID to visually highlight a column. */
  highlight?: string;
  /** Show the winner crown. */
  showWinner?: boolean;
}

export default function PughMatrixWidget({
  criteria,
  tools,
  scores = [],
  persistKey,
  highlight,
  showWinner,
}: PughMatrixWidgetProps) {
  const { colorMode } = useColorMode();

  // Create the store once. If persistKey is provided, localStorage
  // persistence is enabled and the matrix survives page reloads.
  const store = useMemo(
    () =>
      createPughStore({
        criteria,
        tools,
        scores,
        ...(persistKey && {
          persistKey,
          persister: createLocalStoragePersister(),
        }),
      }),
    // Intentionally empty — the store is created once per mount.
    // Changing criteria/tools/scores after mount requires remounting
    // (e.g. with a React key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <PughStoreProvider store={store}>
      <PughMatrix
        highlight={highlight}
        showWinner={showWinner}
        isDark={colorMode === 'dark'}
      />
    </PughStoreProvider>
  );
}
```

### 3. Register the component for MDX

Make the component available in `.mdx` files by adding it to `src/theme/MDXComponents.tsx`:

```tsx
// src/theme/MDXComponents.tsx
import MDXComponents from '@theme-original/MDXComponents';
import PughMatrixWidget from '@site/src/components/PughMatrixWidget';

export default { ...MDXComponents, PughMatrixWidget };
```

### 4. Use it in an MDX page

```mdx
---
title: Framework Comparison
---

export const criteria = [
  { id: 'cost', label: 'Cost' },
  { id: 'performance', label: 'Performance' },
  { id: 'ease-of-use', label: 'Ease of Use' },
];
export const tools = [
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue' },
  { id: 'svelte', label: 'Svelte' },
];
export const scores = [
  { id: '1', toolId: 'react', criterionId: 'cost', score: 9, label: 'Free', timestamp: 1707600000000 },
  { id: '2', toolId: 'react', criterionId: 'performance', score: 7, label: 'Good', timestamp: 1707600000000 },
  { id: '3', toolId: 'vue', criterionId: 'cost', score: 9, label: 'Free', timestamp: 1707600000000 },
  { id: '4', toolId: 'vue', criterionId: 'performance', score: 8, label: 'Great', timestamp: 1707600000000 },
  { id: '5', toolId: 'svelte', criterionId: 'cost', score: 9, label: 'Free', timestamp: 1707600000000 },
  { id: '6', toolId: 'svelte', criterionId: 'performance', score: 10, label: 'Fastest', timestamp: 1707600000000 },
];

<PughMatrixWidget
  criteria={criteria}
  tools={tools}
  scores={scores}
  persistKey="framework-comparison"
  highlight="vue"
  showWinner
/>
```

### 5. How the state wiring works

Here's what's happening under the hood:

1. **`createPughStore()`** creates a vanilla Zustand store instance containing all matrix state (criteria, tools, scores, weights, UI state).
2. **`PughStoreProvider`** injects the store into React context so any `<PughMatrix>` below it can read from it.
3. **`PughMatrix`** calls `usePughStore(selector)` internally to subscribe to slices of state. It never accepts data as props — it always reads from the store.
4. **Persistence** is opt-in: pass `persistKey` + a `persister` to `createPughStore` and the store auto-saves/loads domain state (scores, weights, criteria, tools) while ignoring ephemeral UI state (which cell is being edited, etc.).
5. **Multiple matrices** on the same page each get their own store instance, so they're fully independent.

### 6. Accessing the store from outside the matrix

If you need to read or modify matrix state from sibling components (e.g. an "Export to CSV" button), lift the store to a shared scope:

```tsx
// src/components/MatrixPage.tsx
import { useMemo } from 'react';
import { createPughStore, PughStoreProvider, PughMatrix, usePughStore } from 'decisionapp';

function ExportButton() {
  const scores = usePughStore((s) => s.scores);
  return <button onClick={() => console.log(JSON.stringify(scores))}>Export</button>;
}

export default function MatrixPage({ criteria, tools, scores }) {
  const store = useMemo(() => createPughStore({ criteria, tools, scores }), []);
  return (
    <PughStoreProvider store={store}>
      <PughMatrix />
      <ExportButton />
    </PughStoreProvider>
  );
}
```

Both `<PughMatrix>` and `<ExportButton>` read from the same store because they share the same `PughStoreProvider`.

## Note on Docusaurus Infima (IFM)

The original component in fluent-workshop used Docusaurus's [Infima](https://infima.dev/) CSS variables (`--ifm-color-primary`, `--ifm-table-border-color`, etc.). Infima *is* available as a standalone npm package:

```bash
npm install infima
```

```js
import 'infima/dist/css/default/default.css';
```

However, Infima is tightly coupled to Docusaurus conventions and brings a full CSS framework (~40 KB) for what amounts to a handful of CSS variables. This package instead ships self-contained CSS custom properties (`--pugh-*`) with sensible defaults, so you get the same look without pulling in Infima or Docusaurus. If you're already in a Docusaurus site, you can override the `--pugh-*` variables to match your Infima theme, or just use the wrapper pattern shown above.

## Highlight example

Call out a specific column by tool ID:

```tsx
<PughStoreProvider store={store}>
  <PughMatrix highlight="option-b" />
</PughStoreProvider>
```

The highlighted column gets a primary-color header and bordered cells.

## Development

```bash
npm install
npm run build   # outputs dist/ with CJS, ESM, types, and CSS
```

## Architecture & design decisions

### Store-only component

PughMatrix always reads data from a Zustand store via `PughStoreProvider`. There is no "controlled mode" where you pass `criteria`, `tools`, or `scores` as props. This keeps the component simple and avoids duplicating state management logic between a controlled and uncontrolled path.

To use PughMatrix:
1. Call `createPughStore({ criteria, tools, scores })` to create a store
2. Wrap `<PughMatrix>` in `<PughStoreProvider store={store}>`
3. The component reads everything from the store

### ID-based references

Criteria and tools are `{ id, label }` objects. Score entries reference them by `toolId` and `criterionId` (stable IDs), not by display label. This means you can rename a criterion or tool label at any time without breaking existing score data. The store provides `renameTool(id, newLabel)` and `renameCriterion(id, newLabel)` actions for this purpose.

### Zustand over alternatives

Zustand was chosen because it's tiny (~1 KB), has no boilerplate, works with vanilla JS (not just React), and its `persist` middleware provides exactly the hook points we need. The store is created with `createStore` (vanilla) rather than the React-only `create`, so it can be used outside React (tests, SSR, CLI tools).

### Persister interface (adapter pattern)

Instead of coupling to `localStorage` or any specific backend, the store accepts a `Persister` — a four-method interface (`load`, `save`, `remove`, `subscribe?`). This enables an **open-core model**:

- The core library ships with `createLocalStoragePersister()` (MIT, zero backend assumptions).
- Additional adapters (`persist-indexeddb`, `persist-supabase`, etc.) can be built and shipped separately by anyone implementing the `Persister` interface.

The `subscribe` method is optional. When present, the store calls `persister.subscribe(key, cb)` and triggers `rehydrate()` on changes — enabling cross-tab sync (localStorage `storage` events) or real-time sync (WebSocket/Supabase realtime).

### Domain vs. UI state partitioning

The store separates state into two categories:

- **Domain state** (`PughDomainState`): `criteria`, `tools`, `scores`, `weights` — this is what gets persisted.
- **UI state** (`PughUIState`): `showTotals`, `editingCell`, `editScore`, `editLabel`, `editComment` — ephemeral, never persisted.

Zustand's `partialize` option in the `persist` middleware handles this cleanly: only domain state is serialized. This means opening a persisted matrix doesn't restore stale editing state.

### Factory function, not a singleton

`createPughStore()` is a factory that returns a new store instance each time. This supports:

- Multiple independent matrices on the same page (each with its own store)
- SSR safety (no module-level singletons that leak between requests)
- Testing (create a fresh store per test)

The store instance is injected via React context (`PughStoreProvider`), not imported as a global.

## License

MIT
