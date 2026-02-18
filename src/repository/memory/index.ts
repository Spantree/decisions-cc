import { createMemoryObjectStore } from './memoryObjectStore';
import { createMemoryRefStore } from './memoryRefStore';
import { createMatrixRepository } from '../createMatrixRepository';
import type { MatrixRepository } from '../types';

export function createMemoryRepository(): MatrixRepository {
  return createMatrixRepository(createMemoryObjectStore(), createMemoryRefStore());
}
