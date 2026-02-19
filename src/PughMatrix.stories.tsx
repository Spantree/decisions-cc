import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent } from 'storybook/test';
import PughMatrix from './PughMatrix';
import { createPughStore } from './store/createPughStore';
import { PughStoreProvider } from './store/PughStoreProvider';
import { createLocalStorageRepository } from './repository/localStorage';
import { ratingId } from './ids';
import './pugh-matrix.css';
import type { Criterion, Option, RatingEntry, ScaleType } from './types';
import { DEFAULT_SCALE, SCALE_NEG2_POS2, LABELS_COST_1_10, LABELS_COST_NEG2_POS2 } from './types';

const NUMERIC_1_10: ScaleType = DEFAULT_SCALE;
const NUMERIC_1_10_BARE: ScaleType = { kind: 'numeric', min: 1, max: 10, step: 1 };
const NUMERIC_NEG2_POS2: ScaleType = SCALE_NEG2_POS2;
const NUMERIC_NEG2_POS2_BARE: ScaleType = { kind: 'numeric', min: -2, max: 2, step: 1 };
const NUMERIC_1_10_COST: ScaleType = { kind: 'numeric', min: 1, max: 10, step: 1, labels: LABELS_COST_1_10.labels };
const NUMERIC_NEG2_POS2_COST: ScaleType = { kind: 'numeric', min: -2, max: 2, step: 1, labels: LABELS_COST_NEG2_POS2.labels };
const UNBOUNDED: ScaleType = { kind: 'unbounded' };
const BINARY: ScaleType = { kind: 'binary' };

const criteria: Criterion[] = [
  { id: 'cost', label: 'Cost', user: 'alice', scale: NUMERIC_1_10_COST },
  { id: 'performance', label: 'Performance', user: 'alice', scale: NUMERIC_1_10_BARE },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice', scale: NUMERIC_1_10_BARE },
  { id: 'community', label: 'Community Support', user: 'alice', scale: NUMERIC_1_10_BARE },
  { id: 'docs', label: 'Documentation', user: 'alice', scale: NUMERIC_1_10 },
];
const options: Option[] = [
  { id: 'react', label: 'React', user: 'alice' },
  { id: 'vue', label: 'Vue', user: 'alice' },
  { id: 'svelte', label: 'Svelte', user: 'alice' },
  { id: 'angular', label: 'Angular', user: 'alice' },
];

const [costCri, perfCri, eouCri, commCri, docsCri] = criteria;
const [reactOpt, vueOpt, svelteOpt, angularOpt] = options;

function entry(
  optionId: string,
  criterionId: string,
  value: number,
  timestamp: number,
  commentOrLabel?: string,
  label?: string,
): RatingEntry {
  // If both args provided: commentOrLabel is comment, label is label.
  // If only one arg: it's a comment (backward compat with existing calls).
  return {
    id: ratingId(),
    optionId,
    criterionId,
    value,
    comment: commentOrLabel,
    label,
    timestamp,
    user: 'alice',
  };
}

function commentOnly(
  optionId: string,
  criterionId: string,
  comment: string,
  timestamp: number,
): RatingEntry {
  return {
    id: ratingId(),
    optionId,
    criterionId,
    comment,
    timestamp,
    user: 'alice',
  };
}

const t1 = 1707600000000; // Feb 11, 2024
const t2 = 1707686400000; // Feb 12, 2024
const t3 = 1707772800000; // Feb 13, 2024

const ratings: RatingEntry[] = [
  // React
  entry(reactOpt.id, costCri.id, 10, t1),
  entry(reactOpt.id, perfCri.id, 7, t1),
  entry(reactOpt.id, eouCri.id, 6, t1),
  entry(reactOpt.id, commCri.id, 10, t1),
  entry(reactOpt.id, docsCri.id, 8, t1),

  // Vue
  entry(vueOpt.id, costCri.id, 10, t1),
  entry(vueOpt.id, perfCri.id, 8, t1),
  entry(vueOpt.id, eouCri.id, 9, t1),
  entry(vueOpt.id, commCri.id, 7, t1),
  entry(vueOpt.id, docsCri.id, 9, t1),

  // Svelte
  entry(svelteOpt.id, costCri.id, 10, t1),
  entry(svelteOpt.id, perfCri.id, 10, t1),
  entry(svelteOpt.id, eouCri.id, 8, t1),
  entry(svelteOpt.id, commCri.id, 5, t1),
  entry(svelteOpt.id, docsCri.id, 7, t1),

  // Angular
  entry(angularOpt.id, costCri.id, 8, t1),
  entry(angularOpt.id, perfCri.id, 6, t1),
  entry(angularOpt.id, eouCri.id, 4, t1),
  entry(angularOpt.id, commCri.id, 8, t1),
  entry(angularOpt.id, docsCri.id, 8, t1),
];

