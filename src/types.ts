export interface ScoreEntry {
  id: string;
  tool: string;
  criterion: string;
  score?: number;
  label?: string;
  comment?: string;
  timestamp: number;
}
