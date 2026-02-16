import React from 'react';
import { PughStoreContext } from './usePughStore';
import type { PughStoreInstance } from './createPughStore';

export interface PughStoreProviderProps {
  store: PughStoreInstance;
  children: React.ReactNode;
}

export function PughStoreProvider({ store, children }: PughStoreProviderProps) {
  return (
    <PughStoreContext.Provider value={store}>
      {children}
    </PughStoreContext.Provider>
  );
}
