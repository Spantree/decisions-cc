import { createStore, type StateCreator } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import type { Criterion, Option, RatingEntry, ScaleType } from '../types';
import { DEFAULT_SCALE, getEffectiveScale, findLabelSet, labelSetsForRange, LABELS_QUALITY_1_10, LABEL_SETS, CUSTOM_LABEL_SET_ID } from '../types';
import type { PughStore } from './types';
import type { PughEvent } from '../events/types';
import type { MatrixRepository } from '../repository/types';
import { projectEvents } from '../events/projection';
import { seedEventsFromOptions } from '../events/seedFromLegacy';
import { eventId, MAIN_BRANCH_ID } from '../ids';
import { createMemoryRepository } from '../repository/memory';

export interface CreatePughStoreOptions {
  criteria?: Criterion[];
  options?: Option[];
  ratings?: RatingEntry[];
  weights?: Record<string, number>;
  repository?: MatrixRepository;
}

function makeEvent(type: PughEvent['type'], payload: Record<string, unknown>, branchId: string): PughEvent {
  return {
    id: eventId(),
    timestamp: Date.now(),
    user: 'anonymous',
    branchId,
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
    options: opts = [],
    ratings = [],
    weights = {},
    repository = createMemoryRepository(),
  } = options;

  const initialEvents = seedEventsFromOptions({ criteria, options: opts, ratings, weights });
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
        async function seedFresh() {
          if (initialEvents.length > 0) {
            await repository.commit('main', initialEvents, 'system', 'Initial seed');
          } else {
            await repository.commit('main', [], 'system', 'Initial empty commit');
          }
          const commitLog = await repository.log('main');
          set({ commitLog, isLoading: false }, false, 'init/seed');
        }

        try {
          const mainRef = await repository.refs.getRef('main');
          if (mainRef) {
            // Existing repo — hydrate from it
            const events = await repository.checkout('main');
            const domain = projectEvents(events);

            // Detect stale/incompatible stored data: if seed provided
            // options but hydration produced none, wipe and re-seed.
            const seedDomain = projectEvents(initialEvents);
            const isStale =
              seedDomain.options.length > 0 && domain.options.length === 0;

            if (isStale) {
              await repository.refs.deleteRef('main');
              await seedFresh();
            } else {
              const commitLog = await repository.log('main');
              const refs = await repository.refs.listRefs();
              const branchNames = refs.filter((r) => r.type === 'branch').map((r) => r.name);
              set({ events, ...domain, commitLog, branchNames, activeBranch: 'main', isLoading: false }, false, 'init/hydrate');
            }
          } else {
            await seedFresh();
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
      addRating: (entry: RatingEntry) => {
        const state = get();
        state.dispatch(
          makeEvent('RatingAssigned', {
            optionId: entry.optionId,
            criterionId: entry.criterionId,
            value: entry.value,
            label: entry.label,
            comment: entry.comment,
            user: entry.user,
          }, state.activeBranch),
        );
      },

      setWeight: (criterionId: string, weight: number) => {
        const state = get();
        state.dispatch(makeEvent('CriterionWeightAdjusted', { criterionId, weight }, state.activeBranch));
      },

      addOption: (id: string, label: string, user: string) => {
        const state = get();
        state.dispatch(makeEvent('OptionAdded', { optionId: id, label, user }, state.activeBranch));
      },

      removeOption: (id: string) => {
        const state = get();
        state.dispatch(makeEvent('OptionRemoved', { optionId: id }, state.activeBranch));
      },

      addCriterion: (id: string, label: string) => {
        const state = get();
        state.dispatch(makeEvent('CriterionAdded', { criterionId: id, label }, state.activeBranch));
      },

      removeCriterion: (id: string) => {
        const state = get();
        state.dispatch(makeEvent('CriterionRemoved', { criterionId: id }, state.activeBranch));
      },

      setCriterionScale: (id: string, scale: ScaleType) => {
        const state = get();
        state.dispatch(makeEvent('CriterionScaleOverridden', { criterionId: id, scale }, state.activeBranch));
      },

      setMatrixDefaultScale: (scale: ScaleType) => {
        const state = get();
        state.dispatch(makeEvent('MatrixDefaultScaleSet', { defaultScale: scale }, state.activeBranch));
      },

      renameOption: (id: string, label: string) => {
        const state = get();
        state.dispatch(makeEvent('OptionRenamed', { optionId: id, label }, state.activeBranch));
      },

      renameCriterion: (id: string, label: string) => {
        const state = get();
        state.dispatch(makeEvent('CriterionRenamed', { criterionId: id, label }, state.activeBranch));
      },

      // UI actions
      setShowTotals: (show: boolean) => set(() => ({ showTotals: show }), false, { type: 'setShowTotals', show }),
      toggleTotals: () => set((state) => ({ showTotals: !state.showTotals }), false, 'toggleTotals'),
      setShowWeights: (show: boolean) => set(() => ({ showWeights: show }), false, { type: 'setShowWeights', show }),
      toggleWeights: () => set((state) => ({ showWeights: !state.showWeights }), false, 'toggleWeights'),
      setShowLabels: (show: boolean) => set(() => ({ showLabels: show }), false, { type: 'setShowLabels', show }),
      toggleLabels: () => set((state) => ({ showLabels: !state.showLabels }), false, 'toggleLabels'),
      startEditing: (optionId: string, criterionId: string) =>
        set(() => ({
          editingCell: { optionId, criterionId },
          editScore: '',
          editLabel: '',
          editComment: '',
        }), false, { type: 'startEditing', optionId, criterionId }),
      cancelEditing: () => set(() => ({ editingCell: null }), false, 'cancelEditing'),
      setEditScore: (editScore: string) => set(() => ({ editScore }), false, { type: 'setEditScore', editScore }),
      setEditLabel: (editLabel: string) => set(() => ({ editLabel }), false, { type: 'setEditLabel', editLabel }),
      setEditComment: (editComment: string) => set(() => ({ editComment }), false, { type: 'setEditComment', editComment }),
      startEditingHeader: (type: 'option' | 'criterion', id: string) =>
        set((state) => {
          const items = type === 'option' ? state.options : state.criteria;
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
        if (type === 'option') {
          state.dispatch(makeEvent('OptionRenamed', { optionId: id, label: trimmed }, state.activeBranch));
        } else {
          state.dispatch(makeEvent('CriterionRenamed', { criterionId: id, label: trimmed }, state.activeBranch));
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
          state.dispatch(makeEvent('CriterionScaleOverridden', { criterionId: id, scale: newScale }, state.activeBranch));
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
