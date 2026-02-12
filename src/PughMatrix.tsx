import { useState, useMemo, useContext } from 'react';
import { HoverCard, Table, Theme } from '@radix-ui/themes';
import type { ScoreEntry } from './types';
import { PughStoreContext } from './store/usePughStore';
import { usePughStore } from './store/usePughStore';
import './pugh-matrix.css';

/* ------------------------------------------------------------------ */
/*  Props types                                                       */
/* ------------------------------------------------------------------ */

export interface PughMatrixControlledProps {
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

export interface PughMatrixStoreProps {
  criteria?: undefined;
  tools?: undefined;
  scores?: undefined;
  highlight?: string;
  showWinner?: boolean;
  isDark?: boolean;
}

export type PughMatrixProps = PughMatrixControlledProps | PughMatrixStoreProps;

/* ------------------------------------------------------------------ */
/*  Helpers (shared)                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Internal view props                                               */
/* ------------------------------------------------------------------ */

interface PughMatrixViewProps {
  criteria: string[];
  tools: string[];
  scores: ScoreEntry[];
  weights: Record<string, number>;
  showTotals: boolean;
  editingCell: { tool: string; criterion: string } | null;
  editScore: string;
  editLabel: string;
  editComment: string;
  highlight?: string;
  showWinner?: boolean;
  isDark?: boolean;
  onWeightChange: (criterion: string, value: string) => void;
  onCellClick: (tool: string, criterion: string) => void;
  onEditScoreChange: (value: string) => void;
  onEditLabelChange: (value: string) => void;
  onEditCommentChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onToggleTotals: () => void;
  canEdit: boolean;
}

/* ------------------------------------------------------------------ */
/*  PughMatrixView — pure rendering component                         */
/* ------------------------------------------------------------------ */

function PughMatrixView({
  criteria,
  tools,
  scores,
  weights,
  showTotals,
  editingCell,
  editScore,
  editLabel,
  editComment,
  highlight,
  showWinner = false,
  isDark = false,
  onWeightChange,
  onCellClick,
  onEditScoreChange,
  onEditLabelChange,
  onEditCommentChange,
  onEditSave,
  onEditCancel,
  onToggleTotals,
  canEdit,
}: PughMatrixViewProps) {
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

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEditCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEditSave();
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
              <Table.ColumnHeaderCell justify="start">Criterion</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell width="72px">Weight</Table.ColumnHeaderCell>
              {tools.map((tool) => (
                <Table.ColumnHeaderCell
                  key={tool}
                  className={`pugh-tool-header${isWinner(tool) ? ' pugh-winner-header' : isHighlighted(tool) ? ' pugh-highlight-header' : ''}`}
                >
                  {isWinner(tool) ? `👑 ${tool}` : tool}
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {criteria.map((criterion) => (
              <Table.Row key={criterion}>
                <Table.RowHeaderCell className="pugh-criterion-cell">{criterion}</Table.RowHeaderCell>
                <Table.Cell className="pugh-weight-cell">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label={`Weight for ${criterion}`}
                    value={weights[criterion]}
                    onChange={(e) => onWeightChange(criterion, e.target.value)}
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
                      className={`pugh-score-cell${canEdit ? ' pugh-score-cell-editable' : ''}${isWinner(tool) ? ' pugh-winner-cell' : isHighlighted(tool) ? ' pugh-highlight-cell' : ''}`}
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}
                      onClick={() => onCellClick(tool, criterion)}
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
                            onChange={(e) => onEditScoreChange(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="pugh-edit-input"
                            autoFocus
                          />
                          <input
                            type="text"
                            placeholder="Label"
                            aria-label={`Label for ${tool}, ${criterion}`}
                            value={editLabel}
                            onChange={(e) => onEditLabelChange(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="pugh-edit-input"
                            maxLength={30}
                          />
                          <textarea
                            placeholder="Comment (optional)"
                            aria-label={`Comment for ${tool}, ${criterion}`}
                            value={editComment}
                            onChange={(e) => onEditCommentChange(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="pugh-edit-comment"
                            rows={2}
                          />
                          <div className="pugh-edit-actions">
                            <button type="button" onClick={onEditSave}>
                              Save
                            </button>
                            <button type="button" onClick={onEditCancel}>
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
                <Table.RowHeaderCell className="pugh-total-label">Weighted Total</Table.RowHeaderCell>
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
          onClick={onToggleTotals}
          type="button"
        >
          {showTotals ? 'Hide Totals' : 'Show Totals'}
        </button>
      </div>
    </Theme>
  );
}

/* ------------------------------------------------------------------ */
/*  Controlled mode wrapper (backward-compatible)                     */
/* ------------------------------------------------------------------ */

function PughMatrixControlled({
  criteria,
  tools,
  scores,
  highlight,
  showWinner = false,
  isDark = false,
  onScoreAdd,
}: PughMatrixControlledProps) {
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

  return (
    <PughMatrixView
      criteria={criteria}
      tools={tools}
      scores={scores}
      weights={weights}
      showTotals={showTotals}
      editingCell={editingCell}
      editScore={editScore}
      editLabel={editLabel}
      editComment={editComment}
      highlight={highlight}
      showWinner={showWinner}
      isDark={isDark}
      onWeightChange={handleWeightChange}
      onCellClick={handleCellClick}
      onEditScoreChange={handleEditScoreChange}
      onEditLabelChange={(v) => setEditLabel(v)}
      onEditCommentChange={(v) => setEditComment(v)}
      onEditSave={handleEditSave}
      onEditCancel={handleEditCancel}
      onToggleTotals={() => setShowTotals((prev) => !prev)}
      canEdit={!!onScoreAdd}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Store mode wrapper                                                */
/* ------------------------------------------------------------------ */

function PughMatrixStoreMode({
  highlight,
  showWinner = false,
  isDark = false,
}: PughMatrixStoreProps) {
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
  const setEditScoreAction = usePughStore((s) => s.setEditScore);
  const setEditLabelAction = usePughStore((s) => s.setEditLabel);
  const setEditCommentAction = usePughStore((s) => s.setEditComment);
  const addScore = usePughStore((s) => s.addScore);
  const toggleTotals = usePughStore((s) => s.toggleTotals);

  const handleWeightChange = (criterion: string, value: string) => {
    if (value === '') {
      setWeight(criterion, 0);
      return;
    }
    const num = Math.round(Number(value));
    if (!isNaN(num) && num >= 0 && num <= 10) {
      setWeight(criterion, num);
    }
  };

  const handleCellClick = (tool: string, criterion: string) => {
    startEditing(tool, criterion);
  };

  const handleEditScoreChange = (value: string) => {
    if (value === '') {
      setEditScoreAction('');
      return;
    }
    const num = Math.round(Number(value));
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setEditScoreAction(String(num));
    }
  };

  const handleEditSave = () => {
    if (!editingCell) return;
    const scoreNum = Number(editScore);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) return;
    if (!editLabel.trim()) return;
    addScore({
      id: `store-${Date.now()}`,
      tool: editingCell.tool,
      criterion: editingCell.criterion,
      score: scoreNum,
      label: editLabel.trim(),
      comment: editComment.trim() || undefined,
      timestamp: Date.now(),
    });
    cancelEditing();
  };

  return (
    <PughMatrixView
      criteria={criteria}
      tools={tools}
      scores={scores}
      weights={weights}
      showTotals={showTotals}
      editingCell={editingCell}
      editScore={editScore}
      editLabel={editLabel}
      editComment={editComment}
      highlight={highlight}
      showWinner={showWinner}
      isDark={isDark}
      onWeightChange={handleWeightChange}
      onCellClick={handleCellClick}
      onEditScoreChange={handleEditScoreChange}
      onEditLabelChange={setEditLabelAction}
      onEditCommentChange={setEditCommentAction}
      onEditSave={handleEditSave}
      onEditCancel={cancelEditing}
      onToggleTotals={toggleTotals}
      canEdit={true}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Public component — auto-selects mode                              */
/* ------------------------------------------------------------------ */

function isControlledProps(props: PughMatrixProps): props is PughMatrixControlledProps {
  return 'criteria' in props && props.criteria !== undefined;
}

export default function PughMatrix(props: PughMatrixProps) {
  const storeCtx = useContext(PughStoreContext);

  if (isControlledProps(props)) {
    return <PughMatrixControlled {...props} />;
  }

  if (storeCtx) {
    return <PughMatrixStoreMode {...props} />;
  }

  throw new Error(
    'PughMatrix: either pass criteria/tools/scores props (controlled mode) ' +
    'or wrap in a <PughStoreProvider> (store mode).',
  );
}
