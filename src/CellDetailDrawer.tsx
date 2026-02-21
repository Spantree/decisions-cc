import { useState } from 'react';
import { Dialog } from '@radix-ui/themes';
import type { RatingEntry, ScaleType } from './types';
import { getEffectiveScale, resolveScoreLabel, formatCount } from './types';
import { usePughStore } from './store/usePughStore';
import { ratingId } from './ids';

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

function getScoreLabel(score: number, scale: ScaleType, entryLabel?: string): string | undefined {
  if (entryLabel) return entryLabel;
  if (scale.kind === 'numeric' && scale.labels) return resolveScoreLabel(score, scale.labels);
  return undefined;
}

export interface CellDetailDrawerProps {
  isDark: boolean;
  readOnly: boolean;
}

export default function CellDetailDrawer({ isDark: _isDark, readOnly }: CellDetailDrawerProps) {
  const drawerCell = usePughStore((s) => s.drawerCell);
  const closeDrawer = usePughStore((s) => s.closeDrawer);
  const criteria = usePughStore((s) => s.criteria);
  const options = usePughStore((s) => s.options);
  const ratings = usePughStore((s) => s.ratings);
  const matrixConfig = usePughStore((s) => s.matrixConfig);
  const editScore = usePughStore((s) => s.editScore);
  const editLabel = usePughStore((s) => s.editLabel);
  const editComment = usePughStore((s) => s.editComment);
  const setEditScore = usePughStore((s) => s.setEditScore);
  const setEditLabel = usePughStore((s) => s.setEditLabel);
  const setEditComment = usePughStore((s) => s.setEditComment);
  const addRating = usePughStore((s) => s.addRating);
  const addComment = usePughStore((s) => s.addComment);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  if (!drawerCell) return null;

  const { optionId, criterionId } = drawerCell;
  const criterion = criteria.find((c) => c.id === criterionId);
  const option = options.find((o) => o.id === optionId);
  if (!criterion || !option) return null;

  const scale = getEffectiveScale(criterion, matrixConfig.defaultScale);

  // Cell history — newest first
  const cellHistory = ratings
    .filter((r) => r.optionId === optionId && r.criterionId === criterionId)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Separate top-level entries and replies
  const topLevel = cellHistory.filter((r) => !r.parentCommentId);
  const repliesByParent = new Map<string, RatingEntry[]>();
  for (const r of cellHistory) {
    if (r.parentCommentId) {
      const arr = repliesByParent.get(r.parentCommentId) ?? [];
      arr.push(r);
      repliesByParent.set(r.parentCommentId, arr);
    }
  }

  const handleScoreChange = (value: string) => {
    if (value === '' || value === '-') {
      setEditScore(value);
      return;
    }
    if (scale.kind === 'binary') {
      if (value === '0' || value === '1') setEditScore(value);
      return;
    }
    const num = Number(value);
    if (!isNaN(num)) {
      if (scale.kind === 'unbounded') {
        if (num >= 0) setEditScore(value);
      } else {
        if (num >= scale.min && num <= scale.max) setEditScore(value);
      }
    }
  };

  const handleSave = () => {
    const scoreNum = editScore && editScore !== '-' ? Number(editScore) : undefined;
    if (scoreNum != null) {
      if (scale.kind === 'unbounded') {
        if (isNaN(scoreNum) || scoreNum < 0) return;
      } else if (scale.kind === 'numeric') {
        if (isNaN(scoreNum) || scoreNum < scale.min || scoreNum > scale.max) return;
      } else if (scale.kind === 'binary') {
        if (scoreNum !== 0 && scoreNum !== 1) return;
      }
    }
    const trimmedLabel = editLabel.trim() || undefined;
    const trimmedComment = editComment.trim() || undefined;
    if (scoreNum == null && !trimmedComment) return;

    addRating({
      id: ratingId(),
      optionId,
      criterionId,
      value: scoreNum,
      label: trimmedLabel,
      comment: trimmedComment,
      timestamp: Date.now(),
      user: 'anonymous',
    });
  };

  const handleReply = (parentId: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    addComment(optionId, criterionId, trimmed, parentId);
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <Dialog.Root open={!!drawerCell} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
      <Dialog.Content className="pugh-cell-detail-drawer">
        <Dialog.Title>
          {criterion.label} / {option.label}
        </Dialog.Title>

        {/* Edit form */}
        {!readOnly && (
          <div className="pugh-drawer-section">
            <div className="pugh-drawer-section-label">Rating</div>
            {scale.kind === 'binary' ? (
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
                  scale.kind === 'unbounded'
                    ? 'Count (optional, e.g. 228000)'
                    : `Score ${scale.min} to ${scale.max}${scale.step !== 1 ? ` (step ${scale.step})` : ''} (optional)`
                }
                aria-label="Score"
                value={editScore}
                onChange={(e) => handleScoreChange(e.target.value)}
                className="pugh-drawer-input"
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
                aria-label="Label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="pugh-drawer-input"
              />
            )}
            <textarea
              placeholder="Comment (optional)"
              aria-label="Comment"
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              className="pugh-drawer-textarea"
              rows={2}
            />
            <div className="pugh-drawer-actions">
              <button type="button" className="pugh-drawer-btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        )}

        {/* History timeline */}
        <div className="pugh-drawer-section">
          <div className="pugh-drawer-section-label">History</div>
          {topLevel.length === 0 ? (
            <div className="pugh-drawer-empty">No ratings or comments yet.</div>
          ) : (
            <div className="pugh-drawer-timeline">
              {topLevel.map((entry) => {
                const hDisplay = entry.value != null ? displayScoreValue(entry.value, scale) : undefined;
                const hLabel = entry.value != null ? getScoreLabel(entry.value, scale, entry.label) : undefined;
                const replies = repliesByParent.get(entry.id) ?? [];
                const isComment = entry.value == null && entry.comment;

                return (
                  <div key={entry.id} className="pugh-drawer-entry">
                    {entry.value != null && (
                      <div className="pugh-drawer-entry-score">
                        {hDisplay}{hLabel ? ` \u2014 ${hLabel}` : ''}
                      </div>
                    )}
                    {entry.comment && (
                      <div className="pugh-drawer-entry-comment">
                        &ldquo;{entry.comment}&rdquo;
                      </div>
                    )}
                    <div className="pugh-drawer-entry-meta">
                      {entry.user} &middot; {formatDate(entry.timestamp)}
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="pugh-drawer-replies">
                        {replies.map((reply) => (
                          <div key={reply.id} className="pugh-drawer-reply">
                            <div className="pugh-drawer-entry-comment">
                              &ldquo;{reply.comment}&rdquo;
                            </div>
                            <div className="pugh-drawer-entry-meta">
                              {reply.user} &middot; {formatDate(reply.timestamp)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply button for comment entries */}
                    {!readOnly && isComment && (
                      <>
                        {replyingTo === entry.id ? (
                          <div className="pugh-drawer-reply-form">
                            <textarea
                              placeholder="Write a reply..."
                              aria-label="Reply to comment"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="pugh-drawer-textarea"
                              rows={2}
                              autoFocus
                            />
                            <div className="pugh-drawer-actions">
                              <button
                                type="button"
                                className="pugh-drawer-btn-primary"
                                disabled={!replyText.trim()}
                                onClick={() => handleReply(entry.id)}
                              >
                                Reply
                              </button>
                              <button
                                type="button"
                                className="pugh-drawer-btn-secondary"
                                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="pugh-drawer-btn-link"
                            onClick={() => setReplyingTo(entry.id)}
                          >
                            Reply
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
