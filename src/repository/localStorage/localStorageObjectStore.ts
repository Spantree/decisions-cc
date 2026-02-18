import type { PughEvent } from '../../events/types';
import type { Commit, ObjectStore } from '../types';

export function createLocalStorageObjectStore(prefix = 'pugh'): ObjectStore {
  function getItem(key: string): string | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // quota exceeded or SSR — silently ignore
    }
  }

  return {
    async getEvent(id: string) {
      const raw = getItem(`${prefix}:obj:${id}`);
      return raw ? (JSON.parse(raw) as PughEvent) : undefined;
    },

    async putEvent(event: PughEvent) {
      setItem(`${prefix}:obj:${event.id}`, JSON.stringify(event));
    },

    async getCommit(id: string) {
      const raw = getItem(`${prefix}:obj:${id}`);
      return raw ? (JSON.parse(raw) as Commit) : undefined;
    },

    async putCommit(commit: Commit) {
      setItem(`${prefix}:obj:${commit.id}`, JSON.stringify(commit));
    },

    async getEvents(ids: string[]) {
      const result: PughEvent[] = [];
      for (const id of ids) {
        const raw = getItem(`${prefix}:obj:${id}`);
        if (raw) result.push(JSON.parse(raw) as PughEvent);
      }
      return result;
    },
  };
}
