import React, { useEffect } from 'react';
import { useStore } from 'zustand';
import { PughStoreContext } from './usePughStore';
import type { PughStoreInstance } from './createPughStore';

export interface PughStoreProviderProps {
  store: PughStoreInstance;
  children: React.ReactNode;
}

export function PughStoreProvider({ store, children }: PughStoreProviderProps) {
  const isLoading = useStore(store, (s) => s.isLoading);
  const init = useStore(store, (s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <PughStoreContext.Provider value={store}>
      {isLoading ? null : children}
    </PughStoreContext.Provider>
  );
}
