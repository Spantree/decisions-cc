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

## Quick start

```tsx
import { PughMatrix } from 'decisionapp';
import 'decisionapp/styles.css';
import '@radix-ui/themes/styles.css';

const criteria = ['Cost', 'Speed', 'Quality'];
const tools = ['Option A', 'Option B', 'Option C'];
const scores = [
  { id: '1', tool: 'Option A', criterion: 'Cost', score: 8, label: 'Low', timestamp: 1707600000000 },
  { id: '2', tool: 'Option A', criterion: 'Speed', score: 6, label: 'Medium', timestamp: 1707600000000 },
  { id: '3', tool: 'Option A', criterion: 'Quality', score: 9, label: 'Excellent', timestamp: 1707600000000 },
  { id: '4', tool: 'Option B', criterion: 'Cost', score: 5, label: 'Medium', timestamp: 1707600000000 },
  { id: '5', tool: 'Option B', criterion: 'Speed', score: 9, label: 'Fast', timestamp: 1707600000000 },
  { id: '6', tool: 'Option B', criterion: 'Quality', score: 7, label: 'Good', timestamp: 1707600000000 },
  { id: '7', tool: 'Option C', criterion: 'Cost', score: 3, label: 'High', timestamp: 1707600000000 },
  { id: '8', tool: 'Option C', criterion: 'Speed', score: 4, label: 'Slow', timestamp: 1707600000000 },
  { id: '9', tool: 'Option C', criterion: 'Quality', score: 10, label: 'Best', timestamp: 1707600000000 },

  // Revised score for the same cell — latest timestamp wins, both show in tooltip
  { id: '10', tool: 'Option A', criterion: 'Cost', score: 6, label: 'Revised', comment: 'Hidden fees discovered', timestamp: 1707686400000 },
];

function App() {
  return <PughMatrix criteria={criteria} tools={tools} scores={scores} />;
}
```

## Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `criteria` | `string[]` | yes | Row labels (evaluation criteria) |
| `tools` | `string[]` | yes | Column labels (options being compared) |
| `scores` | `ScoreEntry[]` | yes | Flat array of score entries (latest timestamp wins per cell) |
| `highlight` | `string` | no | Tool name to visually highlight a column |
| `showWinner` | `boolean` | no | Highlight the highest weighted-total column in gold with a crown (default `false`) |
| `isDark` | `boolean` | no | Enable dark mode styling (default `false`) |
| `onScoreAdd` | `(entry) => void` | no | Callback when adding a new score. Receives `{ tool, criterion, score?, label?, comment? }`. If a score is provided, label is required. If omitted, cells are read-only. |

### ScoreEntry

```ts
interface ScoreEntry {
  id: string;           // unique identifier
  tool: string;         // column (option being scored)
  criterion: string;    // row (evaluation criterion)
  score?: number;       // 1–10 (optional — omit for comment-only entries)
  label?: string;       // descriptive text shown below the score (required when score is provided)
  comment?: string;     // optional comment
  timestamp: number;    // epoch ms — used for ordering (latest wins)
}
```

Multiple entries per (tool, criterion) pair are allowed — this is how score history works. The component displays the most recent entry that has a `score` and shows all entries (including comment-only ones) in a hover tooltip sorted newest-first. Comment-only entries do not overwrite the displayed score.

### Score history

Add multiple entries for the same cell to track revisions over time:

```ts
const scores = [
  // Original score
  { id: 'a1', tool: 'React', criterion: 'Cost', score: 9, label: 'Free', timestamp: 1707600000000 },
  // Revised score — this one displays because it has a later timestamp
  { id: 'a2', tool: 'React', criterion: 'Cost', score: 7, label: 'Revised', comment: 'Hidden infra costs', timestamp: 1707686400000 },
];
```

The cell shows `7 / Revised`. Hovering reveals both entries with dates and comments.

### Comment-only entries (dialog)

Add comment-only entries to have a discussion on a cell without changing its score:

```ts
const scores = [
  // Original score
  { id: 'a1', tool: 'React', criterion: 'Cost', score: 9, label: 'Free', timestamp: 1707600000000 },
  // Comment-only follow-up — score remains 9 / Free
  { id: 'a2', tool: 'React', criterion: 'Cost', comment: 'But what about hosting?', timestamp: 1707686400000 },
  { id: 'a3', tool: 'React', criterion: 'Cost', comment: 'Vercel free tier covers it', timestamp: 1707772800000 },
];
```

The cell still displays `9 / Free` with its original color. Hovering reveals the full thread of scores and comments. In the edit form, score and label fields are marked as optional — submitting with only a comment creates a comment-only entry.

### Validation

Each score entry's `tool` and `criterion` must match a value in the `tools` and `criteria` arrays. The component throws an error if any entry references an unrecognized tool or criterion, listing the allowed values in the error message.

## Features

- **Interactive weights** — each criterion has an adjustable weight (0–10) that updates totals in real time
- **Color-coded cells** — scores map to a red-to-green HSL gradient, tuned for both light and dark backgrounds
- **Column highlighting** — pass `highlight="Option B"` to call out a specific column with a primary-color border
- **Collapsible totals row** — weighted totals are hidden by default; toggle with the button below the table
- **Dark mode** — pass `isDark={true}` or detect it from your app's theme system
- **Score history** — multiple entries per cell; hover to see all revisions in a tooltip (latest scored entry wins)
- **Comment-only entries** — add comments without changing a cell's score, enabling threaded discussion on any cell
- **Inline editing** — pass `onScoreAdd` to let users click a cell and add a new score + label, a comment, or both

## Dark mode

The component uses CSS custom properties scoped under `.pugh-container`. Pass the `isDark` prop to toggle:

```tsx
<PughMatrix criteria={criteria} tools={tools} scores={scores} isDark={true} />
```

If you're in a framework with a theme hook (e.g. Next.js, Docusaurus), wire it up:

```tsx
// Next.js example with next-themes
import { useTheme } from 'next-themes';

function MyMatrix() {
  const { resolvedTheme } = useTheme();
  return (
    <PughMatrix
      criteria={criteria}
      tools={tools}
      scores={scores}
      isDark={resolvedTheme === 'dark'}
    />
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

## Using with Docusaurus

In Docusaurus, dark mode is detected via the `useColorMode` hook from `@docusaurus/theme-common`. Create a thin wrapper:

```tsx
// src/components/MyPughMatrix.tsx
import { PughMatrix } from 'decisionapp';
import 'decisionapp/styles.css';
import { useColorMode } from '@docusaurus/theme-common';

export default function MyPughMatrix(props) {
  const { colorMode } = useColorMode();
  return <PughMatrix {...props} isDark={colorMode === 'dark'} />;
}
```

Register it in `src/theme/MDXComponents.tsx` to use it in `.mdx` files:

```tsx
import MDXComponents from '@theme-original/MDXComponents';
import MyPughMatrix from '@site/src/components/MyPughMatrix';

export default { ...MDXComponents, MyPughMatrix };
```

Then in any `.mdx` page:

```mdx
<MyPughMatrix criteria={criteria} tools={tools} scores={scores} highlight="Option B" />
```

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

Call out a specific column:

```tsx
<PughMatrix
  criteria={['Price', 'Durability', 'Style']}
  tools={['Widget A', 'Widget B', 'Widget C']}
  scores={scores}
  highlight="Widget B"
/>
```

The highlighted column gets a primary-color header and bordered cells.

## Development

```bash
npm install
npm run build   # outputs dist/ with CJS, ESM, types, and CSS
```

## License

MIT
