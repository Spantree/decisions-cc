import type { Ref, RefStore } from '../types';

export function createMemoryRefStore(): RefStore {
  const refs = new Map<string, Ref>();

  return {
    async getRef(name: string) {
      return refs.get(name);
    },

    async putRef(ref: Ref) {
      refs.set(ref.name, ref);
    },

    async deleteRef(name: string) {
      refs.delete(name);
    },

    async listRefs() {
      return Array.from(refs.values());
    },
  };
}