// Ratings with history: some cells have revised entries
const ratingsWithHistory: RatingEntry[] = [
  ...ratings,
  entry(reactOpt.id, costCri.id, 7, t2, 'Hidden infra costs'),
  entry(reactOpt.id, perfCri.id, 8, t2, 'After React 19 release'),
  entry(svelteOpt.id, commCri.id, 7, t2, 'SvelteKit adoption boosted ecosystem'),
];

// Ratings with dialog: comment-only follow-ups that don't overwrite scores
const ratingsWithDialog: RatingEntry[] = [
  ...ratingsWithHistory,
  commentOnly(reactOpt.id, costCri.id, 'But what about hosting?', t3),
  commentOnly(reactOpt.id, costCri.id, 'Vercel free tier covers most use cases', t3 + 1000),
  commentOnly(vueOpt.id, eouCri.id, 'Composition API has a learning curve though', t3),
];

/** Helper: wraps PughMatrix in a store provider for each story. */
function StoryMatrix({
  ratings: storyRatings = ratings,
  highlight,
  showWinner,
  isDark,
  readOnly,
}: {
  ratings?: RatingEntry[];
  highlight?: string;
  showWinner?: boolean;
  isDark?: boolean;
  readOnly?: boolean;
}) {
  const store = useMemo(
    () => createPughStore({ criteria, options, ratings: storyRatings }),
    [storyRatings],
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
      options: [undefined, ...options.map((t) => t.id)],
      description: 'Option ID to visually highlight a column',
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
    highlight: vueOpt.id,
  },
};

/** Highlighting a different column for comparison. */
export const HighlightSvelte: Story = {
  args: {
    highlight: svelteOpt.id,
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
    highlight: reactOpt.id,
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
    highlight: angularOpt.id,
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

/** Cells with rating history — hover a cell to see previous ratings in a tooltip. */
export const WithScoreHistory: Story = {
  args: {
    ratings: ratingsWithHistory,
  },
};

/** Cells with comment-only follow-ups — the score persists while a dialog appears in hover history. */
export const WithDialog: Story = {
  args: {
    ratings: ratingsWithDialog,
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
  { id: 'cost', label: 'Cost', user: 'alice', scale: NUMERIC_NEG2_POS2_COST },
  { id: 'performance', label: 'Performance', user: 'alice', scale: NUMERIC_NEG2_POS2_BARE },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice', scale: NUMERIC_NEG2_POS2_BARE },
];

const ratingsNeg2: RatingEntry[] = [
  entry(reactOpt.id, 'cost', 2, t1),
  entry(reactOpt.id, 'performance', 1, t1),
  entry(reactOpt.id, 'ease-of-use', 0, t1),
  entry(vueOpt.id, 'cost', 1, t1),
  entry(vueOpt.id, 'performance', 2, t1),
  entry(vueOpt.id, 'ease-of-use', 1, t1),
  entry(svelteOpt.id, 'cost', -1, t1),
  entry(svelteOpt.id, 'performance', 2, t1),
  entry(svelteOpt.id, 'ease-of-use', -2, t1),
  entry(angularOpt.id, 'cost', 0, t1),
  entry(angularOpt.id, 'performance', -1, t1),
  entry(angularOpt.id, 'ease-of-use', -1, t1),
];

/** Criteria using the -2 to +2 scale. */
export const Neg2ToPos2Scale: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaNeg2, options, ratings: ratingsNeg2 }),
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

const PERSIST_PREFIX = 'pugh-storybook-demo';

/** Store with localStorage persistence — edits survive page reloads. */
export const WithLocalStorage: Story = {
  render: (args) => {
    const store = useMemo(
      () =>
        createPughStore({
          criteria,
          options,
          ratings: ratingsWithHistory,
          repository: createLocalStorageRepository(PERSIST_PREFIX),
        }),
      [],
    );
    return (
      <PughStoreProvider store={store}>
        <PughMatrix
          highlight={args.highlight}
          showWinner={args.showWinner}
          isDark={args.isDark}
        />
      </PughStoreProvider>
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

const ratingsUnbounded: RatingEntry[] = [
  // GitHub Stars
  entry(reactOpt.id, 'stars', 228000, t1),
  entry(vueOpt.id, 'stars', 208000, t1),
  entry(svelteOpt.id, 'stars', 80000, t1),
  entry(angularOpt.id, 'stars', 96000, t1),

  // npm Weekly Downloads
  entry(reactOpt.id, 'downloads', 25000000, t1),
  entry(vueOpt.id, 'downloads', 4500000, t1),
  entry(svelteOpt.id, 'downloads', 900000, t1),
  entry(angularOpt.id, 'downloads', 3200000, t1),

  // Bundle Size (KB)
  entry(reactOpt.id, 'bundle', 42, t1),
  entry(vueOpt.id, 'bundle', 33, t1),
  entry(svelteOpt.id, 'bundle', 2, t1),
  entry(angularOpt.id, 'bundle', 143, t1),
];

/** Unbounded scale — raw counts normalized at display time; share of total shown as %. */
export const UnboundedScale: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaUnbounded, options, ratings: ratingsUnbounded }),
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

const ratingsBinary: RatingEntry[] = [
  entry(reactOpt.id, 'ssr', 1, t1),
  entry(reactOpt.id, 'typescript', 0, t1),
  entry(reactOpt.id, 'mobile', 1, t1),
  entry(reactOpt.id, 'oss', 1, t1),

  entry(vueOpt.id, 'ssr', 1, t1),
  entry(vueOpt.id, 'typescript', 0, t1),
  entry(vueOpt.id, 'mobile', 0, t1),
  entry(vueOpt.id, 'oss', 1, t1),

  entry(svelteOpt.id, 'ssr', 1, t1),
  entry(svelteOpt.id, 'typescript', 1, t1),
  entry(svelteOpt.id, 'mobile', 0, t1),
  entry(svelteOpt.id, 'oss', 1, t1),

  entry(angularOpt.id, 'ssr', 1, t1),
  entry(angularOpt.id, 'typescript', 1, t1),
  entry(angularOpt.id, 'mobile', 1, t1),
  entry(angularOpt.id, 'oss', 1, t1),
];

/** Binary scale — yes/no criteria scored as 1/0. */
export const BinaryScale: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaBinary, options, ratings: ratingsBinary }),
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

