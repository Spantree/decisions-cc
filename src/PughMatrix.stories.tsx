import { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent } from 'storybook/test';
import PughMatrix from './PughMatrix';
import { createPughStore } from './store/createPughStore';
import { PughStoreProvider } from './store/PughStoreProvider';
import { createLocalStoragePersister } from './persist/localStoragePersister';
import { scoreId } from './ids';
import './pugh-matrix.css';
import type { Criterion, Tool, ScoreEntry, ScoreScale } from './types';
import {
  SCALE_1_10, SCALE_NEG2_POS2,
  LABELS_COST_1_10, LABELS_EASE_1_10, LABELS_COMMUNITY_1_10,
} from './types';

const PROPORTIONAL_SCALE: ScoreScale = {
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
  labels: {},
  proportional: true,
};

const costScale = { min: 1, max: 10, labels: LABELS_COST_1_10.labels };
const easeScale = { min: 1, max: 10, labels: LABELS_EASE_1_10.labels };
const communityScale = { min: 1, max: 10, labels: LABELS_COMMUNITY_1_10.labels };

const criteria: Criterion[] = [
  { id: 'cost', label: 'Cost', user: 'alice', scoreScale: costScale },
  { id: 'performance', label: 'Performance', user: 'alice', scoreScale: SCALE_1_10 },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice', scoreScale: easeScale },
  { id: 'community', label: 'Community Support', user: 'alice', scoreScale: communityScale },
  { id: 'docs', label: 'Documentation', user: 'alice', scoreScale: SCALE_1_10 },
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
  labelOrComment?: string,
  comment?: string,
): ScoreEntry {
  return {
    id: scoreId(),
    toolId,
    criterionId,
    score,
    label: labelOrComment,
    comment,
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
  // React — all from label sets
  entry(reactTool.id, costCri.id, 10, t1),              // Cost: "Free"
  entry(reactTool.id, perfCri.id, 7, t1),               // Quality: "Good"
  entry(reactTool.id, eouCri.id, 6, t1),                // Ease: "Manageable"
  entry(reactTool.id, commCri.id, 10, t1),              // Community: "Massive"
  entry(reactTool.id, docsCri.id, 8, t1),               // Quality: "Very Good"

  // Vue — all from label sets
  entry(vueTool.id, costCri.id, 10, t1),                // Cost: "Free"
  entry(vueTool.id, perfCri.id, 8, t1),                 // Quality: "Very Good"
  entry(vueTool.id, eouCri.id, 9, t1),                  // Ease: "Intuitive"
  entry(vueTool.id, commCri.id, 7, t1),                 // Community: "Strong"
  entry(vueTool.id, docsCri.id, 9, t1),                 // Quality: "Excellent"

  // Svelte — one override on performance
  entry(svelteTool.id, costCri.id, 10, t1),             // Cost: "Free"
  entry(svelteTool.id, perfCri.id, 10, t1, 'Fastest'),  // override: "Fastest" instead of "Outstanding"
  entry(svelteTool.id, eouCri.id, 8, t1),               // Ease: "Very Easy"
  entry(svelteTool.id, commCri.id, 5, t1),              // Community: "Moderate"
  entry(svelteTool.id, docsCri.id, 7, t1),              // Quality: "Good"

  // Angular — one override on ease-of-use
  entry(angularTool.id, costCri.id, 8, t1),             // Cost: "Very Cheap"
  entry(angularTool.id, perfCri.id, 6, t1),             // Quality: "Above Avg"
  entry(angularTool.id, eouCri.id, 4, t1, 'Steep learning curve'),  // override
  entry(angularTool.id, commCri.id, 8, t1),             // Community: "Very Strong"
  entry(angularTool.id, docsCri.id, 8, t1),             // Quality: "Very Good"
];

// Scores with history: some cells have revised entries
const scoresWithHistory: ScoreEntry[] = [
  ...scores,
  entry(reactTool.id, costCri.id, 7, t2, undefined, 'Hidden infra costs'),    // Cost: "Cheap" — downgraded from Free
  entry(reactTool.id, perfCri.id, 8, t2, undefined, 'After React 19 release'), // Quality: "Very Good" from label set
  entry(svelteTool.id, commCri.id, 7, t2, 'Growing Fast', 'SvelteKit adoption boosted ecosystem'),  // override
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
  { id: 'cost', label: 'Cost', user: 'alice', scoreScale: SCALE_NEG2_POS2 },
  { id: 'performance', label: 'Performance', user: 'alice', scoreScale: SCALE_NEG2_POS2 },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice', scoreScale: SCALE_NEG2_POS2 },
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

/** Criteria using the -2 to +2 scale (Poor to Outstanding). */
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
/*  Proportional scale story                                           */
/* ------------------------------------------------------------------ */

const criteriaProportional: Criterion[] = [
  { id: 'stars', label: 'GitHub Stars', user: 'alice', scoreScale: PROPORTIONAL_SCALE },
  { id: 'downloads', label: 'npm Weekly Downloads', user: 'alice', scoreScale: PROPORTIONAL_SCALE },
  { id: 'bundle', label: 'Bundle Size (KB)', user: 'alice', scoreScale: PROPORTIONAL_SCALE },
];

const scoresProportional: ScoreEntry[] = [
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

/** Proportional scale — raw counts are normalized at display time; highest value = 100%. */
export const ProportionalScale: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaProportional, tools, scores: scoresProportional }),
      [],
    );
    return (
      <PughStoreProvider store={store}>
        <PughMatrix showWinner />
      </PughStoreProvider>
    );
  },
};
