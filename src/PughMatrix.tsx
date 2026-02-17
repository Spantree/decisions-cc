import { useMemo } from 'react';
import { HoverCard, Table, Theme } from '@radix-ui/themes';
import {
  red, tomato, amber, yellow, lime, grass, green,
  greenDark,
} from '@radix-ui/colors';
import type { ScoreEntry } from './types';
import { SCORE_RANGES, LABEL_SETS, labelSetsForRange, formatCount } from './types';
import { usePughStore } from './store/usePughStore';
import { scoreId, toolId, criterionId } from './ids';
import './pugh-matrix.css';

export interface PughMatrixProps {
  highlight?: string;
  showWinner?: boolean;
  isDark?: boolean;
  readOnly?: boolean;
}

const GRADIENT_LIGHT = [
  { bg: red.red5,       text: red.red11 },
  { bg: red.red6,       text: red.red11 },
  { bg: tomato.tomato5, text: tomato.tomato11 },
  { bg: amber.amber6,   text: amber.amber11 },
  { bg: yellow.yellow5, text: yellow.yellow11 },
  { bg: lime.lime5,     text: lime.lime12 },
  { bg: grass.grass5,   text: grass.grass12 },
  { bg: grass.grass6,   text: grass.grass12 },
  { bg: green.green5,   text: green.green12 },
  { bg: green.green6,   text: green.green12 },
];

const GRADIENT_DARK = [
  { bg: red.red9,       text: red.red2 },
  { bg: red.red9,       text: red.red2 },
  { bg: tomato.tomato9, text: tomato.tomato2 },
  { bg: amber.amber9,   text: amber.amber12 },
  { bg: yellow.yellow9, text: yellow.yellow12 },
  { bg: lime.lime9,     text: lime.lime12 },
  { bg: grass.grass9,   text: grass.grass2 },
  { bg: grass.grass9,   text: grass.grass2 },
  { bg: green.green9,   text: green.green2 },
  { bg: greenDark.green11, text: greenDark.green1 },
];

