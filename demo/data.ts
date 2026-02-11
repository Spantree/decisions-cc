import type { ScoreEntry } from 'decisionapp';

export const criteria = [
  'Cost',
  'Performance',
  'Ease of Use',
  'Community Support',
  'Documentation',
];

export const tools = ['React', 'Vue', 'Svelte', 'Angular'];

export const scores: Record<string, Record<string, ScoreEntry>> = {
  React: {
    Cost: { score: 9, label: 'Free' },
    Performance: { score: 7, label: 'Good' },
    'Ease of Use': { score: 6, label: 'Moderate' },
    'Community Support': { score: 10, label: 'Massive' },
    Documentation: { score: 8, label: 'Extensive' },
  },
  Vue: {
    Cost: { score: 9, label: 'Free' },
    Performance: { score: 8, label: 'Great' },
    'Ease of Use': { score: 9, label: 'Easy' },
    'Community Support': { score: 7, label: 'Strong' },
    Documentation: { score: 9, label: 'Excellent' },
  },
  Svelte: {
    Cost: { score: 9, label: 'Free' },
    Performance: { score: 10, label: 'Fastest' },
    'Ease of Use': { score: 8, label: 'Simple' },
    'Community Support': { score: 5, label: 'Growing' },
    Documentation: { score: 7, label: 'Good' },
  },
  Angular: {
    Cost: { score: 9, label: 'Free' },
    Performance: { score: 6, label: 'Decent' },
    'Ease of Use': { score: 4, label: 'Complex' },
    'Community Support': { score: 8, label: 'Large' },
    Documentation: { score: 8, label: 'Thorough' },
  },
};
