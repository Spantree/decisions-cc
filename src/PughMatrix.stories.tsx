import { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent } from 'storybook/test';
import PughMatrix from './PughMatrix';
import { createPughStore } from './store/createPughStore';
import { PughStoreProvider } from './store/PughStoreProvider';
import { createLocalStoragePersister } from './persist/localStoragePersister';
import { scoreId } from './ids';
import './pugh-matrix.css';
import type { Criterion, Tool, ScoreEntry, ScaleType } from './types';
import { DEFAULT_SCALE, SCALE_NEG2_POS2 } from './types';

const NUMERIC_1_10: ScaleType = DEFAULT_SCALE;
const NUMERIC_NEG2_POS2: ScaleType = SCALE_NEG2_POS2;
const UNBOUNDED: ScaleType = { kind: 'unbounded' };
const BINARY: ScaleType = { kind: 'binary' };

const criteria: Criterion[] = [
  { id: 'cost', label: 'Cost', user: 'alice', scale: NUMERIC_1_10 },
  { id: 'performance', label: 'Performance', user: 'alice', scale: NUMERIC_1_10 },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice', scale: NUMERIC_1_10 },
  { id: 'community', label: 'Community Support', user: 'alice', scale: NUMERIC_1_10 },
  { id: 'docs', label: 'Documentation', user: 'alice', scale: NUMERIC_1_10 },
];
const tools: Tool[] = [
  { id: 'react', label: 'React', user: 'alice' },
  { id: 'vue', label: 'Vue', user: 'alice' },
  { id: 'svelte', label: 'Svelte', user: 'alice' },
  { id: 'angular', label: 'Angular', user: 'alice' },
];

const [costCri, perfCri, eouCri, commCri, docsCri] = criteria;
const [reactTool, vueTool, svelteTool, angularTool] = tools;

function entry(
  toolId: string,
  criterionId: string,
  score: number,
  timestamp: number,
  commentOrLabel?: string,
  label?: string,
): ScoreEntry {
  // If both args provided: commentOrLabel is comment, label is label.
  // If only one arg: it's a comment (backward compat with existing calls).
  return {
    id: scoreId(),
    toolId,
    criterionId,
    score,
    comment: commentOrLabel,
    label,
    timestamp,
    user: 'alice',
  };
}

function commentOnly(
  toolId: string,
  criterionId: string,
  comment: string,
  timestamp: number,
): ScoreEntry {
  return {
    id: scoreId(),
    toolId,
    criterionId,
    comment,
    timestamp,
    user: 'alice',
  };
}

const t1 = 1707600000000; // Feb 11, 2024
const t2 = 1707686400000; // Feb 12, 2024
const t3 = 1707772800000; // Feb 13, 2024

const scores: ScoreEntry[] = [
  // React
  entry(reactTool.id, costCri.id, 10, t1),
  entry(reactTool.id, perfCri.id, 7, t1),
  entry(reactTool.id, eouCri.id, 6, t1),
  entry(reactTool.id, commCri.id, 10, t1),
  entry(reactTool.id, docsCri.id, 8, t1),

  // Vue
  entry(vueTool.id, costCri.id, 10, t1),
  entry(vueTool.id, perfCri.id, 8, t1),
  entry(vueTool.id, eouCri.id, 9, t1),
  entry(vueTool.id, commCri.id, 7, t1),
  entry(vueTool.id, docsCri.id, 9, t1),

  // Svelte
  entry(svelteTool.id, costCri.id, 10, t1),
  entry(svelteTool.id, perfCri.id, 10, t1),
  entry(svelteTool.id, eouCri.id, 8, t1),
  entry(svelteTool.id, commCri.id, 5, t1),
  entry(svelteTool.id, docsCri.id, 7, t1),

  // Angular
  entry(angularTool.id, costCri.id, 8, t1),
  entry(angularTool.id, perfCri.id, 6, t1),
  entry(angularTool.id, eouCri.id, 4, t1),
  entry(angularTool.id, commCri.id, 8, t1),
  entry(angularTool.id, docsCri.id, 8, t1),
];