function getScoreColor(
  score: number,
  min: number,
  max: number,
  isDark: boolean,
): { bg: string; text: string } {
  const gradient = isDark ? GRADIENT_DARK : GRADIENT_LIGHT;
  if (min === max) return gradient[Math.floor(gradient.length / 2)];
  const normalized = (score - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, normalized));
  const index = Math.round(clamped * (gradient.length - 1));
  return gradient[index];
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
  readOnly = false,
}: PughMatrixProps) {
  const criteria = usePughStore((s) => s.criteria);
  const tools = usePughStore((s) => s.tools);
  const scores = usePughStore((s) => s.scores);
  const weights = usePughStore((s) => s.weights);
  const showTotals = usePughStore((s) => s.showTotals);
  const showWeights = usePughStore((s) => s.showWeights);
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
  const toggleWeights = usePughStore((s) => s.toggleWeights);
  const addTool = usePughStore((s) => s.addTool);
  const removeTool = usePughStore((s) => s.removeTool);
  const addCriterion = usePughStore((s) => s.addCriterion);
  const removeCriterion = usePughStore((s) => s.removeCriterion);
  const editingHeader = usePughStore((s) => s.editingHeader);
  const editHeaderValue = usePughStore((s) => s.editHeaderValue);
  const startEditingHeader = usePughStore((s) => s.startEditingHeader);
  const cancelEditingHeader = usePughStore((s) => s.cancelEditingHeader);
  const setEditHeaderValue = usePughStore((s) => s.setEditHeaderValue);
  const saveHeaderEdit = usePughStore((s) => s.saveHeaderEdit);
  const editHeaderRangeId = usePughStore((s) => s.editHeaderRangeId);
  const editHeaderLabelSetId = usePughStore((s) => s.editHeaderLabelSetId);
  const setEditHeaderRangeId = usePughStore((s) => s.setEditHeaderRangeId);
  const setEditHeaderLabelSetId = usePughStore((s) => s.setEditHeaderLabelSetId);
  const setCriterionScale = usePughStore((s) => s.setCriterionScale);

  const { latestByCell, historyByCell, weightedTotals, maxTotal, winner, maxByCriterion } =
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

      // Compute max score per proportional criterion (for normalization)
      const maxByCrit: Record<string, number> = {};
      for (const criterion of criteria) {
        if (!criterion.scoreScale.proportional) continue;
        let cMax = 0;
        for (const tool of tools) {
          const key = `${tool.id}\0${criterion.id}`;
          const e = latest.get(key);
          if (e?.score != null && e.score > cMax) cMax = e.score;
        }
        maxByCrit[criterion.id] = cMax;
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
          let normalized: number;
          if (criterion.scoreScale.proportional) {
            const maxInCrit = maxByCrit[criterion.id] ?? 0;
            normalized = maxInCrit > 0 ? score / maxInCrit : 0;
          } else {
            const { min: sMin, max: sMax } = criterion.scoreScale;
            normalized = sMax !== sMin ? (score - sMin) / (sMax - sMin) : 0.5;
          }
          total += normalized * weight;
        }
        const rounded = Math.round(total);
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
        maxByCriterion: maxByCrit,
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

  const editingCriterion = editingCell
    ? criteria.find((c) => c.id === editingCell.criterionId)
    : null;
  const editingScale = editingCriterion?.scoreScale;

  const handleEditScoreChange = (value: string) => {
    if (value === '' || value === '-') {
      setEditScore(value);
      return;
    }
    const num = Math.round(Number(value));
    if (!isNaN(num) && editingScale) {
      if (editingScale.proportional) {
        if (num >= 0) setEditScore(String(num));
      } else if (num >= editingScale.min && num <= editingScale.max) {
        setEditScore(String(num));
      }
    }
  };

  const handleEditSave = () => {
    if (!editingCell || !editingScale) return;
    const scoreNum = editScore && editScore !== '-' ? Number(editScore) : undefined;
    if (scoreNum != null) {
      if (editingScale.proportional) {
        if (isNaN(scoreNum) || scoreNum < 0) return;
      } else if (isNaN(scoreNum) || scoreNum < editingScale.min || scoreNum > editingScale.max) {
        return;
      }
    }
    const trimmedLabel = editLabel.trim() || undefined;
    const trimmedComment = editComment.trim() || undefined;
    if (scoreNum == null && !trimmedComment) return;
    addScore({
      id: scoreId(),
      toolId: editingCell.toolId,
      criterionId: editingCell.criterionId,
      score: scoreNum,
      label: trimmedLabel,
      comment: trimmedComment,
      timestamp: Date.now(),
      user: 'anonymous',
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

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editingHeader || editingHeader.type !== 'criterion') return;
    const critId = editingHeader.id;
    const criterion = criteria.find((c) => c.id === critId);
    if (!criterion) return;
    const oldScale = criterion.scoreScale;
    const newRangeId = e.target.value;
    setEditHeaderRangeId(newRangeId);
    const availableSets = labelSetsForRange(newRangeId);
    const firstSet = availableSets[0];
    if (firstSet) {
      setEditHeaderLabelSetId(firstSet.id);
      const range = SCORE_RANGES.find((r) => r.id === newRangeId)!;
      const isNewProportional = newRangeId === 'proportional';
      const wasProportional = !!oldScale.proportional;
      const newScale = {
        min: range.min,
        max: range.max,
        labels: firstSet.labels,
        ...(isNewProportional ? { proportional: true as const } : {}),
      };
      setCriterionScale(critId, newScale);
      // Rescale existing scores
      if (wasProportional && !isNewProportional) {
        // Proportional → fixed: normalize by max in criterion, then map to new range
        const maxInCrit = maxByCriterion[critId] ?? 0;
        const newSpan = range.max - range.min;
        for (const tool of tools) {
          const cellKey = `${tool.id}\0${critId}`;
          const entry = latestByCell.get(cellKey);
          if (entry?.score != null && maxInCrit > 0) {
            const normalized = entry.score / maxInCrit;
            const rescaled = Math.round(range.min + normalized * newSpan);
            const clamped = Math.max(range.min, Math.min(range.max, rescaled));
            addScore({
              id: scoreId(),
              toolId: tool.id,
              criterionId: critId,
              score: clamped,
              label: undefined,
              comment: undefined,
              timestamp: Date.now(),
              user: 'anonymous',
            });
          }
        }
      } else if (!wasProportional && isNewProportional) {
        // Fixed → proportional: no automatic rescaling — user must enter real counts
      } else if (oldScale.min !== range.min || oldScale.max !== range.max) {
        // Fixed → fixed: rescale as before
        const oldSpan = oldScale.max - oldScale.min;
        const newSpan = range.max - range.min;
        for (const tool of tools) {
          const cellKey = `${tool.id}\0${critId}`;
          const entry = latestByCell.get(cellKey);
          if (entry?.score != null && oldSpan > 0) {
            const normalized = (entry.score - oldScale.min) / oldSpan;
            const rescaled = Math.round(range.min + normalized * newSpan);
            const clamped = Math.max(range.min, Math.min(range.max, rescaled));
            addScore({
              id: scoreId(),
              toolId: tool.id,
              criterionId: critId,
              score: clamped,
              label: undefined,
              comment: undefined,
              timestamp: Date.now(),
              user: 'anonymous',
            });
          }
        }
      }
    }
  };

  const handleLabelSetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!editingHeader || editingHeader.type !== 'criterion') return;
    const newLabelSetId = e.target.value;
    setEditHeaderLabelSetId(newLabelSetId);
    const ls = LABEL_SETS.find((l) => l.id === newLabelSetId);
    if (ls) {
      const range = SCORE_RANGES.find((r) => r.id === editHeaderRangeId)!;
      const isProportional = editHeaderRangeId === 'proportional';
      setCriterionScale(editingHeader.id, {
        min: range.min,
        max: range.max,
        labels: ls.labels,
        ...(isProportional ? { proportional: true as const } : {}),
      });
    }
  };

  const handleAddTool = () => {
    const label = 'New Tool';
    const id = toolId();
    addTool(id, label, 'anonymous');
    startEditingHeader('tool', id);
  };

  const handleAddCriterion = () => {
    const label = 'New Criterion';
    const id = criterionId();
    addCriterion(id, label);
    startEditingHeader('criterion', id);
  };

  const handleDeleteHeader = () => {
    if (!editingHeader) return;
    const { type, id } = editingHeader;
    if (type === 'tool') {
      removeTool(id);
    } else {
      removeCriterion(id);
    }
    cancelEditingHeader();
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
              {showWeights && <Table.ColumnHeaderCell width="72px">Weight</Table.ColumnHeaderCell>}
              {tools.map((tool) => (
                <Table.ColumnHeaderCell
                  key={tool.id}
                  className={`pugh-tool-header${!readOnly ? ' pugh-header-editable' : ''}${isWinner(tool.id) ? ' pugh-winner-header' : isHighlighted(tool.id) ? ' pugh-highlight-header' : ''}`}
                  onClick={readOnly ? undefined : () => startEditingHeader('tool', tool.id)}
                >
                  {isEditingHeaderCell('tool', tool.id) ? (
                    <div className="pugh-header-edit-row" onClick={(e) => e.stopPropagation()}>
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
                      <button
                        type="button"
                        className="pugh-header-delete-button"
                        aria-label={`Delete tool ${tool.label}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleDeleteHeader}
                      >
                        🗑
                      </button>
                    </div>
                  ) : (
                    isWinner(tool.id) ? `👑 ${tool.label}` : tool.label
                  )}
                </Table.ColumnHeaderCell>
              ))}
              {!readOnly && (
                <Table.ColumnHeaderCell className="pugh-add-cell">
                  <button
                    type="button"
                    className="pugh-add-button"
                    aria-label="Add tool"
                    onClick={handleAddTool}
                  >
                    +
                  </button>
                </Table.ColumnHeaderCell>
              )}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {criteria.map((criterion) => (
              <Table.Row key={criterion.id}>
                <Table.RowHeaderCell
                  className={`pugh-criterion-cell${!readOnly ? ' pugh-header-editable' : ''}`}
                  onClick={readOnly ? undefined : () => startEditingHeader('criterion', criterion.id)}
                >
                  {isEditingHeaderCell('criterion', criterion.id) ? (
                    <div className="pugh-header-edit-col" onClick={(e) => e.stopPropagation()}>
                      <div className="pugh-header-edit-row">
                        <input
                          type="text"
                          aria-label={`Rename criterion ${criterion.label}`}
                          value={editHeaderValue}
                          onChange={(e) => setEditHeaderValue(e.target.value)}
                          onKeyDown={handleHeaderKeyDown}
                          className="pugh-header-input"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="pugh-header-delete-button"
                          aria-label={`Delete criterion ${criterion.label}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleDeleteHeader}
                        >
                          🗑
                        </button>
                      </div>
                      <select
                        aria-label={`Score range for ${criterion.label}`}
                        className="pugh-header-select"
                        value={editHeaderRangeId}
                        onChange={handleRangeChange}
                      >
                        {SCORE_RANGES.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <select
                        aria-label={`Label set for ${criterion.label}`}
                        className="pugh-header-select"
                        value={editHeaderLabelSetId}
                        onChange={handleLabelSetChange}
                      >
                        {labelSetsForRange(editHeaderRangeId).map((ls) => (
                          <option key={ls.id} value={ls.id}>{ls.name}</option>
                        ))}
                      </select>
                      <div className="pugh-edit-actions">
                        <button type="button" onClick={saveHeaderEdit}>Save</button>
                        <button type="button" onClick={cancelEditingHeader}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    criterion.label
                  )}
                </Table.RowHeaderCell>
                {showWeights && (
                  <Table.Cell className="pugh-weight-cell">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label={`Weight for ${criterion.label}`}
                      value={weights[criterion.id]}
                      onChange={(e) => handleWeightChange(criterion.id, e.target.value)}
                      className="pugh-weight-input"
                      readOnly={readOnly}
                    />
                  </Table.Cell>
                )}
                {tools.map((tool) => {
                  const cellKey = `${tool.id}\0${criterion.id}`;
                  const entry = latestByCell.get(cellKey);
                  const score = entry?.score;
                  const hasScore = score != null;
                  const isProportional = !!criterion.scoreScale.proportional;
                  const maxInCrit = maxByCriterion[criterion.id] ?? 0;
                  const displayLabel = hasScore
                    ? isProportional
                      ? (maxInCrit > 0 ? `${Math.round((score / maxInCrit) * 100)}%` : '0%')
                      : (entry?.label || criterion.scoreScale.labels[score])
                    : undefined;
                  const displayScore = hasScore && isProportional ? formatCount(score) : score;
                  const colors = hasScore
                    ? isProportional
                      ? getScoreColor(score, 0, maxInCrit || 1, isDark)
                      : getScoreColor(score, criterion.scoreScale.min, criterion.scoreScale.max, isDark)
                    : { bg: 'transparent', text: 'inherit' };
                  const history = historyByCell.get(cellKey);
                  const editing = isEditing(tool.id, criterion.id);

                  return (
                    <Table.Cell
                      key={tool.id}
                      className={`pugh-score-cell${!readOnly ? ' pugh-score-cell-editable' : ''}${isWinner(tool.id) ? ' pugh-winner-cell' : isHighlighted(tool.id) ? ' pugh-highlight-cell' : ''}`}
                      onClick={readOnly ? undefined : () => startEditing(tool.id, criterion.id)}
                    >
                      <div
                        className="pugh-score-fill"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                      {editing ? (
                        <div
                          className="pugh-edit-form"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="pugh-edit-hint">
                            Enter a score or comment
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={editingScale?.proportional ? 'Count (e.g. 228000)' : editingScale ? `Score ${editingScale.min} to ${editingScale.max}` : 'Score'}
                            aria-label={`Score for ${tool.label}, ${criterion.label}`}
                            value={editScore}
                            onChange={(e) => handleEditScoreChange(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="pugh-edit-input"
                            autoFocus
                          />
                          {editScore && editScore !== '-' && !editingScale?.proportional && editingScale?.labels[Number(editScore)] && (
                            <span className="pugh-edit-hint">
                              = {editingScale.labels[Number(editScore)]}
                            </span>
                          )}
                          <input
                            type="text"
                            placeholder={editScore && editScore !== '-' && !editingScale?.proportional && editingScale?.labels[Number(editScore)]
                              ? `Label (default: ${editingScale.labels[Number(editScore)]})`
                              : 'Label (optional)'}
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
                                  <span className="pugh-score-number">{displayScore}</span>
                                  {displayLabel ? (
                                    <span className="pugh-score-label">{displayLabel}</span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="pugh-score-label">💬</span>
                              )}
                            </span>
                          </HoverCard.Trigger>
                          <HoverCard.Content size="1" maxWidth="280px">
                            {history.map((h) => {
                              const hScore = h.score != null && isProportional ? formatCount(h.score) : h.score;
                              const hLabel = h.score != null
                                ? (h.label || (isProportional ? undefined : criterion.scoreScale.labels[h.score]))
                                : undefined;
                              return (
                              <div key={h.id} className="pugh-history-entry">
                                {h.score != null ? (
                                  <div className="pugh-history-score">
                                    {hScore}{hLabel ? ` — ${hLabel}` : ''}
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
                              );
                            })}
                          </HoverCard.Content>
                        </HoverCard.Root>
                      ) : null}
                      </div>
                    </Table.Cell>
                  );
                })}
                {!readOnly && <Table.Cell />}
              </Table.Row>
            ))}
            {showTotals && (
              <Table.Row className="pugh-total-row">
                <Table.RowHeaderCell className="pugh-total-label">Weighted Total</Table.RowHeaderCell>
                {showWeights && <Table.Cell className="pugh-weight-cell" />}
                {tools.map((tool) => {
                  const total = weightedTotals[tool.id];
                  const colors = maxTotal > 0
                    ? getScoreColor(total, 0, maxTotal, isDark)
                    : { bg: 'transparent', text: 'inherit' };
                  return (
                    <Table.Cell
                      key={tool.id}
                      className={`pugh-total-cell${isWinner(tool.id) ? ' pugh-winner-cell' : isHighlighted(tool.id) ? ' pugh-highlight-cell' : ''}`}
                    >
                      <div
                        className="pugh-score-fill"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {total}
                      </div>
                    </Table.Cell>
                  );
                })}
                {!readOnly && <Table.Cell />}
              </Table.Row>
            )}
            {!readOnly && (
              <Table.Row>
                <Table.Cell colSpan={tools.length + (showWeights ? 3 : 2)} className="pugh-add-cell">
                  <button
                    type="button"
                    className="pugh-add-button"
                    aria-label="Add criterion"
                    onClick={handleAddCriterion}
                  >
                    +
                  </button>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
        {!readOnly && (
          <>
            <button
              className="pugh-toggle-button"
              onClick={toggleWeights}
              type="button"
            >
              {showWeights ? 'Hide Weights' : 'Show Weights'}
            </button>
            <button
              className="pugh-toggle-button"
              onClick={toggleTotals}
              type="button"
            >
              {showTotals ? 'Hide Totals' : 'Show Totals'}
            </button>
          </>
        )}
      </div>
    </Theme>
  );
}
