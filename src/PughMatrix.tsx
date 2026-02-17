import { useMemo } from 'react';
import { HoverCard, Table, Theme } from '@radix-ui/themes';
import {
  red, tomato, amber, yellow, lime, grass, green,
  greenDark,
} from '@radix-ui/colors';
import type { ScoreEntry, ScaleType } from './types';
import { getEffectiveScale, normalizeScore, getScoreColor, formatCount, labelSetsForRange, LABEL_SETS } from './types';
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

function pickColor(
  gradientIndex: number,
  isDark: boolean,
): { bg: string; text: string } {
  const gradient = isDark ? GRADIENT_DARK : GRADIENT_LIGHT;
  const clamped = Math.max(0, Math.min(gradient.length - 1, gradientIndex));
  return gradient[clamped];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function displayScoreValue(score: number, scale: ScaleType): string {
  switch (scale.kind) {
    case 'binary':
      return score ? 'Yes' : 'No';
    case 'unbounded':
      return formatCount(score);
    case 'numeric':
      return String(score);
  }
}

/** Returns the label for a score, checking per-entry override first, then scale defaults. */
function getScoreLabel(score: number, scale: ScaleType, entryLabel?: string): string | undefined {
  if (entryLabel) return entryLabel;
  if (scale.kind === 'numeric' && scale.labels) return scale.labels[score];
  return undefined;
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
  const matrixConfig = usePughStore((s) => s.matrixConfig);
  const showTotals = usePughStore((s) => s.showTotals);
  const showWeights = usePughStore((s) => s.showWeights);
  const showLabels = usePughStore((s) => s.showLabels);
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
  const toggleLabels = usePughStore((s) => s.toggleLabels);
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
  const editHeaderScaleKind = usePughStore((s) => s.editHeaderScaleKind);
  const editHeaderScaleMin = usePughStore((s) => s.editHeaderScaleMin);
  const editHeaderScaleMax = usePughStore((s) => s.editHeaderScaleMax);
  const editHeaderScaleStep = usePughStore((s) => s.editHeaderScaleStep);
  const editHeaderLabelSetId = usePughStore((s) => s.editHeaderLabelSetId);
  const setEditHeaderScaleKind = usePughStore((s) => s.setEditHeaderScaleKind);
  const setEditHeaderScaleMin = usePughStore((s) => s.setEditHeaderScaleMin);
  const setEditHeaderScaleMax = usePughStore((s) => s.setEditHeaderScaleMax);
  const setEditHeaderScaleStep = usePughStore((s) => s.setEditHeaderScaleStep);
  const setEditHeaderLabelSetId = usePughStore((s) => s.setEditHeaderLabelSetId);
  const setCriterionScale = usePughStore((s) => s.setCriterionScale);

  const { latestByCell, historyByCell, weightedTotals, maxTotal, winner, allScoresByCriterion } =
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

      // Collect all scores per criterion (for unbounded normalization)
      const allByCrit: Record<string, number[]> = {};
      for (const criterion of criteria) {
        const critScores: number[] = [];
        for (const tool of tools) {
          const key = `${tool.id}\0${criterion.id}`;
          const e = latest.get(key);
          if (e?.score != null) critScores.push(e.score);
        }
        allByCrit[criterion.id] = critScores;
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
          const scale = getEffectiveScale(criterion, matrixConfig.defaultScale);
          const critScores = allByCrit[criterion.id] ?? [];
          const normalized = normalizeScore(score, scale, critScores, matrixConfig.allowNegative);
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
        allScoresByCriterion: allByCrit,
      };
    }, [scores, tools, criteria, weights, showWinner, matrixConfig]);

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
  const editingScale = editingCriterion
    ? getEffectiveScale(editingCriterion, matrixConfig.defaultScale)
    : null;

  const handleEditScoreChange = (value: string) => {
    if (!editingScale) return;
    if (value === '' || value === '-') {
      setEditScore(value);
      return;
    }
    if (editingScale.kind === 'binary') {
      // handled by toggle, but allow 0/1
      if (value === '0' || value === '1') setEditScore(value);
      return;
    }
    const num = Number(value);
    if (!isNaN(num)) {
      if (editingScale.kind === 'unbounded') {
        if (num >= 0) setEditScore(value);
      } else {
        if (num >= editingScale.min && num <= editingScale.max) setEditScore(value);
      }
    }
  };

  const handleEditSave = () => {
    if (!editingCell || !editingScale) return;
    const scoreNum = editScore && editScore !== '-' ? Number(editScore) : undefined;
    if (scoreNum != null) {
      if (editingScale.kind === 'unbounded') {
        if (isNaN(scoreNum) || scoreNum < 0) return;
      } else if (editingScale.kind === 'numeric') {
        if (isNaN(scoreNum) || scoreNum < editingScale.min || scoreNum > editingScale.max) return;
      } else if (editingScale.kind === 'binary') {
        if (scoreNum !== 0 && scoreNum !== 1) return;
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

  const handleSaveHeader = () => {
    if (!editingHeader) return;

    // For tool headers, just save the rename
    if (editingHeader.type === 'tool') {
      saveHeaderEdit();
      return;
    }

    // Criterion header: capture old scale before save
    const critId = editingHeader.id;
    const criterion = criteria.find((c) => c.id === critId);
    if (!criterion) { saveHeaderEdit(); return; }

    const oldScale = getEffectiveScale(criterion, matrixConfig.defaultScale);
    const newKind = editHeaderScaleKind;
    const nMin = Number(editHeaderScaleMin) || 1;
    const nMax = Number(editHeaderScaleMax) || 10;

    // Save dispatches rename + scale override + clears edit state
    saveHeaderEdit();

    // Rescale existing scores when switching between scale types
    if (oldScale.kind === 'numeric' && newKind === 'binary') {
      const midpoint = (oldScale.min + oldScale.max) / 2;
      for (const tool of tools) {
        const cellKey = `${tool.id}\0${critId}`;
        const entry = latestByCell.get(cellKey);
        if (entry?.score != null) {
          addScore({
            id: scoreId(), toolId: tool.id, criterionId: critId,
            score: entry.score > midpoint ? 1 : 0,
            timestamp: Date.now(), user: 'anonymous',
          });
        }
      }
    } else if (oldScale.kind === 'binary' && newKind === 'numeric') {
      for (const tool of tools) {
        const cellKey = `${tool.id}\0${critId}`;
        const entry = latestByCell.get(cellKey);
        if (entry?.score != null) {
          addScore({
            id: scoreId(), toolId: tool.id, criterionId: critId,
            score: entry.score ? nMax : nMin,
            timestamp: Date.now(), user: 'anonymous',
          });
        }
      }
    } else if (oldScale.kind === 'unbounded' && newKind === 'numeric') {
      const allScores = allScoresByCriterion[critId] ?? [];
      const maxInCrit = Math.max(0, ...allScores);
      const span = nMax - nMin;
      for (const tool of tools) {
        const cellKey = `${tool.id}\0${critId}`;
        const entry = latestByCell.get(cellKey);
        if (entry?.score != null && maxInCrit > 0) {
          const normalized = entry.score / maxInCrit;
          const rescaled = Math.round(nMin + normalized * span);
          addScore({
            id: scoreId(), toolId: tool.id, criterionId: critId,
            score: Math.max(nMin, Math.min(nMax, rescaled)),
            timestamp: Date.now(), user: 'anonymous',
          });
        }
      }
    } else if (oldScale.kind === 'numeric' && newKind === 'numeric') {
      if (oldScale.min !== nMin || oldScale.max !== nMax) {
        const oldSpan = oldScale.max - oldScale.min;
        const newSpan = nMax - nMin;
        for (const tool of tools) {
          const cellKey = `${tool.id}\0${critId}`;
          const entry = latestByCell.get(cellKey);
          if (entry?.score != null && oldSpan > 0) {
            const normalized = (entry.score - oldScale.min) / oldSpan;
            const rescaled = Math.round(nMin + normalized * newSpan);
            addScore({
              id: scoreId(), toolId: tool.id, criterionId: critId,
              score: Math.max(nMin, Math.min(nMax, rescaled)),
              timestamp: Date.now(), user: 'anonymous',
            });
          }
        }
      }
    }
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelEditingHeader();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveHeader();
    }
  };

  const handleScaleKindChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditHeaderScaleKind(e.target.value);
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
                        onBlur={handleSaveHeader}
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
            {criteria.map((criterion) => {
              const scale = getEffectiveScale(criterion, matrixConfig.defaultScale);
              return (
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
                        aria-label={`Scale type for ${criterion.label}`}
                        className="pugh-header-select"
                        value={editHeaderScaleKind}
                        onChange={handleScaleKindChange}
                      >
                        <option value="numeric">Numeric</option>
                        <option value="binary">Binary (Yes/No)</option>
                        <option value="unbounded">Unbounded</option>
                      </select>
                      {editHeaderScaleKind === 'numeric' && (
                        <>
                        <div className="pugh-scale-params">
                          <label>
                            Min
                            <input
                              type="number"
                              aria-label={`Scale min for ${criterion.label}`}
                              className="pugh-scale-input"
                              value={editHeaderScaleMin}
                              onChange={(e) => setEditHeaderScaleMin(e.target.value)}
                            />
                          </label>
                          <label>
                            Max
                            <input
                              type="number"
                              aria-label={`Scale max for ${criterion.label}`}
                              className="pugh-scale-input"
                              value={editHeaderScaleMax}
                              onChange={(e) => setEditHeaderScaleMax(e.target.value)}
                            />
                          </label>
                          <label>
                            Step
                            <input
                              type="number"
                              aria-label={`Scale step for ${criterion.label}`}
                              className="pugh-scale-input"
                              value={editHeaderScaleStep}
                              onChange={(e) => setEditHeaderScaleStep(e.target.value)}
                              min="0.01"
                              step="any"
                            />
                          </label>
                        </div>
                        {(() => {
                          const min = Number(editHeaderScaleMin);
                          const max = Number(editHeaderScaleMax);
                          const rangeId = min === 1 && max === 10 ? '1-10'
                            : min === -2 && max === 2 ? '-2-2'
                            : null;
                          if (!rangeId) return null;
                          const sets = labelSetsForRange(rangeId);
                          if (sets.length === 0) return null;
                          return (
                            <select
                              aria-label={`Label set for ${criterion.label}`}
                              className="pugh-header-select"
                              value={editHeaderLabelSetId}
                              onChange={(e) => setEditHeaderLabelSetId(e.target.value)}
                            >
                              {sets.map((ls) => (
                                <option key={ls.id} value={ls.id}>{ls.name}</option>
                              ))}
                            </select>
                          );
                        })()}
                        </>
                      )}
                      <div className="pugh-edit-actions">
                        <button type="button" onClick={handleSaveHeader}>Save</button>
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
                  const critScores = allScoresByCriterion[criterion.id] ?? [];

                  // Display value
                  let displayValue: string | undefined;
                  let displaySub: string | undefined;
                  if (hasScore) {
                    displayValue = displayScoreValue(score, scale);
                    if (showLabels && scale.kind === 'unbounded') {
                      const sum = critScores.reduce((a, b) => a + b, 0);
                      displaySub = sum > 0 ? `${Math.round((score / sum) * 100)}%` : '0%';
                    } else if (showLabels) {
                      const label = getScoreLabel(score, scale, entry?.label);
                      if (label) displaySub = label;
                    }
                  }

                  // Color
                  let colors: { bg: string; text: string };
                  if (hasScore) {
                    const normalized = normalizeScore(score, scale, critScores, matrixConfig.allowNegative);
                    const gradientIdx = getScoreColor(normalized, matrixConfig.allowNegative);
                    colors = pickColor(gradientIdx, isDark);
                  } else {
                    colors = { bg: 'transparent', text: 'inherit' };
                  }

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
                          {scale.kind === 'binary' ? (
                            <label className="pugh-binary-toggle">
                              <input
                                type="checkbox"
                                aria-label={`Score for ${tool.label}, ${criterion.label}`}
                                checked={editScore === '1'}
                                onChange={(e) => setEditScore(e.target.checked ? '1' : '0')}
                                onKeyDown={handleEditKeyDown}
                                autoFocus
                              />
                              {editScore === '1' ? 'Yes' : 'No'}
                            </label>
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder={
                                scale.kind === 'unbounded'
                                  ? 'Count (e.g. 228000)'
                                  : `Score ${scale.min} to ${scale.max}${scale.step !== 1 ? ` (step ${scale.step})` : ''}`
                              }
                              aria-label={`Score for ${tool.label}, ${criterion.label}`}
                              value={editScore}
                              onChange={(e) => handleEditScoreChange(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="pugh-edit-input"
                              autoFocus
                            />
                          )}
                          {scale.kind === 'numeric' && (
                            <input
                              type="text"
                              placeholder={
                                scale.labels && editScore && scale.labels[Number(editScore)]
                                  ? `Label (default: ${scale.labels[Number(editScore)]})`
                                  : 'Label (optional)'
                              }
                              aria-label={`Label for ${tool.label}, ${criterion.label}`}
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="pugh-edit-input"
                            />
                          )}
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
                                  <span className="pugh-score-number">{displayValue}</span>
                                  {displaySub ? (
                                    <span className="pugh-score-label">{displaySub}</span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="pugh-score-label">💬</span>
                              )}
                            </span>
                          </HoverCard.Trigger>
                          <HoverCard.Content size="1" maxWidth="280px">
                            {history.map((h) => {
                              const hDisplay = h.score != null ? displayScoreValue(h.score, scale) : undefined;
                              const hLabel = h.score != null ? getScoreLabel(h.score, scale, h.label) : undefined;
                              return (
                              <div key={h.id} className="pugh-history-entry">
                                {h.score != null ? (
                                  <div className="pugh-history-score">
                                    {hDisplay}{hLabel ? ` — ${hLabel}` : ''}
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
              );
            })}
            {showTotals && (
              <Table.Row className="pugh-total-row">
                <Table.RowHeaderCell className="pugh-total-label">Weighted Total</Table.RowHeaderCell>
                {showWeights && <Table.Cell className="pugh-weight-cell" />}
                {tools.map((tool) => {
                  const total = weightedTotals[tool.id];
                  const colors = maxTotal > 0
                    ? pickColor(Math.round((total / maxTotal) * 9), isDark)
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
            <button
              className="pugh-toggle-button"
              onClick={toggleLabels}
              type="button"
            >
              {showLabels ? 'Hide Labels' : 'Show Labels'}
            </button>
          </>
        )}
      </div>
    </Theme>
  );
}
