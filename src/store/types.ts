import type { ScoreEntry } from '../types';
import type { PughEvent, Branch } from '../events/types';

export interface PughDomainState {
  criteria: import('../types').Criterion[];
  tools: import('../types').Tool[];
  scores: ScoreEntry[];
  weights: Record<string, number>;
}

export interface PughEventStoreState {
  events: PughEvent[];
  eventsByBranch: Record<string, PughEvent[]>;
  branches: Branch[];
  activeBranchId: string;
}

export interface PughEventStoreActions {
  dispatch: (event: PughEvent) => void;
  createBranch: (name: string) => void;
  switchBranch: (branchId: string) => void;
  renameBranch: (branchId: string, name: string) => void;
  deleteBranch: (branchId: string) => void;
}

export interface PughUIState {
  showTotals: boolean;
  showWeights: boolean;
  editingCell: { toolId: string; criterionId: string } | null;
  editScore: string;
  editLabel: string;
  editComment: string;
  editingHeader: { type: 'tool' | 'criterion'; id: string } | null;
  editHeaderValue: string;
}

export interface PughActions {
  addScore: (entry: ScoreEntry) => void;
  setWeight: (criterionId: string, weight: number) => void;
  setShowTotals: (show: boolean) => void;
  toggleTotals: () => void;
  setShowWeights: (show: boolean) => void;
  toggleWeights: () => void;
  startEditing: (toolId: string, criterionId: string) => void;
  cancelEditing: () => void;
  setEditScore: (score: string) => void;
  setEditLabel: (label: string) => void;
  setEditComment: (comment: string) => void;
  renameTool: (id: string, newLabel: string) => void;
  renameCriterion: (id: string, newLabel: string) => void;
  addTool: (id: string, label: string, user: string) => void;
  removeTool: (id: string) => void;
  addCriterion: (id: string, label: string) => void;
  removeCriterion: (id: string) => void;
  startEditingHeader: (type: 'tool' | 'criterion', id: string) => void;
  cancelEditingHeader: () => void;
  setEditHeaderValue: (value: string) => void;
  saveHeaderEdit: () => void;
}

export type PughStore = PughDomainState & PughEventStoreState & PughEventStoreActions & PughUIState & PughActions;
