export { default as PughMatrix } from './PughMatrix';
export type { PughMatrixProps } from './PughMatrix';
export type { Criterion, Tool, ScoreEntry, ScaleType, MatrixConfig, ScoreRange, LabelSet } from './types';
export {
  DEFAULT_SCALE, DEFAULT_MATRIX_CONFIG,
  SCALE_1_10, SCALE_NEG2_POS2,
  RANGE_1_10, RANGE_NEG2_POS2, RANGE_PROPORTIONAL, SCORE_RANGES,
  LABELS_QUALITY_1_10, LABELS_COST_1_10, LABELS_EASE_1_10,
  LABELS_COMMUNITY_1_10, LABELS_AGREEMENT_1_10, LABELS_NONE_1_10,
  LABELS_QUALITY_NEG2_POS2, LABELS_COST_NEG2_POS2, LABELS_EASE_NEG2_POS2,
  LABELS_COMMUNITY_NEG2_POS2, LABELS_AGREEMENT_NEG2_POS2, LABELS_NONE_NEG2_POS2,
  LABELS_COUNT_PROPORTIONAL, LABELS_NONE_PROPORTIONAL,
  LABEL_SETS, labelSetsForRange,
  findRange, findLabelSet,
  normalizeScore, getScoreColor, getEffectiveScale, scaleLabel,
  formatCount, resolveScoreLabel, CUSTOM_LABEL_SET_ID,
} from './types';

export { createPughStore } from './store';
export type { CreatePughStoreOptions, PughStoreInstance } from './store';
export { PughStoreProvider, PughStoreContext, usePughStore } from './store';
export type { PughStoreProviderProps, PughDomainState, PughUIState, PughActions, PughStore } from './store';

export type { PughEvent } from './events';
export { projectEvents, seedEventsFromOptions } from './events';
export type { PughEventStoreState, PughEventStoreActions } from './store/types';

export { BranchSelector } from './BranchSelector';
export type { BranchSelectorProps } from './BranchSelector';

export { eventId, scoreId, toolId, criterionId, commitId } from './ids';

export type {
  Commit,
  Ref,
  ObjectStore,
  RefStore,
  MatrixRepository,
  BranchDiff,
  MergeStrategy,
} from './repository';
export {
  createMemoryRepository,
  createLocalStorageRepository,
  createMatrixRepository,
} from './repository';
