---
title: Getting Started
slug: /
sidebar_position: 1
---

# decisions-cc

A standalone React component for [Pugh decision matrices](https://en.wikipedia.org/wiki/Decision-matrix_method) — weighted multi-criteria comparison tables with interactive scoring, color-coded cells, and dark mode support.

## Install

Install directly from GitHub (no registry required):

```bash
npm install Spantree/decisions-cc
```

Pin to a specific commit or tag:

```bash
npm install Spantree/decisions-cc#v0.1.0
npm install Spantree/decisions-cc#abc1234
```

Peer dependencies — bring your own:
- `react` 18+
- `react-dom` 18+
- `@radix-ui/themes` 3+

`zustand` is a regular dependency and is installed automatically.

## Quick start

PughMatrix always reads its data from a Zustand store. Create a store with `createPughStore`, pass it to `PughStoreProvider`, and render `PughMatrix` inside the provider:

```tsx
import { PughMatrix, createPughStore, PughStoreProvider } from 'decisions-cc';
import 'decisions-cc/styles.css';
import '@radix-ui/themes/styles.css';

const store = createPughStore({
  criteria: [
    { id: 'cost', label: 'Cost', user: 'alice' },
    { id: 'speed', label: 'Speed', user: 'alice' },
    { id: 'quality', label: 'Quality', user: 'alice' },
  ],
  options: [
    { id: 'option-a', label: 'Option A', user: 'alice' },
    { id: 'option-b', label: 'Option B', user: 'alice' },
    { id: 'option-c', label: 'Option C', user: 'alice' },
  ],
  ratings: [
    { id: '1', optionId: 'option-a', criterionId: 'cost', value: 8, label: 'Low', timestamp: 1707600000000, user: 'alice' },
    { id: '2', optionId: 'option-a', criterionId: 'speed', value: 6, label: 'Medium', timestamp: 1707600000000, user: 'alice' },
    { id: '3', optionId: 'option-a', criterionId: 'quality', value: 9, label: 'Excellent', timestamp: 1707600000000, user: 'alice' },
    { id: '4', optionId: 'option-b', criterionId: 'cost', value: 5, label: 'Medium', timestamp: 1707600000000, user: 'alice' },
    { id: '5', optionId: 'option-b', criterionId: 'speed', value: 9, label: 'Fast', timestamp: 1707600000000, user: 'alice' },
    { id: '6', optionId: 'option-b', criterionId: 'quality', value: 7, label: 'Good', timestamp: 1707600000000, user: 'alice' },
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

Cells are always editable — click any cell to add a rating, label, or comment directly to the store.

## Props

PughMatrix accepts only presentational props. All data lives in the store.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `highlight` | `string` | no | Option ID to visually highlight a column |
| `showWinner` | `boolean` | no | Highlight the highest weighted-total column in gold with a crown (default `false`) |
| `isDark` | `boolean` | no | Enable dark mode styling (default `false`) |

### Criterion & Option

Criteria and options are objects with a stable `id`, a display `label`, and a `user` who created them. Ratings reference items by ID, so renaming a label never breaks existing rating data.

```ts
interface Criterion {
  id: string;    // stable identifier used in ratings and weights
  label: string; // display text (can be renamed freely)
  user: string;  // who created this criterion
  scale?: ScaleType;  // optional; falls back to matrix default
}

interface Option {
  id: string;    // stable identifier used in ratings and highlight
  label: string; // display text (can be renamed freely)
  user: string;  // who created this option
}
```

### RatingEntry

```ts
interface RatingEntry {
  id: string;           // unique identifier
  optionId: string;     // option ID (column)
  criterionId: string;  // criterion ID (row)
  value?: number;       // numeric score (optional — omit for comment-only entries)
  label?: string;       // descriptive text shown below the score
  comment?: string;     // optional comment
  parentCommentId?: string; // for threaded replies
  timestamp: number;    // epoch ms — used for ordering (latest wins)
  user: string;         // who submitted this rating
}
```

Multiple entries per (optionId, criterionId) pair are allowed — this is how rating history works. The component displays the most recent entry that has a `value` and shows all entries (including comment-only ones) in a hover tooltip sorted newest-first. Comment-only entries do not overwrite the displayed rating.

### Rating history

Add multiple entries for the same cell to track revisions over time:

```ts
const ratings = [
  // Original rating
  { id: 'a1', optionId: 'react', criterionId: 'cost', value: 9, label: 'Free', timestamp: 1707600000000, user: 'alice' },
  // Revised rating — this one displays because it has a later timestamp
  { id: 'a2', optionId: 'react', criterionId: 'cost', value: 7, label: 'Revised', comment: 'Hidden infra costs', timestamp: 1707686400000, user: 'bob' },
];
```

The cell shows `7 / Revised`. Hovering reveals both entries with dates and comments.

### Comment-only entries (dialog)

Add comment-only entries to have a discussion on a cell without changing its rating:

```ts
const ratings = [
  // Original rating
  { id: 'a1', optionId: 'react', criterionId: 'cost', value: 9, label: 'Free', timestamp: 1707600000000, user: 'alice' },
  // Comment-only follow-up — rating remains 9 / Free
  { id: 'a2', optionId: 'react', criterionId: 'cost', comment: 'But what about hosting?', timestamp: 1707686400000, user: 'bob' },
  { id: 'a3', optionId: 'react', criterionId: 'cost', comment: 'Vercel free tier covers it', timestamp: 1707772800000, user: 'alice' },
];
```

The cell still displays `9 / Free` with its original color. Hovering reveals the full thread of ratings and comments. In the edit form, value and label fields are marked as optional — submitting with only a comment creates a comment-only entry.

### Validation

Each rating entry's `optionId` and `criterionId` must match an `id` in the `options` and `criteria` arrays. The component throws an error if any entry references an unrecognized option or criterion, listing the allowed values in the error message.

## Store API

### Creating a store

```tsx
import { createPughStore, PughStoreProvider, PughMatrix } from 'decisions-cc';

const store = createPughStore({
  criteria: [
    { id: 'cost', label: 'Cost', user: 'alice' },
    { id: 'speed', label: 'Speed', user: 'alice' },
    { id: 'quality', label: 'Quality', user: 'alice' },
  ],
  options: [
    { id: 'option-a', label: 'Option A', user: 'alice' },
    { id: 'option-b', label: 'Option B', user: 'alice' },
  ],
  ratings: [
    { id: '1', optionId: 'option-a', criterionId: 'cost', value: 8, label: 'Low', timestamp: Date.now(), user: 'alice' },
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

### Renaming options and criteria

Labels can be renamed without breaking rating references, since ratings use stable IDs:

```ts
store.getState().renameOption('option-a', 'Widget A');
store.getState().renameCriterion('cost', 'Total Cost of Ownership');
```

### Persisted store (localStorage)

```tsx
import { createPughStore, createLocalStorageRepository, PughStoreProvider, PughMatrix } from 'decisions-cc';

const store = createPughStore({
  criteria: [
    { id: 'cost', label: 'Cost', user: 'alice' },
    { id: 'speed', label: 'Speed', user: 'alice' },
  ],
  options: [
    { id: 'a', label: 'A', user: 'alice' },
    { id: 'b', label: 'B', user: 'alice' },
  ],
  repository: createLocalStorageRepository('my-matrix'),
});

function App() {
  return (
    <PughStoreProvider store={store}>
      <PughMatrix />
    </PughStoreProvider>
  );
}
```

Data survives page reloads. The built-in localStorage repository also listens for `storage` events, so changes sync across browser tabs.

### Reading/writing store state from outside React

The store returned by `createPughStore` is a vanilla Zustand store. You can read and mutate it outside of React:

```ts
const store = createPughStore({
  criteria: [{ id: 'cost', label: 'Cost', user: 'alice' }],
  options: [{ id: 'a', label: 'A', user: 'alice' }],
});

// Read
console.log(store.getState().ratings);

// Write
store.getState().addRating({
  id: '1', optionId: 'a', criterionId: 'cost', value: 8, label: 'Low', timestamp: Date.now(), user: 'alice',
});

// Rename
store.getState().renameOption('a', 'Option A');
```

## Features

- **Interactive weights** — each criterion has an adjustable weight (0–10) that updates totals in real time
- **Color-coded cells** — scores map to a red-to-green HSL gradient, tuned for both light and dark backgrounds
- **Column highlighting** — pass `highlight="option-b"` (option ID) to call out a specific column with a primary-color border
- **Collapsible totals row** — weighted totals are hidden by default; toggle with the button below the table
- **Dark mode** — pass `isDark={true}` or detect it from your app's theme system
- **Rating history** — multiple entries per cell; hover to see all revisions in a tooltip (latest rated entry wins)
- **Comment-only entries** — add comments without changing a cell's rating, enabling threaded discussion on any cell
- **Inline editing** — click any cell to add a new rating + label, a comment, or both
- **Rename support** — rename option/criterion labels without breaking rating references (`renameOption`, `renameCriterion`)

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

This section walks through wiring up `decisions-cc` with Zustand state in a Docusaurus site from scratch.

### 1. Install dependencies

```bash
npm install Spantree/decisions-cc @radix-ui/themes
```

(`zustand` is included as a transitive dependency of `decisions-cc`.)

### 2. Fix the Infima table CSS conflict

Docusaurus bundles [Infima](https://infima.dev/) which sets `table { display: block }` globally. This collapses Radix UI's `<table>` element inside the Pugh matrix to 0px height (combined with Radix's `overflow: hidden`). Add this override to your `src/css/custom.css`:

```css
/* Restore table layout inside PughMatrix — Infima sets display:block globally */
.pugh-container .rt-TableRootTable {
  display: table;
}
```

Without this fix, the matrix appears blank even though the component mounts correctly.

### 3. Create a wrapper component

Docusaurus uses `useColorMode` for dark mode detection. Create a wrapper that:
- Creates (or reuses) a Zustand store
- Wraps `PughMatrix` in a `PughStoreProvider`
- Passes the Docusaurus color mode through as `isDark`
- Wraps everything in `<BrowserOnly>` to skip SSR (Radix UI requires browser APIs)

```tsx
// src/components/PughMatrixWidget.tsx
import { useMemo } from 'react';
import {
  PughMatrix,
  createPughStore,
  PughStoreProvider,
  createLocalStorageRepository,
} from 'decisions-cc';
import 'decisions-cc/styles.css';
import '@radix-ui/themes/styles.css';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useColorMode } from '@docusaurus/theme-common';
import type { Criterion, Option, RatingEntry } from 'decisions-cc';

interface PughMatrixWidgetProps {
  /** Row definitions — the evaluation criteria. */
  criteria: Criterion[];
  /** Column definitions — the options being compared. */
  options: Option[];
  /** Initial ratings to seed the matrix with. */
  ratings?: RatingEntry[];
  /** localStorage key prefix for persistence. Omit for in-memory only. */
  persistPrefix?: string;
  /** Option ID to visually highlight a column. */
  highlight?: string;
  /** Show the winner crown. */
  showWinner?: boolean;
}

function PughMatrixWidgetInner({
  criteria,
  options,
  ratings = [],
  persistPrefix,
  highlight,
  showWinner,
}: PughMatrixWidgetProps) {
  const { colorMode } = useColorMode();

  // Create the store once. If persistPrefix is provided, localStorage
  // persistence is enabled and the matrix survives page reloads.
  const store = useMemo(
    () =>
      createPughStore({
        criteria,
        options,
        ratings,
        ...(persistPrefix && {
          repository: createLocalStorageRepository(persistPrefix),
        }),
      }),
    // Intentionally empty — the store is created once per mount.
    // Changing criteria/options/ratings after mount requires remounting
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

export default function PughMatrixWidget(props: PughMatrixWidgetProps) {
  return (
    <BrowserOnly fallback={<div>Loading matrix...</div>}>
      {() => <PughMatrixWidgetInner {...props} />}
    </BrowserOnly>
  );
}
```

### 4. Register the component for MDX

Make the component available in `.mdx` files by adding it to `src/theme/MDXComponents.tsx`:

```tsx
// src/theme/MDXComponents.tsx
import MDXComponents from '@theme-original/MDXComponents';
import PughMatrixWidget from '@site/src/components/PughMatrixWidget';

export default { ...MDXComponents, PughMatrixWidget };
```

### 5. Use it in an MDX page

```mdx
---
title: Framework Comparison
---

export const criteria = [
  { id: 'cost', label: 'Cost', user: 'alice' },
  { id: 'performance', label: 'Performance', user: 'alice' },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice' },
];
export const options = [
  { id: 'react', label: 'React', user: 'alice' },
  { id: 'vue', label: 'Vue', user: 'alice' },
  { id: 'svelte', label: 'Svelte', user: 'alice' },
];
export const ratings = [
  { id: '1', optionId: 'react', criterionId: 'cost', value: 9, label: 'Free', timestamp: 1707600000000, user: 'alice' },
  { id: '2', optionId: 'react', criterionId: 'performance', value: 7, label: 'Good', timestamp: 1707600000000, user: 'alice' },
  { id: '3', optionId: 'vue', criterionId: 'cost', value: 9, label: 'Free', timestamp: 1707600000000, user: 'alice' },
  { id: '4', optionId: 'vue', criterionId: 'performance', value: 8, label: 'Great', timestamp: 1707600000000, user: 'alice' },
  { id: '5', optionId: 'svelte', criterionId: 'cost', value: 9, label: 'Free', timestamp: 1707600000000, user: 'alice' },
  { id: '6', optionId: 'svelte', criterionId: 'performance', value: 10, label: 'Fastest', timestamp: 1707600000000, user: 'alice' },
];

<PughMatrixWidget
  criteria={criteria}
  options={options}
  ratings={ratings}
  persistPrefix="framework-comparison"
  highlight="vue"
  showWinner
/>
```

### 6. How the state wiring works

Here's what's happening under the hood:

1. **`createPughStore()`** creates a vanilla Zustand store instance containing all matrix state (criteria, options, ratings, weights, UI state).
2. **`PughStoreProvider`** injects the store into React context so any `<PughMatrix>` below it can read from it.
3. **`PughMatrix`** calls `usePughStore(selector)` internally to subscribe to slices of state. It never accepts data as props — it always reads from the store.
4. **Persistence** is opt-in: pass a `repository` (e.g. `createLocalStorageRepository(prefix)`) to `createPughStore` and the store auto-saves/loads domain state (ratings, weights, criteria, options) while ignoring ephemeral UI state (which cell is being edited, etc.).
5. **Multiple matrices** on the same page each get their own store instance, so they're fully independent.

### 7. Accessing the store from outside the matrix

If you need to read or modify matrix state from sibling components (e.g. an "Export to CSV" button), lift the store to a shared scope:

```tsx
// src/components/MatrixPage.tsx
import { useMemo } from 'react';
import { createPughStore, PughStoreProvider, PughMatrix, usePughStore } from 'decisions-cc';

function ExportButton() {
  const ratings = usePughStore((s) => s.ratings);
  return <button onClick={() => console.log(JSON.stringify(ratings))}>Export</button>;
}

export default function MatrixPage({ criteria, options, ratings }) {
  const store = useMemo(() => createPughStore({ criteria, options, ratings }), []);
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

Call out a specific column by option ID:

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

PughMatrix always reads data from a Zustand store via `PughStoreProvider`. There is no "controlled mode" where you pass `criteria`, `options`, or `ratings` as props. This keeps the component simple and avoids duplicating state management logic between a controlled and uncontrolled path.

To use PughMatrix:
1. Call `createPughStore({ criteria, options, ratings })` to create a store
2. Wrap `<PughMatrix>` in `<PughStoreProvider store={store}>`
3. The component reads everything from the store

### ID-based references

Criteria and options are `{ id, label, user }` objects. Rating entries reference them by `optionId` and `criterionId` (stable IDs), not by display label. This means you can rename a criterion or option label at any time without breaking existing rating data. The store provides `renameOption(id, newLabel)` and `renameCriterion(id, newLabel)` actions for this purpose.

### Zustand over alternatives

Zustand was chosen because it's tiny (~1 KB), has no boilerplate, works with vanilla JS (not just React), and its `persist` middleware provides exactly the hook points we need. The store is created with `createStore` (vanilla) rather than the React-only `create`, so it can be used outside React (tests, SSR, CLI tools).

### Repository layer (adapter pattern)

Instead of coupling to `localStorage` or any specific backend, the store accepts a `repository` — a `MatrixRepository` implementing a git-like object/ref store. This enables an **open-core model**:

- The core library ships with `createLocalStorageRepository(prefix)` (MIT, zero backend assumptions).
- Additional adapters can be built and shipped separately by anyone implementing the `MatrixRepository` interface.

### Domain vs. UI state partitioning

The store separates state into two categories:

- **Domain state** (`PughDomainState`): `criteria`, `options`, `ratings`, `weights` — this is what gets persisted.
- **UI state** (`PughUIState`): `showTotals`, `editingCell`, `editScore`, `editLabel`, `editComment` — ephemeral, never persisted.

Only domain state is serialized. This means opening a persisted matrix doesn't restore stale editing state.

### Factory function, not a singleton

`createPughStore()` is a factory that returns a new store instance each time. This supports:

- Multiple independent matrices on the same page (each with its own store)
- SSR safety (no module-level singletons that leak between requests)
- Testing (create a fresh store per test)

The store instance is injected via React context (`PughStoreProvider`), not imported as a global.

## License

MIT
