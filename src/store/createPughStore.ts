import { createStore, type StateCreator } from 'zustand/vanilla';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { Criterion, Tool, ScoreEntry } from '../types';
import type { Persister } from '../persist/types';
import type { PughStore, PughDomainState } from './types';
import type { PughEvent, Branch } from '../events/types';
import { projectEvents } from '../events/projection';
import { seedEventsFromOptions } from '../events/seedFromLegacy';

export interface CreatePughStoreOptions {
  criteria?: Criterion[];
  tools?: Tool[];
  scores?: ScoreEntry[];
  weights?: Record<string, number>;
  persistKey?: string;
  persister?: Persister;
}

function createPughStorageAdapter(persister: Persister) {
  return createJSONStorage<PughStore>(() => ({
    getItem: (key: string) => persister.load(key),
    setItem: (key: string, value: string) => persister.save(key, value),
    removeItem: (key: string) => persister.remove(key),
  }));
}

function makeEvent(type: PughEvent['type'], payload: Record<string, unknown>): PughEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    persistKey = 'pugh-matrix',
    persister,
  } = options;

  const initialEvents = seedEventsFromOptions({ criteria, tools, scores, weights });
  const initialDomain = projectEvents(initialEvents);
  const mainBranch: Branch = {
    id: 'main',
    name: 'main',
    createdAt: Date.now(),
  };

  const storeCreator: StateCreator<PughStore> = (_set, get) => {
  // The devtools middleware extends set() with an optional third argument for
  // action names, but StateCreator's type doesn't include it. We cast once
  // here so every set() call can pass an action name to Redux DevTools.
  type Action = string | { type: string; [k: string]: unknown };
  const set: {
    (partial: PughStore | Partial<PughStore> | ((state: PughStore) => PughStore | Partial<PughStore>), replace?: false, action?: Action): void;
    (state: PughStore | ((state: PughStore) => PughStore), replace: true, action?: Action): void;
  } = _set as any;

  return ({
    // Domain state (projected from events)
    ...initialDomain,

    // Event store state
    events: initialEvents,
    eventsByBranch: { main: initialEvents },
    branches: [mainBranch],
    activeBranchId: 'main',

    // Event store actions
    dispatch: (event: PughEvent) => {
      const state = get();
      const branchEvents = [...(state.eventsByBranch[state.activeBranchId] ?? []), event];
      const eventsByBranch = { ...state.eventsByBranch, [state.activeBranchId]: branchEvents };
      const domain = projectEvents(branchEvents);
      set({ eventsByBranch, events: branchEvents, ...domain }, false, `event/${event.type}`);
    },

    createBranch: (name: string) => {
      const state = get();
      const parentEvents = state.eventsByBranch[state.activeBranchId] ?? [];
      const newId = `branch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newBranch: Branch = {
        id: newId,
        name,
        createdAt: Date.now(),
        parentBranchId: state.activeBranchId,
        forkEventIndex: parentEvents.length,
      };
      const forkedEvents = [...parentEvents];
      set({
        branches: [...state.branches, newBranch],
        eventsByBranch: { ...state.eventsByBranch, [newId]: forkedEvents },
        activeBranchId: newId,
        events: forkedEvents,
      }, false, { type: 'createBranch', name });
    },

    switchBranch: (branchId: string) => {
      const state = get();
      const branchEvents = state.eventsByBranch[branchId];
      if (!branchEvents) return;
      const domain = projectEvents(branchEvents);
      set({ activeBranchId: branchId, events: branchEvents, ...domain }, false, { type: 'switchBranch', branchId });
    },

    renameBranch: (branchId: string, name: string) => {
      const state = get();
      set({
        branches: state.branches.map((b) =>
          b.id === branchId ? { ...b, name } : b,
        ),
      }, false, { type: 'renameBranch', branchId, name });
    },

    deleteBranch: (branchId: string) => {
      const state = get();
      if (branchId === 'main') return;
      const remaining = state.branches.filter((b) => b.id !== branchId);
      const { [branchId]: _, ...remainingEvents } = state.eventsByBranch;
      if (state.activeBranchId === branchId) {
        const fallbackId = remaining[0].id;
        const fallbackEvents = remainingEvents[fallbackId] ?? [];
        const domain = projectEvents(fallbackEvents);
        set({ branches: remaining, eventsByBranch: remainingEvents, activeBranchId: fallbackId, events: fallbackEvents, ...domain }, false, { type: 'deleteBranch', branchId });
      } else {
        set({ branches: remaining, eventsByBranch: remainingEvents }, false, { type: 'deleteBranch', branchId });
      }
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
  })};

  if (!persister) {
    return createStore<PughStore>()(
      devtools(storeCreator, { name: `PughMatrix`, enabled: true }),
    );
  }

  const store = createStore<PughStore>()(
    devtools(
      persist(storeCreator, {
        name: persistKey,
        version: 2,
        storage: createPughStorageAdapter(persister),
        partialize: (state) =>
          ({
            eventsByBranch: state.eventsByBranch,
            branches: state.branches,
            activeBranchId: state.activeBranchId,
          }) as unknown as PughStore,
        merge: (persisted, current) => {
          const merged = { ...current, ...(persisted as Partial<PughStore>) };
          if (merged.eventsByBranch && merged.activeBranchId) {
            const branchEvents = merged.eventsByBranch[merged.activeBranchId];
            if (branchEvents) {
              const domain = projectEvents(branchEvents);
              return { ...merged, ...domain, events: branchEvents };
            }
          }
          return merged;
        },
      }),
      { name: `PughMatrix(${persistKey})`, enabled: true },
    ),
  );

  if (persister.subscribe) {
    persister.subscribe(persistKey, () => {
      (store as unknown as { persist: { rehydrate: () => void } }).persist.rehydrate();
    });
  }

  return store;
}

export type PughStoreInstance = ReturnType<typeof createPughStore>;
