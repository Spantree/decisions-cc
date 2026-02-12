import type { StateStorage } from 'zustand/middleware';
import type { Persister } from './types';

export function createPughStorage(persister: Persister): StateStorage {
  return {
    getItem: (key: string) => persister.load(key),
    setItem: (key: string, value: string) => persister.save(key, value),
    removeItem: (key: string) => persister.remove(key),
  };
}
