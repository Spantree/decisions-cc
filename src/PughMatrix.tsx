import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Dialog, HoverCard, Table, Theme } from '@radix-ui/themes';
import {
  red, tomato, amber, yellow, lime, grass, green,
  greenDark,
} from '@radix-ui/colors';
import type { RatingEntry, ScaleType } from './types';
import { getEffectiveScale, normalizeScore, getScoreColor, formatCount, labelSetsForRange, resolveScoreLabel, CUSTOM_LABEL_SET_ID } from './types';
import Markdown from './Markdown';
import { usePughStore } from './store/usePughStore';
import { ratingId, optionId, criterionId } from './ids';
const PughRadarChart = lazy(() => import('./PughRadarChart'));
import './pugh-matrix.css';

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return mobile;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/[*_~`#>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^-\s+/gm, '')
    .trim();
}

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

function cellFillStyle(
  hasScore: boolean,
  gradientIndex: number,
  isDark: boolean,
  editable: boolean,
): React.CSSProperties {
  if (hasScore) {
    const { bg, text } = pickColor(gradientIndex, isDark);
    return { backgroundColor: bg, color: text };
  }
  if (editable) {
    return {
      backgroundColor: isDark ? '#3a3a44' : '#d9d9e0',
      color: 'inherit',
      border: `1px dashed ${isDark ? '#56565e' : '#b0b0b8'}`,
    };
  }
  return {};
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

/** Returns the label for a score, checking per-entry override first, then scale defaults (round-down). */
function getScoreLabel(score: number, scale: ScaleType, entryLabel?: string): string | undefined {
  if (entryLabel) return entryLabel;
  if (scale.kind === 'numeric' && scale.labels) return resolveScoreLabel(score, scale.labels);
  return undefined;
}

export default function PughMatrix({
  highlight,
  showWinner = false,
  isDark = false,
  readOnly = false,
}: PughMatrixProps) {
  const criteria = usePughStore((s) => s.criteria);
  const options = usePughStore((s) => s.options);
  const ratings = usePughStore((s) => s.ratings);
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
  const addRating = usePughStore((s) => s.addRating);
  const toggleTotals = usePughStore((s) => s.toggleTotals);
  const toggleWeights = usePughStore((s) => s.toggleWeights);
  const toggleLabels = usePughStore((s) => s.toggleLabels);
  const addOption = usePughStore((s) => s.addOption);
  const removeOption = usePughStore((s) => s.removeOption);
  const addCriterion = usePughStore((s) => s.addCriterion);
  const removeCriterion = usePughStore((s) => s.removeCriterion);
  const view = usePughStore((s) => s.view);
  const toggleView = usePughStore((s) => s.toggleView);
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
  const customLabelDrawerOpen = usePughStore((s) => s.customLabelDrawerOpen);
  const editCustomLabels = usePughStore((s) => s.editCustomLabels);
  const setCustomLabelDrawerOpen = usePughStore((s) => s.setCustomLabelDrawerOpen);
  const setEditCustomLabel = usePughStore((s) => s.setEditCustomLabel);
  const applyCustomLabels = usePughStore((s) => s.applyCustomLabels);
  const editHeaderDescription = usePughStore((s) => s.editHeaderDescription);
  const setEditHeaderDescription = usePughStore((s) => s.setEditHeaderDescription);
  const detailModalOpen = usePughStore((s) => s.detailModalOpen);
  const openDetailModal = usePughStore((s) => s.openDetailModal);
  const closeDetailModal = usePughStore((s) => s.closeDetailModal);
  const saveAndNavigate = usePughStore((s) => s.saveAndNavigate);
  const startEditingWithPreFill = usePughStore((s) => s.startEditingWithPreFill);

  const isMobile = useIsMobile();
  const effectiveReadOnly = readOnly || isMobile;

  const { latestByCell, historyByCell, weightedTotals, maxTotal, winner, allScoresByCriterion } =
    useMemo(() => {
      const optionSet = new Set(options.map((t) => t.id));
      const criterionSet = new Set(criteria.map((c) => c.id));
      const history = new Map<string, RatingEntry[]>();
      const latest = new Map<string, RatingEntry>();

      for (const entry of ratings) {
        if (!optionSet.has(entry.optionId) || !criterionSet.has(entry.criterionId)) {
          continue; // skip orphaned ratings (e.g. stale data)
        }
        const key = `${entry.optionId}\0${entry.criterionId}`;
        const arr = history.get(key) ?? [];
        arr.push(entry);
        history.set(key, arr);
        if (entry.value != null) {
          const prev = latest.get(key);
          if (!prev || entry.timestamp > prev.timestamp) {
            latest.set(key, entry);
          }
        }
      }

      for (const [key, arr] of history.entries()) {
        history.set(key, [...arr].sort((a, b) => b.timestamp - a.timestamp));
      }

      // Collect all scores per criterion (for unbounded normalization)
      const allByCrit: Record<string, number[]> = {};
      for (const criterion of criteria) {
        const critScores: number[] = [];
        for (const option of options) {
          const key = `${option.id}\0${criterion.id}`;
          const e = latest.get(key);
          if (e?.value != null) critScores.push(e.value);
        }
        allByCrit[criterion.id] = critScores;
      }

      const totals: Record<string, number> = {};
      let max = -Infinity;
      let best = '';
      for (const option of options) {
        let total = 0;
        for (const criterion of criteria) {
          const key = `${option.id}\0${criterion.id}`;
          const entry = latest.get(key);
          const score = entry?.value ?? 0;
          const weight = weights[criterion.id] ?? 10;
          const scale = getEffectiveScale(criterion, matrixConfig.defaultScale);
          const critScores = allByCrit[criterion.id] ?? [];
          const normalized = normalizeScore(score, scale, critScores, matrixConfig.allowNegative);
          total += normalized * weight;
        }
        const rounded = Math.round(total);
        totals[option.id] = rounded;
        if (rounded > max) {
          max = rounded;
          best = option.id;
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
    }, [ratings, options, criteria, weights, showWinner, matrixConfig]);

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
    addRating({
      id: ratingId(),
      optionId: editingCell.optionId,
      criterionId: editingCell.criterionId,
      value: scoreNum,
      label: trimmedLabel,
      comment: trimmedComment,
      timestamp: Date.now(),
      user: 'anonymous',
    });
    cancelEditing();
  };

  const handleQuickEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelEditing();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveAndNavigate(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      openDetailModal();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      saveAndNavigate('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      saveAndNavigate('up');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      saveAndNavigate('right');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      saveAndNavigate('left');
    }
  };

  const handleSaveHeader = () => {
    if (!editingHeader) return;

    // For option headers, just save the rename
    if (editingHeader.type === 'option') {
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
      for (const option of options) {
        const cellKey = `${option.id}\0${critId}`;
        const entry = latestByCell.get(cellKey);
        if (entry?.value != null) {
          addRating({
            id: ratingId(), optionId: option.id, criterionId: critId,
            value: entry.value > midpoint ? 1 : 0,
            timestamp: Date.now(), user: 'anonymous',
          });
        }
      }
    } else if (oldScale.kind === 'binary' && newKind === 'numeric') {
      for (const option of options) {
        const cellKey = `${option.id}\0${critId}`;
        const entry = latestByCell.get(cellKey);
        if (entry?.value != null) {
          addRating({
            id: ratingId(), optionId: option.id, criterionId: critId,
            value: entry.value ? nMax : nMin,
            timestamp: Date.now(), user: 'anonymous',
          });
        }
      }
    } else if (oldScale.kind === 'unbounded' && newKind === 'numeric') {
      const allScores = allScoresByCriterion[critId] ?? [];
      const maxInCrit = Math.max(0, ...allScores);
      const span = nMax - nMin;
      for (const option of options) {
        const cellKey = `${option.id}\0${critId}`;
        const entry = latestByCell.get(cellKey);
        if (entry?.value != null && maxInCrit > 0) {
          const normalized = entry.value / maxInCrit;
          const rescaled = Math.round(nMin + normalized * span);
          addRating({
            id: ratingId(), optionId: option.id, criterionId: critId,
            value: Math.max(nMin, Math.min(nMax, rescaled)),
            timestamp: Date.now(), user: 'anonymous',
          });
        }
      }
    } else if (oldScale.kind === 'numeric' && newKind === 'numeric') {
      if (oldScale.min !== nMin || oldScale.max !== nMax) {
        const oldSpan = oldScale.max - oldScale.min;
        const newSpan = nMax - nMin;
        for (const option of options) {
          const cellKey = `${option.id}\0${critId}`;
          const entry = latestByCell.get(cellKey);
          if (entry?.value != null && oldSpan > 0) {
            const normalized = (entry.value - oldScale.min) / oldSpan;
            const rescaled = Math.round(nMin + normalized * newSpan);
            addRating({
              id: ratingId(), optionId: option.id, criterionId: critId,
              value: Math.max(nMin, Math.min(nMax, rescaled)),
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

  const handleAddOption = () => {
    const label = 'New Option';
    const id = optionId();
    addOption(id, label, 'anonymous');
    startEditingHeader('option', id);
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
    if (type === 'option') {
      removeOption(id);
    } else {
      removeCriterion(id);
    }
    cancelEditingHeader();
  };

  const isHighlighted = (optId: string) => highlight && optId === highlight;
  const isWinner = (optId: string) => winner && optId === winner;
  const isEditing = (optId: string, critId: string) =>
    editingCell?.optionId === optId && editingCell?.criterionId === critId;
  const isEditingHeaderCell = (type: 'option' | 'criterion', id: string) =>
    editingHeader?.type === type && editingHeader?.id === id;

  return (
    <Theme appearance={isDark ? 'dark' : 'light'} accentColor="green" hasBackground={false}>
      <div className={`pugh-container${isDark ? ' pugh-dark' : ''}`}>
        {view === 'chart' ? (
          <Suspense fallback={null}>
            <PughRadarChart isDark={isDark} />
          </Suspense>
        ) : (
        <Table.Root variant="surface" size="2">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell justify="start">Criterion</Table.ColumnHeaderCell>
              {showWeights && <Table.ColumnHeaderCell width="72px">Weight</Table.ColumnHeaderCell>}
              {options.map((option) => (
                <Table.ColumnHeaderCell
                  key={option.id}
                  className={`pugh-option-header${!effectiveReadOnly ? ' pugh-header-editable' : ''}${isWinner(option.id) ? ' pugh-winner-header' : isHighlighted(option.id) ? ' pugh-highlight-header' : ''}`}
                  onClick={effectiveReadOnly ? undefined : () => startEditingHeader('option', option.id)}
                >
                  {isEditingHeaderCell('option', option.id) ? (
                    <div className="pugh-header-edit-col" onClick={(e) => e.stopPropagation()}>
                      <div className="pugh-header-edit-row">
                        <input
                          type="text"
                          aria-label={`Rename option ${option.label}`}
                          value={editHeaderValue}
                          onChange={(e) => setEditHeaderValue(e.target.value)}
                          onKeyDown={handleHeaderKeyDown}
                          className="pugh-header-input"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="pugh-header-delete-button"
                          aria-label={`Delete option ${option.label}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleDeleteHeader}
                        >
                          🗑
                        </button>
                      </div>
                      <textarea
                        placeholder="Description (optional, supports markdown)"
                        aria-label={`Description for option ${option.label}`}
                        value={editHeaderDescription}
                        onChange={(e) => setEditHeaderDescription(e.target.value)}
                        className="pugh-description-textarea"
                        rows={2}
                      />
                      <div className="pugh-edit-actions">
                        <button type="button" onClick={handleSaveHeader}>Save</button>
                        <button type="button" onClick={cancelEditingHeader}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <span className="pugh-header-label-col">
                      <span className="pugh-header-label-text">
                        {isWinner(option.id) ? `👑 ${option.label}` : option.label}
                      </span>
                      {option.description && (
                        <HoverCard.Root>
                          <HoverCard.Trigger>
                            <span className="pugh-description-inline" onClick={(e) => e.stopPropagation()}>
                              {stripMarkdown(option.description)}
                            </span>
                          </HoverCard.Trigger>
                          <HoverCard.Content size="2" maxWidth="320px">
                            <Markdown content={option.description} />
                          </HoverCard.Content>
                        </HoverCard.Root>
                      )}
                    </span>
                  )}
                </Table.ColumnHeaderCell>
              ))}
              {!effectiveReadOnly && (
                <Table.ColumnHeaderCell className="pugh-add-cell">
                  <button
                    type="button"
                    className="pugh-add-button"
                    aria-label="Add option"
                    onClick={handleAddOption}
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
                  className={`pugh-criterion-cell${!effectiveReadOnly ? ' pugh-header-editable' : ''}`}
                  onClick={effectiveReadOnly ? undefined : () => startEditingHeader('criterion', criterion.id)}
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
                      <textarea
                        placeholder="Description (optional, supports markdown)"
                        aria-label={`Description for criterion ${criterion.label}`}
                        value={editHeaderDescription}
                        onChange={(e) => setEditHeaderDescription(e.target.value)}
                        className="pugh-description-textarea"
                        rows={2}
                      />
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
                              type="text"
                              inputMode="numeric"
                              aria-label={`Scale min for ${criterion.label}`}
                              className="pugh-scale-input"
                              value={editHeaderScaleMin}
                              onChange={(e) => setEditHeaderScaleMin(e.target.value)}
                            />
                          </label>
                          <label>
                            Max
                            <input
                              type="text"
                              inputMode="numeric"
                              aria-label={`Scale max for ${criterion.label}`}
                              className="pugh-scale-input"
                              value={editHeaderScaleMax}
                              onChange={(e) => setEditHeaderScaleMax(e.target.value)}
                            />
                          </label>
                          <label>
                            Step
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Scale step for ${criterion.label}`}
                              className="pugh-scale-input"
                              value={editHeaderScaleStep}
                              onChange={(e) => setEditHeaderScaleStep(e.target.value)}
                            />
                          </label>
                        </div>
                        {(() => {
                          const min = Number(editHeaderScaleMin);
                          const max = Number(editHeaderScaleMax);
                          const rangeId = min === 1 && max === 10 ? '1-10'
                            : min === -2 && max === 2 ? '-2-2'
                            : null;
                          const sets = rangeId ? labelSetsForRange(rangeId) : [];
                          return (
                            <div className="pugh-labelset-row">
                              <select
                                aria-label={`Label set for ${criterion.label}`}
                                className="pugh-header-select"
                                value={editHeaderLabelSetId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditHeaderLabelSetId(val);
                                  if (val === CUSTOM_LABEL_SET_ID) {
                                    setCustomLabelDrawerOpen(true);
                                  }
                                }}
                              >
                                {sets.map((ls) => (
                                  <option key={ls.id} value={ls.id}>{ls.name}</option>
                                ))}
                                {sets.length === 0 && (
                                  <option value="none">None</option>
                                )}
                                <option value={CUSTOM_LABEL_SET_ID}>Custom...</option>
                              </select>
                              {(() => {
                                const isCustom = editHeaderLabelSetId === CUSTOM_LABEL_SET_ID;
                                const isNone = editHeaderLabelSetId === 'none'
                                  || editHeaderLabelSetId.startsWith('none-');
                                return (
                                  <button
                                    type="button"
                                    className="pugh-custom-edit-button"
                                    disabled={isNone}
                                    onClick={() => setCustomLabelDrawerOpen(true)}
                                  >
                                    {isCustom ? 'Edit…' : 'View…'}
                                  </button>
                                );
                              })()}
                            </div>
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
                    <span className="pugh-header-label-col">
                      <span className="pugh-header-label-text">{criterion.label}</span>
                      {criterion.description && (
                        <HoverCard.Root>
                          <HoverCard.Trigger>
                            <span className="pugh-description-inline" onClick={(e) => e.stopPropagation()}>
                              {stripMarkdown(criterion.description)}
                            </span>
                          </HoverCard.Trigger>
                          <HoverCard.Content size="2" maxWidth="320px">
                            <Markdown content={criterion.description} />
                          </HoverCard.Content>
                        </HoverCard.Root>
                      )}
                    </span>
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
                      readOnly={effectiveReadOnly}
                    />
                  </Table.Cell>
                )}
                {options.map((option) => {
                  const cellKey = `${option.id}\0${criterion.id}`;
                  const entry = latestByCell.get(cellKey);
                  const score = entry?.value;
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

                  const gradientIdx = hasScore
                    ? getScoreColor(normalizeScore(score, scale, critScores, matrixConfig.allowNegative), matrixConfig.allowNegative)
                    : 0;
                  const fillStyle = cellFillStyle(hasScore, gradientIdx, isDark, !effectiveReadOnly);

                  const history = historyByCell.get(cellKey);
                  const editing = isEditing(option.id, criterion.id);

                  return (
                    <Table.Cell
                      key={option.id}
                      className={`pugh-rating-cell${!effectiveReadOnly ? ' pugh-rating-cell-editable' : ''}${isWinner(option.id) ? ' pugh-winner-cell' : isHighlighted(option.id) ? ' pugh-highlight-cell' : ''}`}
                      onClick={effectiveReadOnly ? undefined : () => startEditingWithPreFill(option.id, criterion.id)}
                    >
                      <div className="pugh-rating-fill" style={fillStyle}>
                      {editing ? (
                        <div
                          className="pugh-quick-edit"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="pugh-edit-hint">
                            Enter a rating or comment
                          </span>
                          {scale.kind === 'binary' ? (
                            <label className="pugh-binary-toggle">
                              <input
                                type="checkbox"
                                aria-label={`Rating for ${option.label}, ${criterion.label}`}
                                checked={editScore === '1'}
                                onChange={(e) => setEditScore(e.target.checked ? '1' : '0')}
                                onKeyDown={handleQuickEditKeyDown}
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
                                  : `Rating ${scale.min} to ${scale.max}${scale.step !== 1 ? ` (step ${scale.step})` : ''}`
                              }
                              aria-label={`Rating for ${option.label}, ${criterion.label}`}
                              value={editScore}
                              onChange={(e) => handleEditScoreChange(e.target.value)}
                              onKeyDown={handleQuickEditKeyDown}
                              className="pugh-quick-edit-input"
                              autoFocus
                            />
                          )}
                          <button
                            type="button"
                            className="pugh-expand-button"
                            aria-label="Edit details"
                            onClick={openDetailModal}
                          >
                            &#9998;
                          </button>
                        </div>
                      ) : history && history.length > 0 ? (
                        <HoverCard.Root>
                          <HoverCard.Trigger>
                            <span className="pugh-rating-trigger">
                              {hasScore ? (
                                <>
                                  <span className="pugh-rating-number">{displayValue}</span>
                                  {displaySub ? (
                                    <span className="pugh-rating-label">{displaySub}</span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="pugh-rating-label">💬</span>
                              )}
                            </span>
                          </HoverCard.Trigger>
                          <HoverCard.Content size="1" maxWidth="280px">
                            {history.map((h) => {
                              const hDisplay = h.value != null ? displayScoreValue(h.value, scale) : undefined;
                              const hLabel = h.value != null ? getScoreLabel(h.value, scale, h.label) : undefined;
                              return (
                              <div key={h.id} className="pugh-history-entry">
                                {h.value != null ? (
                                  <div className="pugh-history-rating">
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
                {!effectiveReadOnly && <Table.Cell />}
              </Table.Row>
              );
            })}
            {showTotals && (
              <Table.Row className="pugh-total-row">
                <Table.RowHeaderCell className="pugh-total-label">Weighted Total</Table.RowHeaderCell>
                {showWeights && <Table.Cell className="pugh-weight-cell" />}
                {options.map((option) => {
                  const total = weightedTotals[option.id];
                  const colors = maxTotal > 0
                    ? pickColor(Math.round((total / maxTotal) * 9), isDark)
                    : { bg: 'transparent', text: 'inherit' };
                  return (
                    <Table.Cell
                      key={option.id}
                      className={`pugh-total-cell${isWinner(option.id) ? ' pugh-winner-cell' : isHighlighted(option.id) ? ' pugh-highlight-cell' : ''}`}
                    >
                      <div
                        className="pugh-rating-fill"
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
                {!effectiveReadOnly && <Table.Cell />}
              </Table.Row>
            )}
            {!effectiveReadOnly && (
              <Table.Row>
                <Table.Cell colSpan={options.length + (showWeights ? 3 : 2)} className="pugh-add-cell">
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
        )}
        {!effectiveReadOnly && (
          <>
            <button
              className="pugh-toggle-button"
              onClick={toggleView}
              type="button"
            >
              {view === 'table' ? 'Show Chart' : 'Show Table'}
            </button>
            {view === 'table' && (
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
          </>
        )}
        <Dialog.Root open={customLabelDrawerOpen} onOpenChange={(open) => { if (!open) setCustomLabelDrawerOpen(false); }}>
          <Dialog.Content className="pugh-custom-label-drawer">
            {(() => {
              const isCustom = editHeaderLabelSetId === CUSTOM_LABEL_SET_ID;
              const min = Number(editHeaderScaleMin) || 1;
              const max = Number(editHeaderScaleMax) || 10;
              const step = Number(editHeaderScaleStep) || 1;
              const values: number[] = [];
              for (let v = min; v <= max; v += step) {
                values.push(Math.round(v * 1e6) / 1e6);
              }
              if (values.length > 0 && values[values.length - 1] !== max) {
                values.push(max);
              }
              const isValid = !!(editCustomLabels[min]?.trim() && editCustomLabels[max]?.trim());
              return (
                <>
                  <Dialog.Title>{isCustom ? 'Custom Labels' : 'Label Preview'}</Dialog.Title>
                  <Dialog.Description size="2">
                    {isCustom
                      ? 'Define labels for each rating value. Min and max labels are required. Unlabeled ratings round down to the nearest labeled value.'
                      : 'Unlabeled ratings round down to the nearest labeled value.'}
                  </Dialog.Description>
                  <div className="pugh-custom-label-list">
                    {values.map((v) => {
                      const isEndpoint = v === min || v === max;
                      return (
                        <div key={v} className="pugh-custom-label-row">
                          <span className="pugh-custom-label-value">
                            {v}
                            {isCustom && isEndpoint && <span className="pugh-custom-label-required">*</span>}
                          </span>
                          {isCustom ? (
                            <input
                              type="text"
                              className="pugh-edit-input"
                              aria-label={`Label for rating ${v}`}
                              placeholder={isEndpoint ? 'Required' : 'Optional'}
                              value={editCustomLabels[v] ?? ''}
                              onChange={(e) => setEditCustomLabel(v, e.target.value)}
                            />
                          ) : (
                            <span className="pugh-label-preview">
                              {editCustomLabels[v] || '—'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="pugh-custom-label-actions">
                    {isCustom && (
                      <button
                        type="button"
                        className="pugh-clear-button"
                        disabled={Object.keys(editCustomLabels).length === 0}
                        onClick={() => {
                          for (const v of values) {
                            setEditCustomLabel(v, '');
                          }
                        }}
                      >
                        Clear All
                      </button>
                    )}
                    <div className="pugh-edit-actions">
                      {isCustom ? (
                        <>
                          <button type="button" disabled={!isValid} onClick={applyCustomLabels}>
                            Apply
                          </button>
                          <button type="button" onClick={() => setCustomLabelDrawerOpen(false)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setCustomLabelDrawerOpen(false)}>
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </Dialog.Content>
        </Dialog.Root>
        <Dialog.Root open={detailModalOpen} onOpenChange={(open) => { if (!open) closeDetailModal(); }}>
          <Dialog.Content className="pugh-detail-modal">
            {editingCell && editingCriterion && editingScale && (() => {
              const opt = options.find((o) => o.id === editingCell.optionId);
              return (
                <>
                  <Dialog.Title>
                    Edit Rating: {editingCriterion.label} / {opt?.label ?? ''}
                  </Dialog.Title>
                  <div className="pugh-detail-form">
                    {editingScale.kind === 'binary' ? (
                      <label className="pugh-binary-toggle">
                        <input
                          type="checkbox"
                          aria-label="Score"
                          checked={editScore === '1'}
                          onChange={(e) => setEditScore(e.target.checked ? '1' : '0')}
                        />
                        {editScore === '1' ? 'Yes' : 'No'}
                      </label>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={
                          editingScale.kind === 'unbounded'
                            ? 'Count (e.g. 228000)'
                            : `Score ${editingScale.min} to ${editingScale.max}`
                        }
                        aria-label="Score"
                        value={editScore}
                        onChange={(e) => handleEditScoreChange(e.target.value)}
                        className="pugh-edit-input"
                        autoFocus
                      />
                    )}
                    {editingScale.kind === 'numeric' && (
                      <input
                        type="text"
                        placeholder={
                          editingScale.labels && editScore && editingScale.labels[Number(editScore)]
                            ? `Label (default: ${editingScale.labels[Number(editScore)]})`
                            : 'Label (optional)'
                        }
                        aria-label="Label"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="pugh-edit-input"
                      />
                    )}
                    <textarea
                      placeholder="Comment (optional)"
                      aria-label="Comment"
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      className="pugh-edit-comment"
                      rows={3}
                    />
                    <div className="pugh-edit-actions">
                      <button type="button" onClick={() => { handleEditSave(); closeDetailModal(); }}>
                        Save
                      </button>
                      <button type="button" onClick={closeDetailModal}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </Theme>
  );
}