// Scores with history: some cells have revised entries
const scoresWithHistory: ScoreEntry[] = [
  ...scores,
  entry(reactTool.id, costCri.id, 7, t2, 'Hidden infra costs'),
  entry(reactTool.id, perfCri.id, 8, t2, 'After React 19 release'),
  entry(svelteTool.id, commCri.id, 7, t2, 'SvelteKit adoption boosted ecosystem'),
];

// Scores with dialog: comment-only follow-ups that don't overwrite scores
const scoresWithDialog: ScoreEntry[] = [
  ...scoresWithHistory,
  commentOnly(reactTool.id, costCri.id, 'But what about hosting?', t3),
  commentOnly(reactTool.id, costCri.id, 'Vercel free tier covers most use cases', t3 + 1000),
  commentOnly(vueTool.id, eouCri.id, 'Composition API has a learning curve though', t3),
];

/** Helper: wraps PughMatrix in a store provider for each story. */
function StoryMatrix({
  scores: storyScores = scores,
  highlight,
  showWinner,
  isDark,
  readOnly,
}: {
  scores?: ScoreEntry[];
  highlight?: string;
  showWinner?: boolean;
  isDark?: boolean;
  readOnly?: boolean;
}) {
  const store = useMemo(
    () => createPughStore({ criteria, tools, scores: storyScores }),
    [storyScores],
  );
  return (
    <PughStoreProvider store={store}>
      <PughMatrix highlight={highlight} showWinner={showWinner} isDark={isDark} readOnly={readOnly} />
    </PughStoreProvider>
  );
}

const meta: Meta<typeof StoryMatrix> = {
  title: 'PughMatrix',
  component: StoryMatrix,
  argTypes: {
    highlight: {
      control: 'select',
      options: [undefined, ...tools.map((t) => t.id)],
      description: 'Tool ID to visually highlight a column',
    },
    showWinner: {
      control: 'boolean',
      description: 'Highlight the highest weighted-total column in gold with a crown',
    },
    isDark: {
      control: 'boolean',
      description: 'Enable dark mode styling',
    },
    readOnly: {
      control: 'boolean',
      description: 'Disable all editing interactions',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StoryMatrix>;

/** Default rendering with no highlight or winner. */
export const Default: Story = {};

/** Default with the weighted totals row visible. */
export const WithTotals: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /show totals/i });
    await userEvent.click(button);
  },
};

/** A single column highlighted with the `highlight` prop. */
export const HighlightVue: Story = {
  args: {
    highlight: vueTool.id,
  },
};

/** Highlighting a different column for comparison. */
export const HighlightSvelte: Story = {
  args: {
    highlight: svelteTool.id,
  },
};

