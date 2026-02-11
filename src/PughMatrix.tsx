import { useState, useMemo } from 'react';
import type { ScoreEntry } from './types';
import './pugh-matrix.css';

export interface PughMatrixProps {
  criteria: string[];
  tools: string[];
  scores: ScoreEntry[];
  highlight?: string;
  showWinner?: boolean;
  isDark?: boolean;
  onScoreAdd?: (entry: {
    tool: string;
    criterion: string;
    score: number;
    label: string;
    comment?: string;
  }) => void;
}

const scoreColorCache = new Map<string, { bg: string; text: string }>();

function getScoreColor(
  score: number,
  isDark: boolean,
): { bg: string; text: string } {
  const key = `${score}-${isDark}`;
  const cached = scoreColorCache.get(key);
  if (cached) return cached;

  const ratio = Math.max(0, Math.min(1, (score - 1) / 9));
  const hue = ratio * 120;
  const result = isDark
    ? { bg: `hsl(${hue}, 45%, 22%)`, text: `hsl(${hue}, 60%, 78%)` }
    : { bg: `hsl(${hue}, 75%, 90%)`, text: `hsl(${hue}, 80%, 25%)` };
  scoreColorCache.set(key, result);
  return result;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PughMatrix({
  criteria,
  tools,
  scores,
  highlight,
  showWinner = false,
  isDark = false,
  onScoreAdd,
}: PughMatrixProps) {
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(criteria.map((c) => [c, 10])),
  );

  const [showTotals, setShowTotals] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    tool: string;
    criterion: string;
  } | null>(null);
  const [editScore, setEditScore] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editComment, setEditComment] = useState('');

  const { latestByCell, historyByCell, weightedTotals, maxTotal, winner } =
    useMemo(() => {
      const history = new Map<string, ScoreEntry[]>();
      const latest = new Map<string, ScoreEntry>();

      for (const entry of scores) {
        const key = `${entry.tool}\0${entry.criterion}`;
        const arr = history.get(key) ?? [];
        arr.push(entry);
        history.set(key, arr);
        const prev = latest.get(key);
        if (!prev || entry.timestamp > prev.timestamp) {
          latest.set(key, entry);
        }
      }

      for (const [key, arr] of history.entries()) {
        history.set(key, arr.toSorted((a, b) => b.timestamp - a.timestamp));
      }

      const totals: Record<string, number> = {};
      let max = -Infinity;
      let best = '';
      for (const tool of tools) {
        let total = 0;
        for (const criterion of criteria) {
          const key = `${tool}\0${criterion}`;
          const entry = latest.get(key);
          const score = entry?.score ?? 0;
          const weight = weights[criterion] ?? 10;
          total += score * weight;
        }
        const rounded = Math.round(total * 10) / 10;
        totals[tool] = rounded;
        if (rounded > max) {
          max = rounded;
          best = tool;
        }
      }

      return {
        latestByCell: latest,
        historyByCell: history,
        weightedTotals: totals,
        maxTotal: max,
        winner: showWinner ? best : null,
      };
    }, [scores, tools, criteria, weights, showWinner]);

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

  const handleCellClick = (tool: string, criterion: string) => {
    if (!onScoreAdd) return;
    setEditingCell({ tool, criterion });
    setEditScore('');
    setEditLabel('');
    setEditComment('');
  };

  const handleEditScoreChange = (value: string) => {
    if (value === '') {
      setEditScore('');
      return;
    }
    const num = Math.round(Number(value));
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setEditScore(String(num));
    }
  };

  const handleEditSave = () => {
    if (!editingCell || !onScoreAdd) return;
    const scoreNum = Number(editScore);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) return;
    if (!editLabel.trim()) return;
    onScoreAdd({
      tool: editingCell.tool,
      criterion: editingCell.criterion,
      score: scoreNum,
      label: editLabel.trim(),
      comment: editComment.trim() || undefined,
    });
    setEditingCell(null);
  };

  const handleEditCancel = () => {
    setEditingCell(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleEditCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
  };

  const isHighlighted = (tool: string) => highlight && tool === highlight;
  const isWinner = (tool: string) => winner && tool === winner;
  const isEditing = (tool: string, criterion: string) =>
    editingCell?.tool === tool && editingCell?.criterion === criterion;

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
                className={`pugh-tool-header${isWinner(tool) ? ' pugh-winner-header' : isHighlighted(tool) ? ' pugh-highlight-header' : ''}`}
              >
                {isWinner(tool) ? `👑 ${tool}` : tool}
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
                const cellKey = `${tool}\0${criterion}`;
                const entry = latestByCell.get(cellKey);
                const score = entry?.score ?? 0;
                const label = entry?.label ?? '';
                const colors = getScoreColor(score, isDark);
                const history = historyByCell.get(cellKey);
                const editing = isEditing(tool, criterion);

                return (
                  <td
                    key={tool}
                    className={`pugh-score-cell${onScoreAdd ? ' pugh-score-cell-editable' : ''}${isWinner(tool) ? ' pugh-winner-cell' : isHighlighted(tool) ? ' pugh-highlight-cell' : ''}`}
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                    }}
                    onClick={() => handleCellClick(tool, criterion)}
                  >
                    {editing ? (
                      <div
                        className="pugh-edit-form"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Score (1-10)"
                          value={editScore}
                          onChange={(e) => handleEditScoreChange(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="pugh-edit-input"
                          autoFocus
                        />
                        <input
                          type="text"
                          placeholder="Label"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="pugh-edit-input"
                          maxLength={30}
                        />
                        <textarea
                          placeholder="Comment (optional)"
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="pugh-edit-comment"
                          rows={2}
                        />
                        <div className="pugh-edit-actions">
                          <button type="button" onClick={handleEditSave}>
                            Save
                          </button>
                          <button type="button" onClick={handleEditCancel}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="pugh-score-number">{score}</span>
                        {label ? (
                          <span className="pugh-score-label">{label}</span>
                        ) : null}
                        {history && history.length > 0 ? (
                          <div className="pugh-history-tooltip">
                            {history.map((h) => (
                              <div key={h.id} className="pugh-history-entry">
                                <div className="pugh-history-score">
                                  {h.score} &mdash; {h.label}
                                </div>
                                {h.comment ? (
                                  <div className="pugh-history-comment">
                                    &ldquo;{h.comment}&rdquo;
                                  </div>
                                ) : null}
                                <div className="pugh-history-date">
                                  {formatDate(h.timestamp)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
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
                    className={`pugh-total-cell${isWinner(tool) ? ' pugh-winner-cell' : isHighlighted(tool) ? ' pugh-highlight-cell' : ''}`}
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
