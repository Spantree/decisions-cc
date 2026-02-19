import type { ScaleType } from '../types';

interface PughEventBase {
  id: string;
  timestamp: number;
  user: string;
}

export interface MatrixCreated extends PughEventBase {
  type: 'MatrixCreated';
  title: string;
  description?: string;
  allowNegative: boolean;
  defaultScale: ScaleType;
}

export interface MatrixDefaultScaleSet extends PughEventBase {
  type: 'MatrixDefaultScaleSet';
  defaultScale: ScaleType;
}

export interface CriterionAdded extends PughEventBase {
  type: 'CriterionAdded';
  criterionId: string;
  label: string;
  scale?: ScaleType;
}

export interface CriterionRenamed extends PughEventBase {
  type: 'CriterionRenamed';
  criterionId: string;
  newLabel: string;
}

export interface CriterionRemoved extends PughEventBase {
  type: 'CriterionRemoved';
  criterionId: string;
}

export interface CriterionScaleOverridden extends PughEventBase {
  type: 'CriterionScaleOverridden';
  criterionId: string;
  scale: ScaleType;
}

export interface ToolAdded extends PughEventBase {
  type: 'ToolAdded';
  toolId: string;
  label: string;
}

export interface ToolRenamed extends PughEventBase {
  type: 'ToolRenamed';
  toolId: string;
  newLabel: string;
}

export interface ToolRemoved extends PughEventBase {
  type: 'ToolRemoved';
  toolId: string;
}

export interface ScoreSet extends PughEventBase {
  type: 'ScoreSet';
  toolId: string;
  criterionId: string;
  score?: number;
  /** Overrides the criterion's default label for this score value */
  label?: string;
  comment?: string;
}

export interface WeightSet extends PughEventBase {
  type: 'WeightSet';
  criterionId: string;
  weight: number;
}

export type PughEvent =
  | MatrixCreated
  | MatrixDefaultScaleSet
  | CriterionAdded
  | CriterionRenamed
  | CriterionRemoved
  | CriterionScaleOverridden
  | ToolAdded
  | ToolRenamed
  | ToolRemoved
  | ScoreSet
  | WeightSet;