/** Dark mode enabled. */
export const DarkMode: Story = {
  args: {
    isDark: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/** Dark mode with a highlighted column. */
export const DarkModeWithHighlight: Story = {
  args: {
    isDark: true,
    highlight: reactTool.id,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/** Winner highlight enabled — crowns the highest weighted-total column in gold. */
export const ShowWinner: Story = {
  args: {
    showWinner: true,
  },
};

/** Winner and a separate highlight active at the same time. */
export const WinnerWithHighlight: Story = {
  args: {
    showWinner: true,
    highlight: angularTool.id,
  },
};

/** Winner highlight in dark mode. */
export const WinnerDarkMode: Story = {
  args: {
    showWinner: true,
    isDark: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/** Cells with score history — hover a cell to see previous scores in a tooltip. */
export const WithScoreHistory: Story = {
  args: {
    scores: scoresWithHistory,
  },
};

/** Cells with comment-only follow-ups — the score persists while a dialog appears in hover history. */
export const WithDialog: Story = {
  args: {
    scores: scoresWithDialog,
  },
};

/** Read-only mode — no editing, no add/remove buttons, no toggle controls. */
export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
};

/* ------------------------------------------------------------------ */
/*  -2 to +2 scale story                                              */
/* ------------------------------------------------------------------ */

const criteriaNeg2: Criterion[] = [
  { id: 'cost', label: 'Cost', user: 'alice', scale: NUMERIC_NEG2_POS2 },
  { id: 'performance', label: 'Performance', user: 'alice', scale: NUMERIC_NEG2_POS2 },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice', scale: NUMERIC_NEG2_POS2 },
];

const scoresNeg2: ScoreEntry[] = [
  entry(reactTool.id, 'cost', 2, t1),
  entry(reactTool.id, 'performance', 1, t1),
  entry(reactTool.id, 'ease-of-use', 0, t1),
  entry(vueTool.id, 'cost', 1, t1),
  entry(vueTool.id, 'performance', 2, t1),
  entry(vueTool.id, 'ease-of-use', 1, t1),
  entry(svelteTool.id, 'cost', -1, t1),
  entry(svelteTool.id, 'performance', 2, t1),
  entry(svelteTool.id, 'ease-of-use', -2, t1),
  entry(angularTool.id, 'cost', 0, t1),
  entry(angularTool.id, 'performance', -1, t1),
  entry(angularTool.id, 'ease-of-use', -1, t1),
];

/** Criteria using the -2 to +2 scale. */
export const Neg2ToPos2Scale: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaNeg2, tools, scores: scoresNeg2 }),
      [],
    );
    return (
      <PughStoreProvider store={store}>
        <PughMatrix />
      </PughStoreProvider>
    );
  },
};

/* ------------------------------------------------------------------ */
/*  localStorage persistence story                                    */
/* ------------------------------------------------------------------ */

const PERSIST_KEY = 'pugh-storybook-demo';

/**
 * Store with localStorage persistence — edits survive page reloads.
 * Click any cell to add a score. Use "Clear saved data" to reset to defaults.
 * Writes to localStorage key "pugh-storybook-demo".
 */
export const WithLocalStorage: Story = {
  render: (args) => {
    const [resetKey, setResetKey] = useState(0);
    const store = useMemo(
      () =>
        createPughStore({
          criteria,
          tools,
          scores: scoresWithHistory,
          persistKey: PERSIST_KEY,
          persister: createLocalStoragePersister(),
        }),
      [resetKey],
    );
    const handleClear = () => {
      try { localStorage.removeItem(PERSIST_KEY); } catch {}
      setResetKey((k) => k + 1);
    };
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={handleClear}
            style={{ fontSize: 13, cursor: 'pointer', padding: '4px 10px' }}
          >
            Clear saved data
          </button>
        </div>
        <PughStoreProvider store={store}>
          <PughMatrix
            highlight={args.highlight}
            showWinner={args.showWinner}
            isDark={args.isDark}
          />
        </PughStoreProvider>
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/*  Unbounded (proportional) scale story                               */
/* ------------------------------------------------------------------ */

const criteriaUnbounded: Criterion[] = [
  { id: 'stars', label: 'GitHub Stars', user: 'alice', scale: UNBOUNDED },
  { id: 'downloads', label: 'npm Weekly Downloads', user: 'alice', scale: UNBOUNDED },
  { id: 'bundle', label: 'Bundle Size (KB)', user: 'alice', scale: UNBOUNDED },
];

const scoresUnbounded: ScoreEntry[] = [
  // GitHub Stars
  entry(reactTool.id, 'stars', 228000, t1),
  entry(vueTool.id, 'stars', 208000, t1),
  entry(svelteTool.id, 'stars', 80000, t1),
  entry(angularTool.id, 'stars', 96000, t1),

  // npm Weekly Downloads
  entry(reactTool.id, 'downloads', 25000000, t1),
  entry(vueTool.id, 'downloads', 4500000, t1),
  entry(svelteTool.id, 'downloads', 900000, t1),
  entry(angularTool.id, 'downloads', 3200000, t1),

  // Bundle Size (KB)
  entry(reactTool.id, 'bundle', 42, t1),
  entry(vueTool.id, 'bundle', 33, t1),
  entry(svelteTool.id, 'bundle', 2, t1),
  entry(angularTool.id, 'bundle', 143, t1),
];

/** Unbounded scale — raw counts normalized at display time; share of total shown as %. */
export const UnboundedScale: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaUnbounded, tools, scores: scoresUnbounded }),
      [],
    );
    return (
      <PughStoreProvider store={store}>
        <PughMatrix showWinner />
      </PughStoreProvider>
    );
  },
};

