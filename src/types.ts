export interface ScoreScale {
  min: number;
  max: number;
  labels: Record<number, string>;
  proportional?: boolean;  // when true, scores are raw counts, normalized at display time
}

export const SCALE_1_10: ScoreScale = {
  min: 1,
  max: 10,
  labels: {
    1: 'Poor',
    2: 'Below Avg',
    3: 'Fair',
    4: 'Below Avg+',
    5: 'Average',
    6: 'Above Avg',
    7: 'Good',
    8: 'Very Good',
    9: 'Excellent',
    10: 'Outstanding',
  },
};

export const SCALE_NEG2_POS2: ScoreScale = {
  min: -2,
  max: 2,
  labels: {
    [-2]: 'Poor',
    [-1]: 'Below Avg',
    [0]: 'Average',
    [1]: 'Good',
    [2]: 'Outstanding',
  },
};

export const DEFAULT_SCALE: ScoreScale = SCALE_1_10;

// --- Score Range & Label Set presets ---

export interface ScoreRange {
  id: string;
  name: string;
  min: number;
  max: number;
}

export interface LabelSet {
  id: string;
  name: string;
  rangeId: string;
  labels: Record<number, string>;
}

export const RANGE_1_10: ScoreRange = { id: '1-10', name: '1 to 10', min: 1, max: 10 };
export const RANGE_NEG2_POS2: ScoreRange = { id: '-2-2', name: '-2 to +2', min: -2, max: 2 };
export const RANGE_PROPORTIONAL: ScoreRange = { id: 'proportional', name: 'Proportional', min: 0, max: Number.MAX_SAFE_INTEGER };
export const SCORE_RANGES: ScoreRange[] = [RANGE_1_10, RANGE_NEG2_POS2, RANGE_PROPORTIONAL];

// --- 1-10 label sets ---

export const LABELS_QUALITY_1_10: LabelSet = {
  id: 'quality-1-10',
  name: 'Quality',
  rangeId: '1-10',
  labels: { ...SCALE_1_10.labels },
};

export const LABELS_COST_1_10: LabelSet = {
  id: 'cost-1-10',
  name: 'Cost',
  rangeId: '1-10',
  labels: {
    1: 'Enterprise',
    2: 'Very Expensive',
    3: 'Expensive',
    4: 'Pricey',
    5: 'Moderate',
    6: 'Affordable',
    7: 'Cheap',
    8: 'Very Cheap',
    9: 'Nearly Free',
    10: 'Free',
  },
};

export const LABELS_EASE_1_10: LabelSet = {
  id: 'ease-1-10',
  name: 'Ease of Use',
  rangeId: '1-10',
  labels: {
    1: 'Very Hard',
    2: 'Hard',
    3: 'Difficult',
    4: 'Tricky',
    5: 'Moderate',
    6: 'Manageable',
    7: 'Easy',
    8: 'Very Easy',
    9: 'Intuitive',
    10: 'Effortless',
  },
};

export const LABELS_COMMUNITY_1_10: LabelSet = {
  id: 'community-1-10',
  name: 'Community',
  rangeId: '1-10',
  labels: {
    1: 'None',
    2: 'Minimal',
    3: 'Small',
    4: 'Growing',
    5: 'Moderate',
    6: 'Active',
    7: 'Strong',
    8: 'Very Strong',
    9: 'Thriving',
    10: 'Massive',
  },
};

export const LABELS_AGREEMENT_1_10: LabelSet = {
  id: 'agreement-1-10',
  name: 'Agreement',
  rangeId: '1-10',
  labels: {
    1: 'Strongly Disagree',
    2: 'Disagree',
    3: 'Mostly Disagree',
    4: 'Slightly Disagree',
    5: 'Neutral',
    6: 'Slightly Agree',
    7: 'Mostly Agree',
    8: 'Agree',
    9: 'Strongly Agree',
    10: 'Fully Agree',
  },
};

export const LABELS_NONE_1_10: LabelSet = {
  id: 'none-1-10',
  name: 'None',
  rangeId: '1-10',
  labels: {},
};

// --- -2 to +2 label sets ---

export const LABELS_QUALITY_NEG2_POS2: LabelSet = {
  id: 'quality-neg2-pos2',
  name: 'Quality',
  rangeId: '-2-2',
  labels: { ...SCALE_NEG2_POS2.labels },
};

