import { createSupabaseObjectStore } from './supabaseObjectStore';
import { createSupabaseRefStore } from './supabaseRefStore';
import { createMatrixRepository } from '../createMatrixRepository';
import type { MatrixRepository } from '../types';

export function createSupabaseRepository(matrixId: string): MatrixRepository {
  return createMatrixRepository(
    createSupabaseObjectStore(matrixId),
    createSupabaseRefStore(matrixId),
  );
}