/* ------------------------------------------------------------------ */
/*  Binary scale story                                                 */
/* ------------------------------------------------------------------ */

const criteriaBinary: Criterion[] = [
  { id: 'ssr', label: 'SSR Support', user: 'alice', scale: BINARY },
  { id: 'typescript', label: 'TypeScript Built-in', user: 'alice', scale: BINARY },
  { id: 'mobile', label: 'Mobile Framework', user: 'alice', scale: BINARY },
  { id: 'oss', label: 'Open Source', user: 'alice', scale: BINARY },
];

const scoresBinary: ScoreEntry[] = [
  entry(reactTool.id, 'ssr', 1, t1),
  entry(reactTool.id, 'typescript', 0, t1),
  entry(reactTool.id, 'mobile', 1, t1),
  entry(reactTool.id, 'oss', 1, t1),

  entry(vueTool.id, 'ssr', 1, t1),
  entry(vueTool.id, 'typescript', 0, t1),
  entry(vueTool.id, 'mobile', 0, t1),
  entry(vueTool.id, 'oss', 1, t1),

  entry(svelteTool.id, 'ssr', 1, t1),
  entry(svelteTool.id, 'typescript', 1, t1),
  entry(svelteTool.id, 'mobile', 0, t1),
  entry(svelteTool.id, 'oss', 1, t1),

  entry(angularTool.id, 'ssr', 1, t1),
  entry(angularTool.id, 'typescript', 1, t1),
  entry(angularTool.id, 'mobile', 1, t1),
  entry(angularTool.id, 'oss', 1, t1),
];

/** Binary scale — yes/no criteria scored as 1/0. */
export const BinaryScale: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaBinary, tools, scores: scoresBinary }),
      [],
    );
    return (
      <PughStoreProvider store={store}>
        <PughMatrix showWinner />
      </PughStoreProvider>
    );
  },
};

/* ------------------------------------------------------------------ */
/*  Decimal step story                                                 */
/* ------------------------------------------------------------------ */

const HALF_STEP: ScaleType = { kind: 'numeric', min: 0, max: 5, step: 0.5 };
const TENTH_STEP: ScaleType = { kind: 'numeric', min: 0, max: 10, step: 0.1 };

const criteriaDecimal: Criterion[] = [
  { id: 'rating', label: 'User Rating (0-5)', user: 'alice', scale: HALF_STEP },
  { id: 'latency', label: 'Latency Score (0-10)', user: 'alice', scale: TENTH_STEP },
];

const scoresDecimal: ScoreEntry[] = [
  entry(reactTool.id, 'rating', 4.5, t1),
  entry(reactTool.id, 'latency', 7.3, t1),
  entry(vueTool.id, 'rating', 4.0, t1),
  entry(vueTool.id, 'latency', 8.1, t1),
  entry(svelteTool.id, 'rating', 5.0, t1),
  entry(svelteTool.id, 'latency', 9.2, t1),
  entry(angularTool.id, 'rating', 3.5, t1),
  entry(angularTool.id, 'latency', 6.5, t1),
];

/** Decimal step scales — criteria with step 0.5 and step 0.1. */
export const DecimalStep: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaDecimal, tools, scores: scoresDecimal }),
      [],
    );
    return (
      <PughStoreProvider store={store}>
        <PughMatrix showWinner />
      </PughStoreProvider>
    );
  },
};

/* ------------------------------------------------------------------ */
/*  Mixed scales story                                                 */
/* ------------------------------------------------------------------ */

