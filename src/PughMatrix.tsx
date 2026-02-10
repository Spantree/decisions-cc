import React, { useState, useMemo } from 'react';
import type { ScoreEntry } from './types';
import './pugh-matrix.css';

export interface PughMatrixProps {
  criteria: string[];
  tools: string[];
  scores: Record<string, Record<string, ScoreEntry>>;
  highlight?: string;
  isDark?: boolean;
}

function getScoreColor(
  score: number,
  isDark: boolean,
): { bg: string; text: string } {
  const ratio = Math.max(0, Math.min(1, (score - 1) / 9));
  const hue = ratio * 120;
  if (isDark) {
    return {
      bg: `hsl(${hue}, 45%, 22%)`,
      text: `hsl(${hue}, 60%, 78%)`,
    };
  }
  return {
    bg: `hsl(${hue}, 75%, 90%)`,
    text: `hsl(${hue}, 80%, 25%)`,
  };
}

export default function PughMatrix({
  criteria,
  tools,
  scores,
  highlight,
  isDark = false,
}: PughMatrixProps) {
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(criteria.map((c) => [c, 10])),
  );

  const [showTotals, setShowTotals] = useState(false);

  const weightedTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const tool of tools) {
      let total = 0;
      for (const criterion of criteria) {
        const entry = scores[tool]?.[criterion];
        const score = entry?.score ?? 0;
        const weight = weights[criterion] ?? 10;
        total += score * weight;
      }
      totals[tool] = Math.round(total * 10) / 10;
    }
    return totals;
  }, [criteria, tools, scores, weights]);

  const maxTotal = useMemo(
    () => Math.max(...Object.values(weightedTotals)),
    [weightedTotals],
  );

  const handleWeightChange = (criterion: string, value: string) => {
    if (value === '') {
      setWeights((prev) => ({ ...prev, [criterion]: 0 }));
      return;
    }
    const num = Math.round(Number(value));
    if (!isNaN(num) && num >= 0 && num <= 10) {
      setWeights((prev) => ({ ...prev, [criterion]: num }));
    }
  };

  const isHighlighted = (tool: string) => highlight && tool === highlight;

  return (
    <div className={`pugh-container${isDark ? ' pugh-dark' : ''}`}>
      <table className="pugh-table">
        <thead>
          <tr>
            <th className="pugh-criterion-header">Criterion</th>
            <th className="pugh-weight-header">Weight</th>
            {tools.map((tool) => (
              <th
                key={tool}
                className={`pugh-tool-header${isHighlighted(tool) ? ' pugh-highlight-header' : ''}`}
              >
                {tool}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((criterion) => (
            <tr key={criterion}>
              <td className="pugh-criterion-cell">{criterion}</td>
              <td className="pugh-weight-cell">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={weights[criterion]}
                  onChange={(e) => handleWeightChange(criterion, e.target.value)}
                  className="pugh-weight-input"
                />
              </td>
              {tools.map((tool) => {
                const entry = scores[tool]?.[criterion];
                const score = entry?.score ?? 0;
                const label = entry?.label ?? '';
                const colors = getScoreColor(score, isDark);
                return (
                  <td
                    key={tool}
                    className={`pugh-score-cell${isHighlighted(tool) ? ' pugh-highlight-cell' : ''}`}
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                    }}
                  >
                    <span className="pugh-score-number">{score}</span>
                    {label && (
                      <span className="pugh-score-label">{label}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {showTotals && (
            <tr className="pugh-total-row">
              <td className="pugh-total-label">Weighted Total</td>
              <td className="pugh-weight-cell" />
              {tools.map((tool) => {
                const total = weightedTotals[tool];
                const colors = getScoreColor(
                  (total / maxTotal) * 10,
                  isDark,
                );
                return (
                  <td
                    key={tool}
                    className={`pugh-total-cell${isHighlighted(tool) ? ' pugh-highlight-cell' : ''}`}
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                    }}
                  >
                    {total}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
      <button
        className="pugh-toggle-button"
        onClick={() => setShowTotals((prev) => !prev)}
        type="button"
      >
        {showTotals ? 'Hide Totals' : 'Show Totals'}
      </button>
    </div>
  );
}
