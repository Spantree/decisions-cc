import { createLocalStorageObjectStore } from './localStorageObjectStore';
import { createLocalStorageRefStore } from './localStorageRefStore';
import { createMatrixRepository } from '../createMatrixRepository';
import type { MatrixRepository } from '../types';

export function createLocalStorageRepository(prefix = 'pugh'): MatrixRepository {
  return createMatrixRepository(
    createLocalStorageObjectStore(prefix),
    createLocalStorageRefStore(prefix),
  );
}
