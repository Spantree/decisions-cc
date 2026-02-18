import { createStore, type StateCreator } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import type { Criterion, Tool, ScoreEntry } from '../types';
import type { PughStore } from './types';
import type { PughEvent } from '../events/types';
import type { MatrixRepository } from '../repository/types';
import { projectEvents } from '../events/projection';
import { seedEventsFromOptions } from '../events/seedFromLegacy';
import { eventId } from '../ids';
import { createMemoryRepository } from '../repository/memory';

export interface CreatePughStoreOptions {
  criteria?: Criterion[];
  tools?: Tool[];
  scores?: ScoreEntry[];
  weights?: Record<string, number>;
  repository?: MatrixRepository;
}

function makeEvent(type: PughEvent['type'], payload: Record<string, unknown>): PughEvent {
  return {
    id: eventId(),
    timestamp: Date.now(),
    user: 'anonymous',
    type,
    ...payload,
  } as PughEvent;
}

export function createPughStore(options: CreatePughStoreOptions = {}) {
  const {
    criteria = [],
    tools = [],
    scores = [],
    weights = {},
    repository = createMemoryRepository(),
  } = options;

  const initialEvents = seedEventsFromOptions({ criteria, tools, scores, weights });
  const initialDomain = projectEvents(initialEvents);

  let commitTimer: ReturnType<typeof setTimeout> | null = null;

  const storeCreator: StateCreator<PughStore> = (_set, get) => {
    type Action = string | { type: string; [k: string]: unknown };
    const set: {
      (partial: PughStore | Partial<PughStore> | ((state: PughStore) => PughStore | Partial<PughStore>), replace?: false, action?: Action): void;
      (state: PughStore | ((state: PughStore) => PughStore), replace: true, action?: Action): void;
    } = _set as any;

    function scheduleCommit() {
      if (commitTimer) clearTimeout(commitTimer);
      commitTimer = setTimeout(() => {
        const state = get();
        if (state.pendingEvents.length > 0) {
          state.commitPending();
        }
      }, 300);
    }

    async function flushPending() {
      if (commitTimer) {
        clearTimeout(commitTimer);
        commitTimer = null;
      }
      const state = get();
      if (state.pendingEvents.length > 0) {
        await state.commitPending();
      }
    }

    return ({
      // Domain state (projected from events)
      ...initialDomain,

      // Event store state
      events: initialEvents,
      pendingEvents: [] as PughEvent[],
      activeBranch: 'main',
      branchNames: ['main'],
      commitLog: [],
      isLoading: true,
      comparingBranch: null,
      branchDiff: null,

      // Event store actions
      dispatch: (event: PughEvent) => {
        const state = get();
        const pendingEvents = [...state.pendingEvents, event];
        const allEvents = [...state.events, ...pendingEvents];
        const domain = projectEvents(allEvents);
        set({ pendingEvents, ...domain }, false, `event/${event.type}`);
        scheduleCommit();
      },

      commitPending: async (comment?) => {
        const state = get();
        if (state.pendingEvents.length === 0) return;

        const eventsToCommit = [...state.pendingEvents];
        // Clear pending immediately so new dispatches don't double-commit
        set({ pendingEvents: [] }, false, 'commitPending/start');

        try {
          const commit = await repository.commit(
            state.activeBranch,
            eventsToCommit,
            'anonymous',
            comment,
          );
          const newEvents = [...state.events, ...eventsToCommit];
          const commitLog = await repository.log(state.activeBranch);
          set({ events: newEvents, commitLog }, false, { type: 'commitPending/done', commitId: commit.id });
        } catch {
          // Restore pending events on failure
          const current = get();
          set({ pendingEvents: [...eventsToCommit, ...current.pendingEvents] }, false, 'commitPending/error');
        }
      },

      init: async () => {
        try {
          const mainRef = await repository.refs.getRef('main');
          if (mainRef) {
            // Existing repo — hydrate from it
            const events = await repository.checkout('main');
            const domain = projectEvents(events);
            const commitLog = await repository.log('main');
            const refs = await repository.refs.listRefs();
            const branchNames = refs.filter((r) => r.type === 'branch').map((r) => r.name);
            set({ events, ...domain, commitLog, branchNames, activeBranch: 'main', isLoading: false }, false, 'init/hydrate');
          } else {
            // No repo yet — commit seed events
            if (initialEvents.length > 0) {
              await repository.commit('main', initialEvents, 'system', 'Initial seed');
            } else {
              // Create an empty initial commit so the main ref exists
              await repository.commit('main', [], 'system', 'Initial empty commit');
            }
            const commitLog = await repository.log('main');
            set({ commitLog, isLoading: false }, false, 'init/seed');
          }
        } catch {
          // On error, still mark as loaded so the UI isn't stuck
          set({ isLoading: false }, false, 'init/error');
        }
      },

      refreshBranches: async () => {
        const refs = await repository.refs.listRefs();
        const branchNames = refs.filter((r) => r.type === 'branch').map((r) => r.name);
        set({ branchNames }, false, 'refreshBranches');
      },

      compareBranch: (branchName: string) => {
        const doCompare = async () => {
          await flushPending();
          const state = get();
          const diff = await repository.diff(branchName, state.activeBranch);
          set({ comparingBranch: branchName, branchDiff: diff }, false, { type: 'compareBranch', branchName });
        };
        doCompare();
      },

      cancelCompare: () => {
        set({ comparingBranch: null, branchDiff: null }, false, 'cancelCompare');
      },

      mergeBranch: (sourceBranch: string) => {
        const doMerge = async () => {
          await flushPending();
          const state = get();
          await repository.merge(sourceBranch, state.activeBranch, 'theirs', 'anonymous');
          // Re-checkout active branch to refresh events/domain
          const events = await repository.checkout(state.activeBranch);
          const domain = projectEvents(events);
          const commitLog = await repository.log(state.activeBranch);
          const refs = await repository.refs.listRefs();
          const branchNames = refs.filter((r) => r.type === 'branch').map((r) => r.name);
          set({
            events,
            ...domain,
            commitLog,
            branchNames,
            pendingEvents: [],
            comparingBranch: null,
            branchDiff: null,
          }, false, { type: 'mergeBranch', sourceBranch });
        };
        doMerge();
      },

      createBranch: (name: string) => {
        const doCreate = async () => {
          await flushPending();
          const state = get();
          await repository.fork(name, state.activeBranch);
          const events = await repository.checkout(name);
          const domain = projectEvents(events);
          const commitLog = await repository.log(name);
          const refs = await repository.refs.listRefs();
          const branchNames = refs.filter((r) => r.type === 'branch').map((r) => r.name);
          set({ activeBranch: name, events, ...domain, commitLog, branchNames, pendingEvents: [] }, false, { type: 'createBranch', name });
        };
        doCreate();
      },

      switchBranch: (branchName: string) => {
        const doSwitch = async () => {
          await flushPending();
          const events = await repository.checkout(branchName);
          const domain = projectEvents(events);
          const commitLog = await repository.log(branchName);
          set({ activeBranch: branchName, events, ...domain, commitLog, pendingEvents: [] }, false, { type: 'switchBranch', branchName });
        };
        doSwitch();
      },

      renameBranch: (oldName: string, newName: string) => {
        const doRename = async () => {
          const ref = await repository.refs.getRef(oldName);
          if (!ref) return;
          await repository.refs.putRef({ name: newName, commitId: ref.commitId, type: 'branch' });
          await repository.refs.deleteRef(oldName);
          const state = get();
          const refs = await repository.refs.listRefs();
          const branchNames = refs.filter((r) => r.type === 'branch').map((r) => r.name);
          const activeBranch = state.activeBranch === oldName ? newName : state.activeBranch;
          set({ branchNames, activeBranch }, false, { type: 'renameBranch', oldName, newName });
        };
        doRename();
      },

      deleteBranch: (branchName: string) => {
        const doDelete = async () => {
          if (branchName === 'main') return;
          await repository.refs.deleteRef(branchName);
          const state = get();
          const refs = await repository.refs.listRefs();
          const branchNames = refs.filter((r) => r.type === 'branch').map((r) => r.name);
          if (state.activeBranch === branchName) {
            // Fallback to main
            const events = await repository.checkout('main');
            const domain = projectEvents(events);
            const commitLog = await repository.log('main');
            set({ branchNames, activeBranch: 'main', events, ...domain, commitLog, pendingEvents: [] }, false, { type: 'deleteBranch', branchName });
          } else {
            set({ branchNames }, false, { type: 'deleteBranch', branchName });
          }
        };
        doDelete();
      },

      // UI state
      showTotals: false,
      showWeights: false,
      editingCell: null,
      editScore: '',
      editLabel: '',
      editComment: '',
      editingHeader: null,
      editHeaderValue: '',

      // Domain actions (thin wrappers around dispatch)
      addScore: (entry: ScoreEntry) => {
        get().dispatch(
          makeEvent('ScoreSet', {
            toolId: entry.toolId,
            criterionId: entry.criterionId,
            score: entry.score,
            label: entry.label,
            comment: entry.comment,
            user: entry.user,
          }),
        );
      },

      setWeight: (criterionId: string, weight: number) => {
        get().dispatch(makeEvent('WeightSet', { criterionId, weight }));
      },

      addTool: (id: string, label: string, user: string) => {
        get().dispatch(makeEvent('ToolAdded', { toolId: id, label, user }));
      },

      removeTool: (id: string) => {
        get().dispatch(makeEvent('ToolRemoved', { toolId: id }));
      },

      addCriterion: (id: string, label: string) => {
        get().dispatch(makeEvent('CriterionAdded', { criterionId: id, label }));
      },

      removeCriterion: (id: string) => {
        get().dispatch(makeEvent('CriterionRemoved', { criterionId: id }));
      },

      renameTool: (id: string, newLabel: string) => {
        get().dispatch(makeEvent('ToolRenamed', { toolId: id, newLabel }));
      },

      renameCriterion: (id: string, newLabel: string) => {
        get().dispatch(makeEvent('CriterionRenamed', { criterionId: id, newLabel }));
      },

      // UI actions
      setShowTotals: (show: boolean) => set(() => ({ showTotals: show }), false, { type: 'setShowTotals', show }),
      toggleTotals: () => set((state) => ({ showTotals: !state.showTotals }), false, 'toggleTotals'),
      setShowWeights: (show: boolean) => set(() => ({ showWeights: show }), false, { type: 'setShowWeights', show }),
      toggleWeights: () => set((state) => ({ showWeights: !state.showWeights }), false, 'toggleWeights'),
      startEditing: (toolId: string, criterionId: string) =>
        set(() => ({
          editingCell: { toolId, criterionId },
          editScore: '',
          editLabel: '',
          editComment: '',
        }), false, { type: 'startEditing', toolId, criterionId }),
      cancelEditing: () => set(() => ({ editingCell: null }), false, 'cancelEditing'),
      setEditScore: (editScore: string) => set(() => ({ editScore }), false, { type: 'setEditScore', editScore }),
      setEditLabel: (editLabel: string) => set(() => ({ editLabel }), false, { type: 'setEditLabel', editLabel }),
      setEditComment: (editComment: string) => set(() => ({ editComment }), false, { type: 'setEditComment', editComment }),
      startEditingHeader: (type: 'tool' | 'criterion', id: string) =>
        set((state) => {
          const items = type === 'tool' ? state.tools : state.criteria;
          const item = items.find((i) => i.id === id);
          return {
            editingHeader: { type, id },
            editHeaderValue: item?.label ?? '',
          };
        }, false, { type: 'startEditingHeader', headerType: type, id }),
      cancelEditingHeader: () => set(() => ({ editingHeader: null, editHeaderValue: '' }), false, 'cancelEditingHeader'),
      setEditHeaderValue: (editHeaderValue: string) => set(() => ({ editHeaderValue }), false, { type: 'setEditHeaderValue', editHeaderValue }),
      saveHeaderEdit: () => {
        const state = get();
        if (!state.editingHeader) return;
        const trimmed = state.editHeaderValue.trim();
        if (!trimmed) return;
        const { type, id } = state.editingHeader;
        if (type === 'tool') {
          state.dispatch(makeEvent('ToolRenamed', { toolId: id, newLabel: trimmed }));
        } else {
          state.dispatch(makeEvent('CriterionRenamed', { criterionId: id, newLabel: trimmed }));
        }
        set({ editingHeader: null, editHeaderValue: '' }, false, 'saveHeaderEdit');
      },
    });
  };

  return createStore<PughStore>()(
    devtools(storeCreator, { name: 'PughMatrix', enabled: true }),
  );
}

export type PughStoreInstance = ReturnType<typeof createPughStore>;
