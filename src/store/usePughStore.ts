import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { PughStore } from './types';
import type { PughStoreInstance } from './createPughStore';

export const PughStoreContext = createContext<PughStoreInstance | null>(null);

export { PughStoreProvider } from './PughStoreProvider';

export function usePughStore<T>(selector: (state: PughStore) => T): T {
  const store = useContext(PughStoreContext);
  if (!store) {
    throw new Error(
      'usePughStore must be used within a <PughStoreProvider>. ' +
      'Wrap your component tree with <PughStoreProvider store={...}>.',
    );
  }
  return useStore(store, selector);
}