const ratingsDecimal: RatingEntry[] = [
  entry(reactOpt.id, 'rating', 4.5, t1),
  entry(reactOpt.id, 'latency', 7.3, t1),
  entry(vueOpt.id, 'rating', 4.0, t1),
  entry(vueOpt.id, 'latency', 8.1, t1),
  entry(svelteOpt.id, 'rating', 5.0, t1),
  entry(svelteOpt.id, 'latency', 9.2, t1),
  entry(angularOpt.id, 'rating', 3.5, t1),
  entry(angularOpt.id, 'latency', 6.5, t1),
];

/** Decimal step scales — criteria with step 0.5 and step 0.1. */
export const DecimalStep: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaDecimal, options, ratings: ratingsDecimal }),
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
  { id: 'cost', label: 'Cost', user: 'alice', scale: NUMERIC_1_10_COST },
  { id: 'ssr', label: 'SSR Support', user: 'alice', scale: BINARY },
  { id: 'stars', label: 'GitHub Stars', user: 'alice', scale: UNBOUNDED },
  { id: 'rating', label: 'User Rating (0-5)', user: 'alice', scale: HALF_STEP },
];

const ratingsMixed: RatingEntry[] = [
  entry(reactOpt.id, 'cost', 10, t1),
  entry(reactOpt.id, 'ssr', 1, t1),
  entry(reactOpt.id, 'stars', 228000, t1),
  entry(reactOpt.id, 'rating', 4.5, t1),

  entry(vueOpt.id, 'cost', 10, t1),
  entry(vueOpt.id, 'ssr', 1, t1),
  entry(vueOpt.id, 'stars', 208000, t1),
  entry(vueOpt.id, 'rating', 4.0, t1),

  entry(svelteOpt.id, 'cost', 10, t1),
  entry(svelteOpt.id, 'ssr', 1, t1),
  entry(svelteOpt.id, 'stars', 80000, t1),
  entry(svelteOpt.id, 'rating', 5.0, t1),

  entry(angularOpt.id, 'cost', 8, t1),
  entry(angularOpt.id, 'ssr', 1, t1),
  entry(angularOpt.id, 'stars', 96000, t1),
  entry(angularOpt.id, 'rating', 3.5, t1),
];

/** Mixed scales — matrix combining numeric, binary, unbounded, and decimal criteria. */
export const MixedScales: Story = {
  render: () => {
    const store = useMemo(
      () => createPughStore({ criteria: criteriaMixed, options, ratings: ratingsMixed }),
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

const ratingsSigned: RatingEntry[] = [
  entry(reactOpt.id, 'impact', 4, t1),
  entry(reactOpt.id, 'risk', -2, t1),
  entry(reactOpt.id, 'effort', -1, t1),

  entry(vueOpt.id, 'impact', 3, t1),
  entry(vueOpt.id, 'risk', 1, t1),
  entry(vueOpt.id, 'effort', 2, t1),

  entry(svelteOpt.id, 'impact', 5, t1),
  entry(svelteOpt.id, 'risk', -3, t1),
  entry(svelteOpt.id, 'effort', -4, t1),

  entry(angularOpt.id, 'impact', 0, t1),
  entry(angularOpt.id, 'risk', -5, t1),
  entry(angularOpt.id, 'effort', 3, t1),
];

/** Signed scale — matrix with allowNegative and -5 to +5 range. Negative=red, zero=yellow, positive=green. */
export const SignedScale: Story = {
  render: () => {
    // We need to create a store and manually dispatch MatrixCreated to set allowNegative
    const store = useMemo(() => {
      const s = createPughStore({ criteria: criteriaSigned, options, ratings: ratingsSigned });
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
        branchId: 'main',
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
