import { createStore, type StateCreator } from 'zustand/vanilla';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { Criterion, Tool, ScoreEntry, ScaleType } from '../types';
import { DEFAULT_SCALE, getEffectiveScale, findLabelSet, labelSetsForRange, LABELS_QUALITY_1_10, LABEL_SETS, CUSTOM_LABEL_SET_ID } from '../types';
import type { Persister } from '../persist/types';
import type { PughStore, PughDomainState } from './types';
import type { PughEvent, Branch } from '../events/types';
import { projectEvents } from '../events/projection';
import { seedEventsFromOptions } from '../events/seedFromLegacy';
import { eventId, branchId as makeBranchId, MAIN_BRANCH_ID } from '../ids';

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
    id: eventId(),
    timestamp: Date.now(),
    user: 'anonymous',
    type,
    ...payload,
  } as PughEvent;
}

function scaleToEditState(scale: ScaleType): {
  editHeaderScaleKind: string;
  editHeaderScaleMin: string;
  editHeaderScaleMax: string;
  editHeaderScaleStep: string;
} {
  switch (scale.kind) {
    case 'numeric':
      return {
        editHeaderScaleKind: 'numeric',
        editHeaderScaleMin: String(scale.min),
        editHeaderScaleMax: String(scale.max),
        editHeaderScaleStep: String(scale.step),
      };
    case 'binary':
      return {
        editHeaderScaleKind: 'binary',
        editHeaderScaleMin: '0',
        editHeaderScaleMax: '1',
        editHeaderScaleStep: '1',
      };
    case 'unbounded':
      return {
        editHeaderScaleKind: 'unbounded',
        editHeaderScaleMin: '0',
        editHeaderScaleMax: '',
        editHeaderScaleStep: '1',
      };
  }
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
    id: MAIN_BRANCH_ID,
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
    eventsByBranch: { [MAIN_BRANCH_ID]: initialEvents },
    branches: [mainBranch],
    activeBranchId: MAIN_BRANCH_ID,

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
      const newId = makeBranchId();
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
      if (branchId === MAIN_BRANCH_ID) return;
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
    showLabels: false,
    editingCell: null,
    editScore: '',
    editLabel: '',
    editComment: '',
    editingHeader: null,
    editHeaderValue: '',
    editHeaderScaleKind: 'numeric',
    editHeaderScaleMin: '1',
    editHeaderScaleMax: '10',
    editHeaderScaleStep: '1',
    editHeaderLabelSetId: LABELS_QUALITY_1_10.id,
    customLabelDrawerOpen: false,
    editCustomLabels: {},

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

    setCriterionScale: (id: string, scale: ScaleType) => {
      get().dispatch(makeEvent('CriterionScaleOverridden', { criterionId: id, scale }));
    },

    setMatrixDefaultScale: (scale: ScaleType) => {
      get().dispatch(makeEvent('MatrixDefaultScaleSet', { defaultScale: scale }));
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
    setShowLabels: (show: boolean) => set(() => ({ showLabels: show }), false, { type: 'setShowLabels', show }),
    toggleLabels: () => set((state) => ({ showLabels: !state.showLabels }), false, 'toggleLabels'),
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
        let scaleState = scaleToEditState(DEFAULT_SCALE);
        let labelSetId = LABELS_QUALITY_1_10.id;
        let customLabels: Record<number, string> = {};
        if (type === 'criterion') {
          const criterion = state.criteria.find((c) => c.id === id);
          if (criterion) {
            const effective = getEffectiveScale(criterion, state.matrixConfig.defaultScale);
            scaleState = scaleToEditState(effective);
            const ls = findLabelSet(effective);
            if (ls) {
              labelSetId = ls.id;
            } else if (effective.kind === 'numeric' && effective.labels && Object.keys(effective.labels).length > 0) {
              labelSetId = CUSTOM_LABEL_SET_ID;
              customLabels = { ...effective.labels };
            } else {
              const range = effective.kind === 'numeric'
                ? `${effective.min === 1 && effective.max === 10 ? '1-10' : effective.min === -2 && effective.max === 2 ? '-2-2' : ''}`
                : effective.kind === 'unbounded' ? 'proportional' : '';
              const fallback = range ? labelSetsForRange(range) : [];
              const noneFallback = fallback.find((ls) => ls.name === 'None');
              if (noneFallback) {
                labelSetId = noneFallback.id;
              } else {
                labelSetId = 'none';
              }
            }
          }
        }
        return {
          editingHeader: { type, id },
          editHeaderValue: item?.label ?? '',
          editHeaderLabelSetId: labelSetId,
          editCustomLabels: customLabels,
          customLabelDrawerOpen: false,
          ...scaleState,
        };
      }, false, { type: 'startEditingHeader', headerType: type, id }),
    cancelEditingHeader: () => set(() => ({
      editingHeader: null,
      editHeaderValue: '',
      editHeaderScaleKind: 'numeric',
      editHeaderScaleMin: '1',
      editHeaderScaleMax: '10',
      editHeaderScaleStep: '1',
      editHeaderLabelSetId: LABELS_QUALITY_1_10.id,
      customLabelDrawerOpen: false,
      editCustomLabels: {},
    }), false, 'cancelEditingHeader'),
    setEditHeaderValue: (editHeaderValue: string) => set(() => ({ editHeaderValue }), false, { type: 'setEditHeaderValue', editHeaderValue }),
    setEditHeaderScaleKind: (editHeaderScaleKind: string) => set(() => ({ editHeaderScaleKind }), false, { type: 'setEditHeaderScaleKind', editHeaderScaleKind }),
    setEditHeaderScaleMin: (editHeaderScaleMin: string) => set(() => ({ editHeaderScaleMin }), false, { type: 'setEditHeaderScaleMin', editHeaderScaleMin }),
    setEditHeaderScaleMax: (editHeaderScaleMax: string) => set(() => ({ editHeaderScaleMax }), false, { type: 'setEditHeaderScaleMax', editHeaderScaleMax }),
    setEditHeaderScaleStep: (editHeaderScaleStep: string) => set(() => ({ editHeaderScaleStep }), false, { type: 'setEditHeaderScaleStep', editHeaderScaleStep }),
    setEditHeaderLabelSetId: (editHeaderLabelSetId: string) => set(() => ({ editHeaderLabelSetId }), false, { type: 'setEditHeaderLabelSetId', editHeaderLabelSetId }),
    setCustomLabelDrawerOpen: (open: boolean) => {
      if (open) {
        const state = get();
        if (state.editHeaderLabelSetId !== CUSTOM_LABEL_SET_ID) {
          // Pre-populate from the selected predefined labelset
          const ls = LABEL_SETS.find((l) => l.id === state.editHeaderLabelSetId);
          set({
            customLabelDrawerOpen: true,
            editCustomLabels: ls ? { ...ls.labels } : {},
          }, false, 'setCustomLabelDrawerOpen');
          return;
        }
        // For custom: pre-populate from criterion's saved labels if editCustomLabels is empty
        if (Object.keys(state.editCustomLabels).length === 0 && state.editingHeader?.type === 'criterion') {
          const criterion = state.criteria.find((c) => c.id === state.editingHeader!.id);
          if (criterion) {
            const effective = getEffectiveScale(criterion, state.matrixConfig.defaultScale);
            if (effective.kind === 'numeric' && effective.labels && !findLabelSet(effective)) {
              set({ customLabelDrawerOpen: true, editCustomLabels: { ...effective.labels } }, false, 'setCustomLabelDrawerOpen');
              return;
            }
          }
        }
      }
      set({ customLabelDrawerOpen: open }, false, { type: 'setCustomLabelDrawerOpen', open });
    },
    setEditCustomLabel: (value: number, label: string) => set((state) => {
      const updated = { ...state.editCustomLabels };
      if (label === '') {
        delete updated[value];
      } else {
        updated[value] = label;
      }
      return { editCustomLabels: updated };
    }, false, { type: 'setEditCustomLabel', value, label }),
    applyCustomLabels: () => {
      const state = get();
      // Clean/trim labels
      const cleaned: Record<number, string> = {};
      for (const [k, v] of Object.entries(state.editCustomLabels)) {
        const trimmed = v.trim();
        if (trimmed) cleaned[Number(k)] = trimmed;
      }
      set({
        editCustomLabels: cleaned,
        editHeaderLabelSetId: CUSTOM_LABEL_SET_ID,
        customLabelDrawerOpen: false,
      }, false, 'applyCustomLabels');
    },
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
        // Build the new scale from edit state and dispatch scale change
        let newScale: ScaleType;
        switch (state.editHeaderScaleKind) {
          case 'binary':
            newScale = { kind: 'binary' };
            break;
          case 'unbounded':
            newScale = { kind: 'unbounded' };
            break;
          default: {
            const min = Number(state.editHeaderScaleMin) || 1;
            const max = Number(state.editHeaderScaleMax) || 10;
            const step = Number(state.editHeaderScaleStep) || 1;
            let labels: Record<number, string> | undefined;
            if (state.editHeaderLabelSetId === CUSTOM_LABEL_SET_ID) {
              // Clean: only keep entries with non-empty trimmed labels
              const cleaned: Record<number, string> = {};
              for (const [k, v] of Object.entries(state.editCustomLabels)) {
                const trimmed = v.trim();
                if (trimmed) cleaned[Number(k)] = trimmed;
              }
              labels = Object.keys(cleaned).length > 0 ? cleaned : undefined;
            } else {
              const ls = LABEL_SETS.find((l) => l.id === state.editHeaderLabelSetId);
              labels = ls?.labels;
            }
            newScale = { kind: 'numeric', min, max, step, labels };
            break;
          }
        }
        state.dispatch(makeEvent('CriterionScaleOverridden', { criterionId: id, scale: newScale }));
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
        version: 4,
        storage: createPughStorageAdapter(persister),
        partialize: (state) =>
          ({
            eventsByBranch: state.eventsByBranch,
            branches: state.branches,
            activeBranchId: state.activeBranchId,
          }) as unknown as PughStore,
        migrate: (persisted: unknown, version: number) => {
          const state = persisted as Record<string, unknown>;
          if (version < 4 && state.eventsByBranch) {
            // Migrate events: convert old ScoreScale/CriterionScaleChanged to new types
            const eventsByBranch = state.eventsByBranch as Record<string, unknown[]>;
            for (const branchId of Object.keys(eventsByBranch)) {
              eventsByBranch[branchId] = (eventsByBranch[branchId] as Record<string, unknown>[]).map((evt) => {
                // Convert CriterionScaleChanged → CriterionScaleOverridden
                if (evt.type === 'CriterionScaleChanged') {
                  const oldScale = evt.scoreScale as Record<string, unknown> | undefined;
                  let newScale: ScaleType;
                  if (oldScale?.proportional) {
                    newScale = { kind: 'unbounded' };
                  } else if (oldScale) {
                    newScale = {
                      kind: 'numeric',
                      min: (oldScale.min as number) ?? 1,
                      max: (oldScale.max as number) ?? 10,
                      step: 1,
                      labels: (oldScale.labels as Record<number, string>) ?? undefined,
                    };
                  } else {
                    newScale = { kind: 'numeric', min: 1, max: 10, step: 1 };
                  }
                  return { ...evt, type: 'CriterionScaleOverridden', scale: newScale, scoreScale: undefined };
                }
                // Convert CriterionAdded scoreScale → scale
                if (evt.type === 'CriterionAdded' && evt.scoreScale) {
                  const oldScale = evt.scoreScale as Record<string, unknown>;
                  let newScale: ScaleType;
                  if (oldScale.proportional) {
                    newScale = { kind: 'unbounded' };
                  } else {
                    newScale = {
                      kind: 'numeric',
                      min: (oldScale.min as number) ?? 1,
                      max: (oldScale.max as number) ?? 10,
                      step: 1,
                      labels: (oldScale.labels as Record<number, string>) ?? undefined,
                    };
                  }
                  return { ...evt, scale: newScale, scoreScale: undefined };
                }
                return evt;
              });
            }
          }
          return state as unknown as PughStore;
        },
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
