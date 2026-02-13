import { createStore } from 'zustand/vanilla';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { ScoreEntry } from '../types';
import type { Persister } from '../persist/types';
import type { PughStore, PughDomainState } from './types';

export interface CreatePughStoreOptions {
  criteria?: string[];
  tools?: string[];
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

export function createPughStore(options: CreatePughStoreOptions = {}) {
  const {
    criteria = [],
    tools = [],
    scores = [],
    weights = {},
    persistKey = 'pugh-matrix',
    persister,
  } = options;

  const initialWeights: Record<string, number> = { ...weights };
  for (const c of criteria) {
    if (!(c in initialWeights)) {
      initialWeights[c] = 10;
    }
  }

  const storeCreator = (
    set: (fn: (state: PughStore) => Partial<PughStore>) => void,
  ): PughStore => ({
    criteria,
    tools,
    scores,
    weights: initialWeights,
    showTotals: false,
    editingCell: null,
    editScore: '',
    editLabel: '',
    editComment: '',
    setCriteria: (criteria: string[]) => set(() => ({ criteria })),
    setTools: (tools: string[]) => set(() => ({ tools })),
    addScore: (entry: ScoreEntry) =>
      set((state) => ({ scores: [...state.scores, entry] })),
    setWeight: (criterion: string, weight: number) =>
      set((state) => ({
        weights: { ...state.weights, [criterion]: weight },
      })),
    setShowTotals: (show: boolean) => set(() => ({ showTotals: show })),
    toggleTotals: () => set((state) => ({ showTotals: !state.showTotals })),
    startEditing: (tool: string, criterion: string) =>
      set(() => ({
        editingCell: { tool, criterion },
        editScore: '',
        editLabel: '',
        editComment: '',
      })),
    cancelEditing: () => set(() => ({ editingCell: null })),
    setEditScore: (editScore: string) => set(() => ({ editScore })),
    setEditLabel: (editLabel: string) => set(() => ({ editLabel })),
    setEditComment: (editComment: string) => set(() => ({ editComment })),
  });

  if (!persister) {
    return createStore<PughStore>()(
      devtools(storeCreator, { name: `PughMatrix` }),
    );
  }

  const store = createStore<PughStore>()(
    devtools(
      persist(storeCreator, {
        name: persistKey,
        storage: createPughStorageAdapter(persister),
        partialize: (state) =>
          ({
            criteria: state.criteria,
            tools: state.tools,
            scores: state.scores,
            weights: state.weights,
          }) as unknown as PughStore,
      }),
      { name: `PughMatrix(${persistKey})` },
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
