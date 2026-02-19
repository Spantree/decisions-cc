import type { RatingEntry, ScaleType, MatrixConfig } from '../types';
import type { PughEvent } from '../events/types';
import type { Commit, BranchDiff } from '../repository/types';

export interface PughDomainState {
  criteria: import('../types').Criterion[];
  options: import('../types').Option[];
  ratings: RatingEntry[];
  weights: Record<string, number>;
  matrixConfig: MatrixConfig;
}

export interface PughEventStoreState {
  events: PughEvent[];
  pendingEvents: PughEvent[];
  activeBranch: string;
  branchNames: string[];
  commitLog: Commit[];
  isLoading: boolean;
  comparingBranch: string | null;
  branchDiff: BranchDiff | null;
}

export interface PughEventStoreActions {
  dispatch: (event: PughEvent) => void;
  createBranch: (name: string) => void;
  switchBranch: (branchName: string) => void;
  renameBranch: (oldName: string, newName: string) => void;
  deleteBranch: (branchName: string) => void;
  commitPending: (comment?: string) => Promise<void>;
  init: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  compareBranch: (branchName: string) => void;
  cancelCompare: () => void;
  mergeBranch: (sourceBranch: string) => void;
}

export interface PughUIState {
  showTotals: boolean;
  showWeights: boolean;
  showLabels: boolean;
  editingCell: { optionId: string; criterionId: string } | null;
  editScore: string;
  editLabel: string;
  editComment: string;
  editingHeader: { type: 'option' | 'criterion'; id: string } | null;
  editHeaderValue: string;
  editHeaderScaleKind: string;
  editHeaderScaleMin: string;
  editHeaderScaleMax: string;
  editHeaderScaleStep: string;
  editHeaderLabelSetId: string;
  editHeaderDescription: string;
  customLabelDrawerOpen: boolean;
  editCustomLabels: Record<number, string>;
  detailModalOpen: boolean;
}

export interface PughActions {
  addRating: (entry: RatingEntry) => void;
  setWeight: (criterionId: string, weight: number) => void;
  setShowTotals: (show: boolean) => void;
  toggleTotals: () => void;
  setShowWeights: (show: boolean) => void;
  toggleWeights: () => void;
  setShowLabels: (show: boolean) => void;
  toggleLabels: () => void;
  startEditing: (optionId: string, criterionId: string) => void;
  cancelEditing: () => void;
  setEditScore: (score: string) => void;
  setEditLabel: (label: string) => void;
  setEditComment: (comment: string) => void;
  renameOption: (id: string, label: string) => void;
  renameCriterion: (id: string, label: string) => void;
  addOption: (id: string, label: string, user: string) => void;
  removeOption: (id: string) => void;
  addCriterion: (id: string, label: string) => void;
  removeCriterion: (id: string) => void;
  setCriterionScale: (id: string, scale: ScaleType) => void;
  setMatrixDefaultScale: (scale: ScaleType) => void;
  startEditingHeader: (type: 'option' | 'criterion', id: string) => void;
  cancelEditingHeader: () => void;
  setEditHeaderValue: (value: string) => void;
  setEditHeaderScaleKind: (kind: string) => void;
  setEditHeaderScaleMin: (min: string) => void;
  setEditHeaderScaleMax: (max: string) => void;
  setEditHeaderScaleStep: (step: string) => void;
  setEditHeaderLabelSetId: (id: string) => void;
  setEditHeaderDescription: (description: string) => void;
  setCriterionDescription: (id: string, description: string) => void;
  setOptionDescription: (id: string, description: string) => void;
  saveHeaderEdit: () => void;
  setCustomLabelDrawerOpen: (open: boolean) => void;
  setEditCustomLabel: (value: number, label: string) => void;
  applyCustomLabels: () => void;
  openDetailModal: () => void;
  closeDetailModal: () => void;
  saveAndNavigate: (direction: 'right' | 'left' | 'down' | 'up') => void;
  startEditingWithPreFill: (optionId: string, criterionId: string) => void;
}

export type PughStore = PughDomainState & PughEventStoreState & PughEventStoreActions & PughUIState & PughActions;
