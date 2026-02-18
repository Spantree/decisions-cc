import { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent } from 'storybook/test';
import PughMatrix from './PughMatrix';
import { createPughStore } from './store/createPughStore';
import { PughStoreProvider } from './store/PughStoreProvider';
import { createLocalStorageRepository } from './repository/localStorage';
import { scoreId } from './ids';
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
  label: string,
  timestamp: number,
  comment?: string,
): ScoreEntry {
  return {
    id: scoreId(),
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
  entry(reactTool.id, costCri.id, 9, 'Free', t1),
  entry(reactTool.id, perfCri.id, 7, 'Good', t1),
  entry(reactTool.id, eouCri.id, 6, 'Moderate', t1),
  entry(reactTool.id, commCri.id, 10, 'Massive', t1),
  entry(reactTool.id, docsCri.id, 8, 'Extensive', t1),

  entry(vueTool.id, costCri.id, 9, 'Free', t1),
  entry(vueTool.id, perfCri.id, 8, 'Great', t1),
  entry(vueTool.id, eouCri.id, 9, 'Easy', t1),
  entry(vueTool.id, commCri.id, 7, 'Strong', t1),
  entry(vueTool.id, docsCri.id, 9, 'Excellent', t1),

  entry(svelteTool.id, costCri.id, 9, 'Free', t1),
  entry(svelteTool.id, perfCri.id, 10, 'Fastest', t1),
  entry(svelteTool.id, eouCri.id, 8, 'Simple', t1),
  entry(svelteTool.id, commCri.id, 5, 'Growing', t1),
  entry(svelteTool.id, docsCri.id, 7, 'Good', t1),

  entry(angularTool.id, costCri.id, 9, 'Free', t1),
  entry(angularTool.id, perfCri.id, 6, 'Decent', t1),
  entry(angularTool.id, eouCri.id, 4, 'Complex', t1),
  entry(angularTool.id, commCri.id, 8, 'Large', t1),
  entry(angularTool.id, docsCri.id, 8, 'Thorough', t1),
];

// Scores with history: some cells have revised entries
const scoresWithHistory: ScoreEntry[] = [
  ...scores,
  entry(reactTool.id, costCri.id, 7, 'Revised', t2, 'Hidden infra costs'),
  entry(reactTool.id, perfCri.id, 8, 'Improved', t2, 'After React 19 release'),
  entry(svelteTool.id, commCri.id, 7, 'Growing Fast', t2, 'SvelteKit adoption boosted ecosystem'),
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
    const button = await canvas.findByRole('button', { name: /show totals/i });
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
/*  localStorage persistence story                                    */
/* ------------------------------------------------------------------ */

const PERSIST_PREFIX = 'pugh-storybook-demo';

/**
 * Store with localStorage persistence — edits survive page reloads.
 * Click any cell to add a score. Use "Clear saved data" to reset to defaults.
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
          repository: createLocalStorageRepository(PERSIST_PREFIX),
        }),
      [resetKey],
    );
    const handleClear = () => {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(PERSIST_PREFIX)) keys.push(key);
        }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {}
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
