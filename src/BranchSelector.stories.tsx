import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BranchSelector } from './BranchSelector';
import PughMatrix from './PughMatrix';
import { createPughStore } from './store/createPughStore';
import { createLocalStoragePersister } from './persist/localStoragePersister';
import { PughStoreProvider } from './store/PughStoreProvider';
import { scoreId, toolId as makeToolId, MAIN_BRANCH_ID } from './ids';
import { LABELS_COST_1_10 } from './types';
import type { ScaleType } from './types';
import './pugh-matrix.css';

const NUMERIC_1_10_COST: ScaleType = { kind: 'numeric', min: 1, max: 10, step: 1, labels: LABELS_COST_1_10.labels };
const NUMERIC_1_10_BARE: ScaleType = { kind: 'numeric', min: 1, max: 10, step: 1 };

const criteria = [
  { id: 'cost', label: 'Cost', user: 'alice', scale: NUMERIC_1_10_COST },
  { id: 'performance', label: 'Performance', user: 'alice', scale: NUMERIC_1_10_BARE },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice', scale: NUMERIC_1_10_BARE },
];
const tools = [
  { id: 'react', label: 'React', user: 'alice' },
  { id: 'vue', label: 'Vue', user: 'alice' },
  { id: 'svelte', label: 'Svelte', user: 'alice' },
];

const [costCri, perfCri, eouCri] = criteria;
const [reactTool, vueTool, svelteTool] = tools;

function StoryBranchSelector({
  isDark,
  prePopulateBranches,
  showMatrix,
  persistKey,
}: {
  isDark?: boolean;
  prePopulateBranches?: boolean;
  showMatrix?: boolean;
  persistKey?: string;
}) {
  const [resetKey, setResetKey] = useState(0);
  const store = useMemo(() => {
    // Check for persisted data BEFORE creating the store so seeding
    // never races with rehydration.
    const hasSavedData = persistKey && (() => { try { return !!localStorage.getItem(persistKey); } catch { return false; } })();
    const s = createPughStore({
      criteria,
      tools,
      ...(persistKey && {
        persistKey,
        persister: createLocalStoragePersister(),
      }),
    });
    if (prePopulateBranches && !hasSavedData) {
      const state = () => s.getState();
      const t = Date.now();

      // -- main: moderate baseline (yellows/limes) --
      state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: costCri.id, score: 5, timestamp: t, user: 'alice' });
      state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: perfCri.id, score: 6, timestamp: t, user: 'alice' });
      state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: eouCri.id, score: 5, timestamp: t, user: 'alice' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: costCri.id, score: 6, timestamp: t, user: 'alice' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: perfCri.id, score: 5, timestamp: t, user: 'alice' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: eouCri.id, score: 7, timestamp: t, user: 'alice' });
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: costCri.id, score: 7, timestamp: t, user: 'alice' });
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: perfCri.id, score: 6, timestamp: t, user: 'alice' });
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: eouCri.id, score: 5, timestamp: t, user: 'alice' });

      // -- 'pro-react': Bob loves React, adds Angular, tanks the rest --
      state().createBranch('pro-react');
      const angularId = makeToolId();
      state().addTool(angularId, 'Angular', 'bob');
      state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: costCri.id, score: 10, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: perfCri.id, score: 10, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: eouCri.id, score: 9, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: costCri.id, score: 2, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: perfCri.id, score: 1, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: eouCri.id, score: 3, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: costCri.id, score: 2, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: perfCri.id, score: 3, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: eouCri.id, score: 2, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: angularId, criterionId: costCri.id, score: 8, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: angularId, criterionId: perfCri.id, score: 7, timestamp: t + 1, user: 'bob' });
      state().addScore({ id: scoreId(), toolId: angularId, criterionId: eouCri.id, score: 4, timestamp: t + 1, user: 'bob' });

      // -- 'svelte-wins': Carol removes React, renames criterion, Svelte dominates --
      state().switchBranch(MAIN_BRANCH_ID);
      state().createBranch('svelte-wins');
      state().removeTool(reactTool.id);
      state().renameCriterion(eouCri.id, 'Developer Joy');
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: costCri.id, score: 10, timestamp: t + 2, user: 'carol' });
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: perfCri.id, score: 10, timestamp: t + 2, user: 'carol' });
      state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: eouCri.id, score: 10, timestamp: t + 2, user: 'carol' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: costCri.id, score: 3, timestamp: t + 2, user: 'carol' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: perfCri.id, score: 4, timestamp: t + 2, user: 'carol' });
      state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: eouCri.id, score: 3, timestamp: t + 2, user: 'carol' });

      // Start on main
      state().switchBranch(MAIN_BRANCH_ID);
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prePopulateBranches, persistKey, resetKey]);

  const handleClear = persistKey
    ? () => {
        try { localStorage.removeItem(persistKey); } catch {}
        setResetKey((k) => k + 1);
      }
    : undefined;

  return (
    <PughStoreProvider store={store}>
      {handleClear && (
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={handleClear}
            style={{ fontSize: 13, cursor: 'pointer', padding: '4px 10px' }}
          >
            Clear saved data
          </button>
        </div>
      )}
      <BranchSelector isDark={isDark} />
      {showMatrix && (
        <PughMatrix isDark={isDark} />
      )}
    </PughStoreProvider>
  );
}

const meta: Meta<typeof StoryBranchSelector> = {
  title: 'BranchSelector',
  component: StoryBranchSelector,
  argTypes: {
    isDark: {
      control: 'boolean',
      description: 'Enable dark mode styling',
    },
    prePopulateBranches: {
      control: 'boolean',
      description: 'Pre-populate with multiple branches',
    },
    showMatrix: {
      control: 'boolean',
      description: 'Show a PughMatrix below the branch selector',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StoryBranchSelector>;

/** Default — single main branch. */
export const Default: Story = {};

/** Multiple branches: main + pro-react + svelte-wins. */
export const MultipleBranches: Story = {
  args: {
    prePopulateBranches: true,
  },
};

/** Dark mode styling. */
export const DarkMode: Story = {
  args: {
    isDark: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/** Branch selector with an embedded PughMatrix — edits and branches persist across reloads. */
export const WithMatrix: Story = {
  args: {
    prePopulateBranches: true,
    showMatrix: true,
    persistKey: 'pugh-branch-demo',
  },
};

/** WithMatrix in dark mode — edits and branches persist across reloads. */
export const WithMatrixDark: Story = {
  args: {
    prePopulateBranches: true,
    showMatrix: true,
    isDark: true,
    persistKey: 'pugh-branch-demo-dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
