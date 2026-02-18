export type {
  Commit,
  Ref,
  ObjectStore,
  RefStore,
  MatrixRepository,
  BranchDiff,
  MergeStrategy,
} from './types';

export { createMatrixRepository } from './createMatrixRepository';
export { walkCommits, collectEventIds } from './walkCommits';
export { diffBranches } from './diff';
export { mergeBranches } from './merge';
export { createMemoryRepository } from './memory';
export { createLocalStorageRepository } from './localStorage';
