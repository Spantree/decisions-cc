import { useState, useMemo } from 'react';
import { HoverCard, Table, Text, Theme } from '@radix-ui/themes';
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
      const toolSet = new Set(tools);
      const criterionSet = new Set(criteria);
      const history = new Map<string, ScoreEntry[]>();
      const latest = new Map<string, ScoreEntry>();

      for (const entry of scores) {
        if (!toolSet.has(entry.tool) || !criterionSet.has(entry.criterion)) {
          throw new Error(
            `PughMatrix: score entry "${entry.id}" references invalid tool "${entry.tool}" or criterion "${entry.criterion}". ` +
            `Allowed tools: [${tools.join(', ')}]. Allowed criteria: [${criteria.join(', ')}].`,
          );
        }
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
    <Theme appearance={isDark ? 'dark' : 'light'} accentColor="green" hasBackground={false}>
      <div className={`pugh-container${isDark ? ' pugh-dark' : ''}`}>
        <Table.Root variant="surface" size="2">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell justify="start"><Text weight="bold" highContrast>Criterion</Text></Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="72px"><Text weight="bold" highContrast>Weight</Text></Table.ColumnHeaderCell>
              {tools.map((tool) => (
                <Table.ColumnHeaderCell
                  key={tool}
                  className={`pugh-tool-header${isWinner(tool) ? ' pugh-winner-header' : isHighlighted(tool) ? ' pugh-highlight-header' : ''}`}
                >
                  <Text weight="bold" highContrast>{isWinner(tool) ? `👑 ${tool}` : tool}</Text>
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {criteria.map((criterion) => (
              <Table.Row key={criterion}>
                <Table.RowHeaderCell className="pugh-criterion-cell"><Text weight="bold" highContrast>{criterion}</Text></Table.RowHeaderCell>
                <Table.Cell className="pugh-weight-cell">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label={`Weight for ${criterion}`}
                    value={weights[criterion]}
                    onChange={(e) => handleWeightChange(criterion, e.target.value)}
                    className="pugh-weight-input"
                  />
                </Table.Cell>
                {tools.map((tool) => {
                  const cellKey = `${tool}\0${criterion}`;
                  const entry = latestByCell.get(cellKey);
                  const score = entry?.score ?? 0;
                  const label = entry?.label ?? '';
                  const colors = getScoreColor(score, isDark);
                  const history = historyByCell.get(cellKey);
                  const editing = isEditing(tool, criterion);

                  return (
                    <Table.Cell
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
                            aria-label={`Score for ${tool}, ${criterion}`}
                            value={editScore}
                            onChange={(e) => handleEditScoreChange(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="pugh-edit-input"
                            autoFocus
                          />
                          <input
                            type="text"
                            placeholder="Label"
                            aria-label={`Label for ${tool}, ${criterion}`}
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="pugh-edit-input"
                            maxLength={30}
                          />
                          <textarea
                            placeholder="Comment (optional)"
                            aria-label={`Comment for ${tool}, ${criterion}`}
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
                      ) : history && history.length > 0 ? (
                        <HoverCard.Root>
                          <HoverCard.Trigger>
                            <span className="pugh-score-trigger">
                              <span className="pugh-score-number">{score}</span>
                              {label ? (
                                <span className="pugh-score-label">{label}</span>
                              ) : null}
                            </span>
                          </HoverCard.Trigger>
                          <HoverCard.Content size="1" maxWidth="280px">
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
                          </HoverCard.Content>
                        </HoverCard.Root>
                      ) : (
                        <>
                          <span className="pugh-score-number">{score}</span>
                          {label ? (
                            <span className="pugh-score-label">{label}</span>
                          ) : null}
                        </>
                      )}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            ))}
            {showTotals && (
              <Table.Row className="pugh-total-row">
                <Table.RowHeaderCell className="pugh-total-label"><Text weight="bold" highContrast>Weighted Total</Text></Table.RowHeaderCell>
                <Table.Cell className="pugh-weight-cell" />
                {tools.map((tool) => {
                  const total = weightedTotals[tool];
                  const colors = getScoreColor(
                    (total / maxTotal) * 10,
                    isDark,
                  );
                  return (
                    <Table.Cell
                      key={tool}
                      className={`pugh-total-cell${isWinner(tool) ? ' pugh-winner-cell' : isHighlighted(tool) ? ' pugh-highlight-cell' : ''}`}
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}
                    >
                      {total}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
        <button
          className="pugh-toggle-button"
          onClick={() => setShowTotals((prev) => !prev)}
          type="button"
        >
          {showTotals ? 'Hide Totals' : 'Show Totals'}
        </button>
      </div>
    </Theme>
  );
}