const criteriaMixed: Criterion[] = [
  { id: 'cost', label: 'Cost', user: 'alice', scale: NUMERIC_1_10 },
  { id: 'ssr', label: 'SSR Support', user: 'alice', scale: BINARY },
  { id: 'stars', label: 'GitHub Stars', user: 'alice', scale: UNBOUNDED },
  { id: 'rating', label: 'User Rating (0-5)', user: 'alice', scale: HALF_STEP },
];

const scoresMixed: ScoreEntry[] = [
  entry(reactTool.id, 'cost', 10, t1),
  entry(reactTool.id, 'ssr', 1, t1),
  entry(reactTool.id, 'stars', 228000, t1),
  entry(reactTool.id, 'rating', 4.5, t1),

  entry(vueTool.id, 'cost', 10, t1),
  entry(vueTool.id, 'ssr', 1, t1),
  entry(vueTool.id, 'stars', 208000, t1),
  entry(vueTool.id, 'rating', 4.0, t1),

  entry(svelteTool.id, 'cost', 10, t1),
  entry(svelteTool.id, 'ssr', 1, t1),
  entry(svelteTool.id, 'stars', 80000, t1),
  entry(svelteTool.id, 'rating', 5.0, t1),

  entry(angularTool.id, 'cost', 8, t1),
  entry(angularTool.id, 'ssr', 1, t1),
  entry(angularTool.id, 'stars', 96000, t1),
  entry(angularTool.id, 'rating', 3.5, t1),
];

/** Mixed scales — matrix combining numeric, binary, unbounded, and decimal criteria. */
export const MixedScales: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaMixed, tools, scores: scoresMixed }),
      [],
    );
    return (
      <PughStoreProvider store={store}>
        <PughMatrix showWinner />
      </PughStoreProvider>
    );
  },
};

/* ------------------------------------------------------------------ */
/*  Signed scale story                                                 */
/* ------------------------------------------------------------------ */

const SIGNED_NEG5_POS5: ScaleType = { kind: 'numeric', min: -5, max: 5, step: 1 };

const criteriaSigned: Criterion[] = [
  { id: 'impact', label: 'Impact', user: 'alice', scale: SIGNED_NEG5_POS5 },
  { id: 'risk', label: 'Risk', user: 'alice', scale: SIGNED_NEG5_POS5 },
  { id: 'effort', label: 'Effort', user: 'alice', scale: SIGNED_NEG5_POS5 },
];

const scoresSigned: ScoreEntry[] = [
  entry(reactTool.id, 'impact', 4, t1),
  entry(reactTool.id, 'risk', -2, t1),
  entry(reactTool.id, 'effort', -1, t1),

  entry(vueTool.id, 'impact', 3, t1),
  entry(vueTool.id, 'risk', 1, t1),
  entry(vueTool.id, 'effort', 2, t1),

  entry(svelteTool.id, 'impact', 5, t1),
  entry(svelteTool.id, 'risk', -3, t1),
  entry(svelteTool.id, 'effort', -4, t1),

  entry(angularTool.id, 'impact', 0, t1),
  entry(angularTool.id, 'risk', -5, t1),
  entry(angularTool.id, 'effort', 3, t1),
];

/** Signed scale — matrix with allowNegative and -5 to +5 range. Negative=red, zero=yellow, positive=green. */
export const SignedScale: Story = {
  render: () => {
    // We need to create a store and manually dispatch MatrixCreated to set allowNegative
    const store = useMemo(() => {
      const s = createPughStore({ criteria: criteriaSigned, tools, scores: scoresSigned });
      // Dispatch a MatrixDefaultScaleSet is not needed since criteria have explicit scales.
      // We need to set allowNegative. We'll dispatch a MatrixCreated event.
      s.getState().dispatch({
        id: 'evt_signed-init',
        type: 'MatrixCreated',
        title: 'Signed Scale Demo',
        allowNegative: true,
        defaultScale: SIGNED_NEG5_POS5,
        timestamp: Date.now(),
        user: 'system',
      });
      return s;
    }, []);
    return (
      <PughStoreProvider store={store}>
        <PughMatrix showWinner />
      </PughStoreProvider>
    );
  },
};
