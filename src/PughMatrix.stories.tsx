import { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent } from 'storybook/test';
import PughMatrix from './PughMatrix';
import { createPughStore } from './store/createPughStore';
import { PughStoreProvider } from './store/PughStoreProvider';
import { createLocalStoragePersister } from './persist/localStoragePersister';
import './pugh-matrix.css';
import type { Criterion, Tool, ScoreEntry } from './types';

const criteria: Criterion[] = [
  { id: 'cost', label: 'Cost', user: 'alice' },
  { id: 'performance', label: 'Performance', user: 'alice' },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice' },
  { id: 'community', label: 'Community Support', user: 'alice' },
  { id: 'docs', label: 'Documentation', user: 'alice' },
];
const tools: Tool[] = [
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue' },
  { id: 'svelte', label: 'Svelte' },
  { id: 'angular', label: 'Angular' },
];

let idCounter = 0;
function entry(
  toolId: string,
  criterionId: string,
  score: number,
  label: string,
  timestamp: number,
  comment?: string,
): ScoreEntry {
  return {
    id: `s${++idCounter}`,
    toolId,
    criterionId,
    score,
    label,
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
    id: `s${++idCounter}`,
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
  entry('react', 'cost', 9, 'Free', t1),
  entry('react', 'performance', 7, 'Good', t1),
  entry('react', 'ease-of-use', 6, 'Moderate', t1),
  entry('react', 'community', 10, 'Massive', t1),
  entry('react', 'docs', 8, 'Extensive', t1),

  entry('vue', 'cost', 9, 'Free', t1),
  entry('vue', 'performance', 8, 'Great', t1),
  entry('vue', 'ease-of-use', 9, 'Easy', t1),
  entry('vue', 'community', 7, 'Strong', t1),
  entry('vue', 'docs', 9, 'Excellent', t1),

  entry('svelte', 'cost', 9, 'Free', t1),
  entry('svelte', 'performance', 10, 'Fastest', t1),
  entry('svelte', 'ease-of-use', 8, 'Simple', t1),
  entry('svelte', 'community', 5, 'Growing', t1),
  entry('svelte', 'docs', 7, 'Good', t1),

  entry('angular', 'cost', 9, 'Free', t1),
  entry('angular', 'performance', 6, 'Decent', t1),
  entry('angular', 'ease-of-use', 4, 'Complex', t1),
  entry('angular', 'community', 8, 'Large', t1),
  entry('angular', 'docs', 8, 'Thorough', t1),
];

// Scores with history: some cells have revised entries
const scoresWithHistory: ScoreEntry[] = [
  ...scores,
  entry('react', 'cost', 7, 'Revised', t2, 'Hidden infra costs'),
  entry('react', 'performance', 8, 'Improved', t2, 'After React 19 release'),
  entry('svelte', 'community', 7, 'Growing Fast', t2, 'SvelteKit adoption boosted ecosystem'),
];

// Scores with dialog: comment-only follow-ups that don't overwrite scores
const scoresWithDialog: ScoreEntry[] = [
  ...scoresWithHistory,
  commentOnly('react', 'cost', 'But what about hosting?', t3),
  commentOnly('react', 'cost', 'Vercel free tier covers most use cases', t3 + 1000),
  commentOnly('vue', 'ease-of-use', 'Composition API has a learning curve though', t3),
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
    highlight: 'vue',
  },
};

/** Highlighting a different column for comparison. */
export const HighlightSvelte: Story = {
  args: {
    highlight: 'svelte',
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
    highlight: 'react',
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
    highlight: 'angular',
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
