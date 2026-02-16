export interface Criterion {
  id: string;
  label: string;
}

export interface Tool {
  id: string;
  label: string;
}

export interface ScoreEntry {
  id: string;
  toolId: string;
  criterionId: string;
  score?: number;
  label?: string;
  comment?: string;
  timestamp: number;
}
