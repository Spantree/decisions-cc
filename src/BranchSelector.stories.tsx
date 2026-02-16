import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BranchSelector } from './BranchSelector';
import PughMatrix from './PughMatrix';
import { createPughStore } from './store/createPughStore';
import { createLocalStoragePersister } from './persist/localStoragePersister';
import { PughStoreProvider } from './store/PughStoreProvider';
import './pugh-matrix.css';

const criteria = [
  { id: 'cost', label: 'Cost', user: 'alice' },
  { id: 'performance', label: 'Performance', user: 'alice' },
  { id: 'ease-of-use', label: 'Ease of Use', user: 'alice' },
];
const tools = [
  { id: 'react', label: 'React', user: 'alice' },
  { id: 'vue', label: 'Vue', user: 'alice' },
  { id: 'svelte', label: 'Svelte', user: 'alice' },
];

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
      state().addScore({ id: 'm1', toolId: 'react', criterionId: 'cost', score: 5, label: 'Moderate', timestamp: t, user: 'alice' });
      state().addScore({ id: 'm2', toolId: 'react', criterionId: 'performance', score: 6, label: 'Decent', timestamp: t, user: 'alice' });
      state().addScore({ id: 'm3', toolId: 'react', criterionId: 'ease-of-use', score: 5, label: 'Average', timestamp: t, user: 'alice' });
      state().addScore({ id: 'm4', toolId: 'vue', criterionId: 'cost', score: 6, label: 'Fair', timestamp: t, user: 'alice' });
      state().addScore({ id: 'm5', toolId: 'vue', criterionId: 'performance', score: 5, label: 'OK', timestamp: t, user: 'alice' });
      state().addScore({ id: 'm6', toolId: 'vue', criterionId: 'ease-of-use', score: 7, label: 'Good', timestamp: t, user: 'alice' });
      state().addScore({ id: 'm7', toolId: 'svelte', criterionId: 'cost', score: 7, label: 'Cheap', timestamp: t, user: 'alice' });
      state().addScore({ id: 'm8', toolId: 'svelte', criterionId: 'performance', score: 6, label: 'Decent', timestamp: t, user: 'alice' });
      state().addScore({ id: 'm9', toolId: 'svelte', criterionId: 'ease-of-use', score: 5, label: 'Average', timestamp: t, user: 'alice' });

      // -- 'pro-react': Bob loves React, adds Angular, tanks the rest --
      state().createBranch('pro-react');
      state().addTool('angular', 'Angular', 'bob');
      state().addScore({ id: 'e1', toolId: 'react', criterionId: 'cost', score: 10, label: 'Free!', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e2', toolId: 'react', criterionId: 'performance', score: 10, label: 'Blazing', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e3', toolId: 'react', criterionId: 'ease-of-use', score: 9, label: 'Great DX', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e4', toolId: 'vue', criterionId: 'cost', score: 2, label: 'Expensive', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e5', toolId: 'vue', criterionId: 'performance', score: 1, label: 'Slow', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e6', toolId: 'vue', criterionId: 'ease-of-use', score: 3, label: 'Confusing', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e7', toolId: 'svelte', criterionId: 'cost', score: 2, label: 'Niche', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e8', toolId: 'svelte', criterionId: 'performance', score: 3, label: 'Unproven', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e9', toolId: 'svelte', criterionId: 'ease-of-use', score: 2, label: 'Weird', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e10', toolId: 'angular', criterionId: 'cost', score: 8, label: 'Free', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e11', toolId: 'angular', criterionId: 'performance', score: 7, label: 'Solid', timestamp: t + 1, user: 'bob' });
      state().addScore({ id: 'e12', toolId: 'angular', criterionId: 'ease-of-use', score: 4, label: 'Steep', timestamp: t + 1, user: 'bob' });

      // -- 'svelte-wins': Carol removes React, renames criterion, Svelte dominates --
      state().switchBranch('main');
      state().createBranch('svelte-wins');
      state().removeTool('react');
      state().renameCriterion('ease-of-use', 'Developer Joy');
      state().addScore({ id: 'c1', toolId: 'svelte', criterionId: 'cost', score: 10, label: 'Free', timestamp: t + 2, user: 'carol' });
      state().addScore({ id: 'c2', toolId: 'svelte', criterionId: 'performance', score: 10, label: 'Fastest', timestamp: t + 2, user: 'carol' });
      state().addScore({ id: 'c3', toolId: 'svelte', criterionId: 'ease-of-use', score: 10, label: 'Joyful', timestamp: t + 2, user: 'carol' });
      state().addScore({ id: 'c4', toolId: 'vue', criterionId: 'cost', score: 3, label: 'Costly', timestamp: t + 2, user: 'carol' });
      state().addScore({ id: 'c5', toolId: 'vue', criterionId: 'performance', score: 4, label: 'Meh', timestamp: t + 2, user: 'carol' });
      state().addScore({ id: 'c6', toolId: 'vue', criterionId: 'ease-of-use', score: 3, label: 'Tedious', timestamp: t + 2, user: 'carol' });

      // Start on main
      state().switchBranch('main');
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
