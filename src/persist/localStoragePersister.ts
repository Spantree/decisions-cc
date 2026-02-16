import type { Persister } from './types';

export function createLocalStoragePersister(): Persister {
  return {
    load(key: string): string | null {
      try {
        return typeof window !== 'undefined'
          ? window.localStorage.getItem(key)
          : null;
      } catch {
        return null;
      }
    },

    save(key: string, value: string): void {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // quota exceeded or SSR — silently ignore
      }
    },

    remove(key: string): void {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      } catch {
        // SSR — silently ignore
      }
    },

    subscribe(key: string, cb: (value: string | null) => void): () => void {
      const handler = (e: StorageEvent) => {
        if (e.key === key) {
          cb(e.newValue);
        }
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
  };
}
