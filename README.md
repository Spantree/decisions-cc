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

React 18+ is a peer dependency — bring your own.

## Quick start

```tsx
import { PughMatrix } from 'decisionapp';
import 'decisionapp/styles.css';

const criteria = ['Cost', 'Speed', 'Quality'];
const tools = ['Option A', 'Option B', 'Option C'];
const scores = {
  'Option A': {
    Cost: { score: 8, label: 'Low' },
    Speed: { score: 6, label: 'Medium' },
    Quality: { score: 9, label: 'Excellent' },
  },
  'Option B': {
    Cost: { score: 5, label: 'Medium' },
    Speed: { score: 9, label: 'Fast' },
    Quality: { score: 7, label: 'Good' },
  },
  'Option C': {
    Cost: { score: 3, label: 'High' },
    Speed: { score: 4, label: 'Slow' },
    Quality: { score: 10, label: 'Best' },
  },
};

function App() {
  return <PughMatrix criteria={criteria} tools={tools} scores={scores} />;
}
```

## Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `criteria` | `string[]` | yes | Row labels (evaluation criteria) |
| `tools` | `string[]` | yes | Column labels (options being compared) |
| `scores` | `Record<string, Record<string, ScoreEntry>>` | yes | Nested map: `scores[tool][criterion]` |
| `highlight` | `string` | no | Tool name to visually highlight a column |
| `isDark` | `boolean` | no | Enable dark mode styling (default `false`) |

### ScoreEntry

```ts
interface ScoreEntry {
  score: number; // 1–10
  label: string; // descriptive text shown below the score
}
```

## Features

- **Interactive weights** — each criterion has an adjustable weight (0–10) that updates totals in real time
- **Color-coded cells** — scores map to a red-to-green HSL gradient, tuned for both light and dark backgrounds
- **Column highlighting** — pass `highlight="Option B"` to call out a specific column with a primary-color border
- **Collapsible totals row** — weighted totals are hidden by default; toggle with the button below the table
- **Dark mode** — pass `isDark={true}` or detect it from your app's theme system

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
