import type { Ref, RefStore } from '../types';

export function createLocalStorageRefStore(prefix = 'pugh'): RefStore {
  const storageKey = `${prefix}:refs`;

  function loadRefs(): Record<string, Ref> {
    try {
      if (typeof window === 'undefined') return {};
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Record<string, Ref>) : {};
    } catch {
      return {};
    }
  }

  function saveRefs(refs: Record<string, Ref>): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(refs));
      }
    } catch {
      // quota exceeded or SSR — silently ignore
    }
  }

  return {
    async getRef(name: string) {
      return loadRefs()[name];
    },

    async putRef(ref: Ref) {
      const refs = loadRefs();
      refs[ref.name] = ref;
      saveRefs(refs);
    },

    async deleteRef(name: string) {
      const refs = loadRefs();
      delete refs[name];
      saveRefs(refs);
    },

    async listRefs() {
      return Object.values(loadRefs());
    },
  };
}