export const LABELS_COST_NEG2_POS2: LabelSet = {
  id: 'cost-neg2-pos2',
  name: 'Cost',
  rangeId: '-2-2',
  labels: { [-2]: 'Enterprise', [-1]: 'Expensive', [0]: 'Moderate', [1]: 'Cheap', [2]: 'Free' },
};

export const LABELS_EASE_NEG2_POS2: LabelSet = {
  id: 'ease-neg2-pos2',
  name: 'Ease of Use',
  rangeId: '-2-2',
  labels: { [-2]: 'Very Hard', [-1]: 'Hard', [0]: 'Moderate', [1]: 'Easy', [2]: 'Effortless' },
};

export const LABELS_COMMUNITY_NEG2_POS2: LabelSet = {
  id: 'community-neg2-pos2',
  name: 'Community',
  rangeId: '-2-2',
  labels: { [-2]: 'None', [-1]: 'Small', [0]: 'Moderate', [1]: 'Strong', [2]: 'Thriving' },
};

export const LABELS_AGREEMENT_NEG2_POS2: LabelSet = {
  id: 'agreement-neg2-pos2',
  name: 'Agreement',
  rangeId: '-2-2',
  labels: { [-2]: 'Strongly Disagree', [-1]: 'Disagree', [0]: 'Neutral', [1]: 'Agree', [2]: 'Strongly Agree' },
};

export const LABELS_NONE_NEG2_POS2: LabelSet = {
  id: 'none-neg2-pos2',
  name: 'None',
  rangeId: '-2-2',
  labels: {},
};

// --- Proportional label sets ---

export const LABELS_COUNT_PROPORTIONAL: LabelSet = {
  id: 'count-proportional',
  name: 'Count + %',
  rangeId: 'proportional',
  labels: {},
};

export const LABELS_NONE_PROPORTIONAL: LabelSet = {
  id: 'none-proportional',
  name: 'None',
  rangeId: 'proportional',
  labels: {},
};

export const LABEL_SETS: LabelSet[] = [
  LABELS_QUALITY_1_10,
  LABELS_COST_1_10,
  LABELS_EASE_1_10,
  LABELS_COMMUNITY_1_10,
  LABELS_AGREEMENT_1_10,
  LABELS_NONE_1_10,
  LABELS_QUALITY_NEG2_POS2,
  LABELS_COST_NEG2_POS2,
  LABELS_EASE_NEG2_POS2,
  LABELS_COMMUNITY_NEG2_POS2,
  LABELS_AGREEMENT_NEG2_POS2,
  LABELS_NONE_NEG2_POS2,
  LABELS_COUNT_PROPORTIONAL,
  LABELS_NONE_PROPORTIONAL,
];

export function labelSetsForRange(rangeId: string): LabelSet[] {
  return LABEL_SETS.filter((ls) => ls.rangeId === rangeId);
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${parseFloat(m.toFixed(1))}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return k % 1 === 0 ? `${k}k` : `${parseFloat(k.toFixed(1))}k`;
  }
  return String(n);
}

export function findRange(scale: ScoreScale): ScoreRange | undefined {
  if (scale.proportional) return RANGE_PROPORTIONAL;
  return SCORE_RANGES.find((r) => r.min === scale.min && r.max === scale.max);
}

export function findLabelSet(scale: ScoreScale): LabelSet | undefined {
  const range = findRange(scale);
  if (!range) return undefined;
  return LABEL_SETS.find((ls) => {
    if (ls.rangeId !== range.id) return false;
    const scaleKeys = Object.keys(scale.labels);
    const lsKeys = Object.keys(ls.labels);
    if (scaleKeys.length !== lsKeys.length) return false;
    return scaleKeys.every((k) => scale.labels[Number(k)] === ls.labels[Number(k)]);
  });
}

export interface Criterion {
  id: string;
  label: string;
  user: string;
  scoreScale: ScoreScale;
}

export interface Tool {
  id: string;
  label: string;
  user: string;
}

export interface ScoreEntry {
  id: string;
  toolId: string;
  criterionId: string;
  score?: number;
  /** Overrides the criterion's default label for this score value */
  label?: string;
  comment?: string;
  timestamp: number;
  user: string;
}
