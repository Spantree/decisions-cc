import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, within, userEvent } from 'storybook/test';
import PughMatrix from './PughMatrix';
import './pugh-matrix.css';
import type { ScoreEntry } from './types';

const criteria = ['Cost', 'Performance', 'Ease of Use', 'Community Support', 'Documentation'];
const tools = ['React', 'Vue', 'Svelte', 'Angular'];

let idCounter = 0;
function entry(
  tool: string,
  criterion: string,
  score: number,
  label: string,
  timestamp: number,
  comment?: string,
): ScoreEntry {
  return {
    id: `s${++idCounter}`,
    tool,
    criterion,
    score,
    label,
    comment,
    timestamp,
  };
}

const t1 = 1707600000000; // Feb 11, 2024
const t2 = 1707686400000; // Feb 12, 2024

const scores: ScoreEntry[] = [
  entry('React', 'Cost', 9, 'Free', t1),
  entry('React', 'Performance', 7, 'Good', t1),
  entry('React', 'Ease of Use', 6, 'Moderate', t1),
  entry('React', 'Community Support', 10, 'Massive', t1),
  entry('React', 'Documentation', 8, 'Extensive', t1),

  entry('Vue', 'Cost', 9, 'Free', t1),
  entry('Vue', 'Performance', 8, 'Great', t1),
  entry('Vue', 'Ease of Use', 9, 'Easy', t1),
  entry('Vue', 'Community Support', 7, 'Strong', t1),
  entry('Vue', 'Documentation', 9, 'Excellent', t1),

  entry('Svelte', 'Cost', 9, 'Free', t1),
  entry('Svelte', 'Performance', 10, 'Fastest', t1),
  entry('Svelte', 'Ease of Use', 8, 'Simple', t1),
  entry('Svelte', 'Community Support', 5, 'Growing', t1),
  entry('Svelte', 'Documentation', 7, 'Good', t1),

  entry('Angular', 'Cost', 9, 'Free', t1),
  entry('Angular', 'Performance', 6, 'Decent', t1),
  entry('Angular', 'Ease of Use', 4, 'Complex', t1),
  entry('Angular', 'Community Support', 8, 'Large', t1),
  entry('Angular', 'Documentation', 8, 'Thorough', t1),
];

// Scores with history: some cells have revised entries
const scoresWithHistory: ScoreEntry[] = [
  ...scores,
  entry('React', 'Cost', 7, 'Revised', t2, 'Hidden infra costs'),
  entry('React', 'Performance', 8, 'Improved', t2, 'After React 19 release'),
  entry('Svelte', 'Community Support', 7, 'Growing Fast', t2, 'SvelteKit adoption boosted ecosystem'),
];

const meta: Meta<typeof PughMatrix> = {
  title: 'PughMatrix',
  component: PughMatrix,
  args: {
    criteria,
    tools,
    scores,
  },
  argTypes: {
    highlight: {
      control: 'select',
      options: [undefined, ...tools],
      description: 'Tool name to visually highlight a column',
    },
    showWinner: {
      control: 'boolean',
      description: 'Highlight the highest weighted-total column in gold with a crown',
    },
    isDark: {
      control: 'boolean',
      description: 'Enable dark mode styling',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PughMatrix>;

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
    highlight: 'Vue',
  },
};

/** Highlighting a different column for comparison. */
export const HighlightSvelte: Story = {
  args: {
    highlight: 'Svelte',
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
    highlight: 'React',
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
    highlight: 'Angular',
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

/** Editable mode — click a cell to add a new score. The cell updates in place. */
export const Editable: Story = {
  args: {
    scores: scoresWithHistory,
  },
  render: (args) => {
    const [localScores, setLocalScores] = useState(args.scores ?? scoresWithHistory);
    return (
      <PughMatrix
        {...args}
        scores={localScores}
        onScoreAdd={(newEntry) => {
          setLocalScores((prev) => [
            ...prev,
            {
              ...newEntry,
              id: `new-${Date.now()}`,
              timestamp: Date.now(),
            },
          ]);
        }}
      />
    );
  },
};

/** Editable mode in dark theme. */
export const EditableDarkMode: Story = {
  args: {
    scores: scoresWithHistory,
    isDark: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: (args) => {
    const [localScores, setLocalScores] = useState(args.scores ?? scoresWithHistory);
    return (
      <PughMatrix
        {...args}
        scores={localScores}
        onScoreAdd={(newEntry) => {
          setLocalScores((prev) => [
            ...prev,
            {
              ...newEntry,
              id: `new-${Date.now()}`,
              timestamp: Date.now(),
            },
          ]);
        }}
      />
    );
  },
};

/** Read-only with onScoreAdd spy — actions logged in Storybook actions panel but UI doesn't update. */
export const EditableActionOnly: Story = {
  args: {
    scores: scoresWithHistory,
    onScoreAdd: fn(),
  },
};
