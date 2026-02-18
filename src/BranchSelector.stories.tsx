import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BranchSelector } from './BranchSelector';
import PughMatrix from './PughMatrix';
import { createPughStore } from './store/createPughStore';
import { createLocalStorageRepository } from './repository/localStorage';
import { PughStoreProvider } from './store/PughStoreProvider';
import { scoreId, toolId as makeToolId } from './ids';
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

const [costCri, perfCri, eouCri] = criteria;
const [reactTool, vueTool, svelteTool] = tools;

function StoryBranchSelector({
  isDark,
  prePopulateBranches,
  showMatrix,
  persistPrefix,
}: {
  isDark?: boolean;
  prePopulateBranches?: boolean;
  showMatrix?: boolean;
  persistPrefix?: string;
}) {
  const [resetKey, setResetKey] = useState(0);
  const store = useMemo(() => {
    const s = createPughStore({
      criteria,
      tools,
      ...(persistPrefix && {
        repository: createLocalStorageRepository(persistPrefix),
      }),
    });

    if (prePopulateBranches) {
      // Wait for init, then populate
      const state = () => s.getState();

      // We need to add scores after init completes. Since init is async
      // and fires in PughStoreProvider, we schedule population after init.
      const unsubscribe = s.subscribe((curr) => {
        if (!curr.isLoading && unsubscribe) {
          unsubscribe();
          const t = Date.now();

          // -- main: moderate baseline --
          state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: costCri.id, score: 5, label: 'Moderate', timestamp: t, user: 'alice' });
          state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: perfCri.id, score: 6, label: 'Decent', timestamp: t, user: 'alice' });
          state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: eouCri.id, score: 5, label: 'Average', timestamp: t, user: 'alice' });
          state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: costCri.id, score: 6, label: 'Fair', timestamp: t, user: 'alice' });
          state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: perfCri.id, score: 5, label: 'OK', timestamp: t, user: 'alice' });
          state().addScore({ id: scoreId(), toolId: vueTool.id, criterionId: eouCri.id, score: 7, label: 'Good', timestamp: t, user: 'alice' });
          state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: costCri.id, score: 7, label: 'Cheap', timestamp: t, user: 'alice' });
          state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: perfCri.id, score: 6, label: 'Decent', timestamp: t, user: 'alice' });
          state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: eouCri.id, score: 5, label: 'Average', timestamp: t, user: 'alice' });

          // -- 'pro-react': Bob loves React --
          setTimeout(() => {
            state().createBranch('pro-react');
            setTimeout(() => {
              const angularId = makeToolId();
              state().addTool(angularId, 'Angular', 'bob');
              state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: costCri.id, score: 10, label: 'Free!', timestamp: t + 1, user: 'bob' });
              state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: perfCri.id, score: 10, label: 'Blazing', timestamp: t + 1, user: 'bob' });
              state().addScore({ id: scoreId(), toolId: reactTool.id, criterionId: eouCri.id, score: 9, label: 'Great DX', timestamp: t + 1, user: 'bob' });

              // -- 'svelte-wins': switch back to main, then fork --
              setTimeout(() => {
                state().switchBranch('main');
                setTimeout(() => {
                  state().createBranch('svelte-wins');
                  setTimeout(() => {
                    state().removeTool(reactTool.id);
                    state().renameCriterion(eouCri.id, 'Developer Joy');
                    state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: costCri.id, score: 10, label: 'Free', timestamp: t + 2, user: 'carol' });
                    state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: perfCri.id, score: 10, label: 'Fastest', timestamp: t + 2, user: 'carol' });
                    state().addScore({ id: scoreId(), toolId: svelteTool.id, criterionId: eouCri.id, score: 10, label: 'Joyful', timestamp: t + 2, user: 'carol' });

                    // Start on main
                    setTimeout(() => state().switchBranch('main'), 50);
                  }, 50);
                }, 50);
              }, 50);
            }, 50);
          }, 50);
        }
      });
    }

    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prePopulateBranches, persistPrefix, resetKey]);

  const handleClear = persistPrefix
    ? () => {
        try {
          // Clear all keys with this prefix
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(persistPrefix)) keys.push(key);
          }
          keys.forEach((k) => localStorage.removeItem(k));
        } catch {}
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
    persistPrefix: 'pugh-branch-demo',
  },
};

/** WithMatrix in dark mode — edits and branches persist across reloads. */
export const WithMatrixDark: Story = {
  args: {
    prePopulateBranches: true,
    showMatrix: true,
    isDark: true,
    persistPrefix: 'pugh-branch-demo-dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
