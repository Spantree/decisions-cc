import type { ScoreEntry } from '../types';

export interface PughDomainState {
  criteria: string[];
  tools: string[];
  scores: ScoreEntry[];
  weights: Record<string, number>;
}

export interface PughUIState {
  showTotals: boolean;
  editingCell: { tool: string; criterion: string } | null;
  editScore: string;
  editLabel: string;
  editComment: string;
}

export interface PughActions {
  setCriteria: (criteria: string[]) => void;
  setTools: (tools: string[]) => void;
  addScore: (entry: ScoreEntry) => void;
  setWeight: (criterion: string, weight: number) => void;
  setShowTotals: (show: boolean) => void;
  toggleTotals: () => void;
  startEditing: (tool: string, criterion: string) => void;
  cancelEditing: () => void;
  setEditScore: (score: string) => void;
  setEditLabel: (label: string) => void;
  setEditComment: (comment: string) => void;
}

export type PughStore = PughDomainState & PughUIState & PughActions;
