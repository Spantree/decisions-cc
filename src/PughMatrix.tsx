import { useMemo } from 'react';
import { HoverCard, Table, Theme } from '@radix-ui/themes';
import type { ScoreEntry } from './types';
import { usePughStore } from './store/usePughStore';
import './pugh-matrix.css';

export interface PughMatrixProps {
  highlight?: string;
  showWinner?: boolean;
  isDark?: boolean;
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
  const midpoint = 0.5;
  const distance = Math.abs(ratio - midpoint) / midpoint;
  const hue = ratio * 120;
  const saturation = distance * distance;

  const result = isDark
    ? {
        bg: `hsl(${hue}, ${saturation * 55 + 5}%, ${18 + distance * 8}%)`,
        text: `hsl(${hue}, ${saturation * 50 + 10}%, ${72 + distance * 10}%)`,
      }
    : {
        bg: `hsl(${hue}, ${saturation * 80 + 5}%, ${93 - distance * 10}%)`,
        text: `hsl(${hue}, ${saturation * 85 + 5}%, ${38 - distance * 16}%)`,
      };
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
  highlight,
  showWinner = false,
  isDark = false,
}: PughMatrixProps) {
  const criteria = usePughStore((s) => s.criteria);
  const tools = usePughStore((s) => s.tools);
  const scores = usePughStore((s) => s.scores);
  const weights = usePughStore((s) => s.weights);
  const showTotals = usePughStore((s) => s.showTotals);
  const editingCell = usePughStore((s) => s.editingCell);
  const editScore = usePughStore((s) => s.editScore);
  const editLabel = usePughStore((s) => s.editLabel);
  const editComment = usePughStore((s) => s.editComment);
  const setWeight = usePughStore((s) => s.setWeight);
  const startEditing = usePughStore((s) => s.startEditing);
  const cancelEditing = usePughStore((s) => s.cancelEditing);
  const setEditScore = usePughStore((s) => s.setEditScore);
  const setEditLabel = usePughStore((s) => s.setEditLabel);
  const setEditComment = usePughStore((s) => s.setEditComment);
  const addScore = usePughStore((s) => s.addScore);
  const toggleTotals = usePughStore((s) => s.toggleTotals);
  const editingHeader = usePughStore((s) => s.editingHeader);
  const editHeaderValue = usePughStore((s) => s.editHeaderValue);
  const startEditingHeader = usePughStore((s) => s.startEditingHeader);
  const cancelEditingHeader = usePughStore((s) => s.cancelEditingHeader);
  const setEditHeaderValue = usePughStore((s) => s.setEditHeaderValue);
  const saveHeaderEdit = usePughStore((s) => s.saveHeaderEdit);

  const { latestByCell, historyByCell, weightedTotals, maxTotal, winner } =
    useMemo(() => {
      const toolSet = new Set(tools.map((t) => t.id));
      const criterionSet = new Set(criteria.map((c) => c.id));
      const history = new Map<string, ScoreEntry[]>();
      const latest = new Map<string, ScoreEntry>();

      for (const entry of scores) {
        if (!toolSet.has(entry.toolId) || !criterionSet.has(entry.criterionId)) {
          throw new Error(
            `PughMatrix: score entry "${entry.id}" references invalid tool "${entry.toolId}" or criterion "${entry.criterionId}". ` +
            `Allowed tools: [${tools.map((t) => t.id).join(', ')}]. Allowed criteria: [${criteria.map((c) => c.id).join(', ')}].`,
          );
        }
        const key = `${entry.toolId}\0${entry.criterionId}`;
        const arr = history.get(key) ?? [];
        arr.push(entry);
        history.set(key, arr);
        if (entry.score != null) {
          const prev = latest.get(key);
          if (!prev || entry.timestamp > prev.timestamp) {
            latest.set(key, entry);
          }
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
          const key = `${tool.id}\0${criterion.id}`;
          const entry = latest.get(key);
          const score = entry?.score ?? 0;
          const weight = weights[criterion.id] ?? 10;
          total += score * weight;
        }
        const rounded = Math.round(total * 10) / 10;
        totals[tool.id] = rounded;
        if (rounded > max) {
          max = rounded;
          best = tool.id;
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

  const handleWeightChange = (criterionId: string, value: string) => {
    if (value === '') {
      setWeight(criterionId, 0);
      return;
    }
    const num = Math.round(Number(value));
    if (!isNaN(num) && num >= 0 && num <= 10) {
      setWeight(criterionId, num);
    }
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
    if (!editingCell) return;
    const scoreNum = editScore ? Number(editScore) : undefined;
    if (scoreNum != null && (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10)) return;
    const trimmedLabel = editLabel.trim() || undefined;
    const trimmedComment = editComment.trim() || undefined;
    if (scoreNum != null && !trimmedLabel) return;
    if (scoreNum == null && !trimmedComment) return;
    addScore({
      id: `score-${Date.now()}`,
      toolId: editingCell.toolId,
      criterionId: editingCell.criterionId,
      score: scoreNum,
      label: trimmedLabel,
      comment: trimmedComment,
      timestamp: Date.now(),
    });
    cancelEditing();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelEditing();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelEditingHeader();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      saveHeaderEdit();
    }
  };

  const isHighlighted = (toolId: string) => highlight && toolId === highlight;
  const isWinner = (toolId: string) => winner && toolId === winner;
  const isEditing = (toolId: string, criterionId: string) =>
    editingCell?.toolId === toolId && editingCell?.criterionId === criterionId;
  const isEditingHeaderCell = (type: 'tool' | 'criterion', id: string) =>
    editingHeader?.type === type && editingHeader?.id === id;

  return (
    <Theme appearance={isDark ? 'dark' : 'light'} accentColor="green" hasBackground={false}>
      <div className={`pugh-container${isDark ? ' pugh-dark' : ''}`}>
        <Table.Root variant="surface" size="2">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell justify="start">Criterion</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="72px">Weight</Table.ColumnHeaderCell>
              {tools.map((tool) => (
                <Table.ColumnHeaderCell
                  key={tool.id}
                  className={`pugh-tool-header pugh-header-editable${isWinner(tool.id) ? ' pugh-winner-header' : isHighlighted(tool.id) ? ' pugh-highlight-header' : ''}`}
                  onClick={() => startEditingHeader('tool', tool.id)}
                >
                  {isEditingHeaderCell('tool', tool.id) ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        aria-label={`Rename tool ${tool.label}`}
                        value={editHeaderValue}
                        onChange={(e) => setEditHeaderValue(e.target.value)}
                        onKeyDown={handleHeaderKeyDown}
                        onBlur={saveHeaderEdit}
                        className="pugh-header-input"
                        autoFocus
                      />
                    </div>
                  ) : (
                    isWinner(tool.id) ? `👑 ${tool.label}` : tool.label
                  )}
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {criteria.map((criterion) => (
              <Table.Row key={criterion.id}>
                <Table.RowHeaderCell
                  className="pugh-criterion-cell pugh-header-editable"
                  onClick={() => startEditingHeader('criterion', criterion.id)}
                >
                  {isEditingHeaderCell('criterion', criterion.id) ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        aria-label={`Rename criterion ${criterion.label}`}
                        value={editHeaderValue}
                        onChange={(e) => setEditHeaderValue(e.target.value)}
                        onKeyDown={handleHeaderKeyDown}
                        onBlur={saveHeaderEdit}
                        className="pugh-header-input"
                        autoFocus
                      />
                    </div>
                  ) : (
                    criterion.label
                  )}
                </Table.RowHeaderCell>
                <Table.Cell className="pugh-weight-cell">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label={`Weight for ${criterion.label}`}
                    value={weights[criterion.id]}
                    onChange={(e) => handleWeightChange(criterion.id, e.target.value)}
                    className="pugh-weight-input"
                  />
                </Table.Cell>
                {tools.map((tool) => {
                  const cellKey = `${tool.id}\0${criterion.id}`;
                  const entry = latestByCell.get(cellKey);
                  const score = entry?.score;
                  const label = entry?.label;
                  const hasScore = score != null;
                  const colors = hasScore
                    ? getScoreColor(score, isDark)
                    : { bg: 'transparent', text: 'inherit' };
                  const history = historyByCell.get(cellKey);
                  const editing = isEditing(tool.id, criterion.id);

                  return (
                    <Table.Cell
                      key={tool.id}
                      className={`pugh-score-cell pugh-score-cell-editable${isWinner(tool.id) ? ' pugh-winner-cell' : isHighlighted(tool.id) ? ' pugh-highlight-cell' : ''}`}
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}
                      onClick={() => startEditing(tool.id, criterion.id)}
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
                            placeholder="Score 1-10 (optional)"
                            aria-label={`Score for ${tool.label}, ${criterion.label}`}
                            value={editScore}
                            onChange={(e) => handleEditScoreChange(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="pugh-edit-input"
                            autoFocus
                          />
                          <input
                            type="text"
                            placeholder="Label (optional)"
                            aria-label={`Label for ${tool.label}, ${criterion.label}`}
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="pugh-edit-input"
                            maxLength={30}
                          />
                          <textarea
                            placeholder="Comment (optional)"
                            aria-label={`Comment for ${tool.label}, ${criterion.label}`}
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
                            <button type="button" onClick={cancelEditing}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : history && history.length > 0 ? (
                        <HoverCard.Root>
                          <HoverCard.Trigger>
                            <span className="pugh-score-trigger">
                              {hasScore ? (
                                <>
                                  <span className="pugh-score-number">{score}</span>
                                  {label ? (
                                    <span className="pugh-score-label">{label}</span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="pugh-score-label">💬</span>
                              )}
                            </span>
                          </HoverCard.Trigger>
                          <HoverCard.Content size="1" maxWidth="280px">
                            {history.map((h) => (
                              <div key={h.id} className="pugh-history-entry">
                                {h.score != null ? (
                                  <div className="pugh-history-score">
                                    {h.score}{h.label ? ` — ${h.label}` : ''}
                                  </div>
                                ) : null}
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
                      ) : null}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            ))}
            {showTotals && (
              <Table.Row className="pugh-total-row">
                <Table.RowHeaderCell className="pugh-total-label">Weighted Total</Table.RowHeaderCell>
                <Table.Cell className="pugh-weight-cell" />
                {tools.map((tool) => {
                  const total = weightedTotals[tool.id];
                  const colors = getScoreColor(
                    (total / maxTotal) * 10,
                    isDark,
                  );
                  return (
                    <Table.Cell
                      key={tool.id}
                      className={`pugh-total-cell${isWinner(tool.id) ? ' pugh-winner-cell' : isHighlighted(tool.id) ? ' pugh-highlight-cell' : ''}`}
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
          onClick={toggleTotals}
          type="button"
        >
          {showTotals ? 'Hide Totals' : 'Show Totals'}
        </button>
      </div>
    </Theme>
  );
}
