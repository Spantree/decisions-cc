import { useState, useRef, useEffect } from 'react';
import { usePughStore } from './store/usePughStore';
import type { PughEvent } from './events/types';

function describeEvent(event: PughEvent): string {
  switch (event.type) {
    case 'CriterionAdded':
      return `Added criterion "${event.label}"`;
    case 'CriterionRenamed':
      return `Renamed criterion to "${event.newLabel}"`;
    case 'CriterionRemoved':
      return `Removed criterion`;
    case 'ToolAdded':
      return `Added tool "${event.label}"`;
    case 'ToolRenamed':
      return `Renamed tool to "${event.newLabel}"`;
    case 'ToolRemoved':
      return `Removed tool`;
    case 'ScoreSet':
      return event.label ? `Set score: ${event.label}` : event.score != null ? `Set score: ${event.score}` : 'Set score';
    case 'WeightSet':
      return `Set weight to ${event.weight}`;
  }
}

export interface BranchSelectorProps {
  isDark?: boolean;
}

export function BranchSelector({ isDark }: BranchSelectorProps) {
  const branchNames = usePughStore((s) => s.branchNames);
  const activeBranch = usePughStore((s) => s.activeBranch);
  const commitLog = usePughStore((s) => s.commitLog);
  const createBranch = usePughStore((s) => s.createBranch);
  const switchBranch = usePughStore((s) => s.switchBranch);
  const renameBranch = usePughStore((s) => s.renameBranch);
  const deleteBranch = usePughStore((s) => s.deleteBranch);
  const comparingBranch = usePughStore((s) => s.comparingBranch);
  const branchDiff = usePughStore((s) => s.branchDiff);
  const compareBranch = usePughStore((s) => s.compareBranch);
  const cancelCompare = usePughStore((s) => s.cancelCompare);
  const mergeBranch = usePughStore((s) => s.mergeBranch);

  const [isOpen, setIsOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen && !branchDiff) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingBranch(null);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, branchDiff]);

  const handleSwitchBranch = (branchName: string) => {
    switchBranch(branchName);
    setIsOpen(false);
  };

  const startRename = (branchName: string) => {
    setEditingBranch(branchName);
    setEditName(branchName);
  };

  const commitRename = () => {
    if (editingBranch && editName.trim() && editName.trim() !== editingBranch) {
      renameBranch(editingBranch, editName.trim());
    }
    setEditingBranch(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitRename();
    } else if (e.key === 'Escape') {
      setEditingBranch(null);
    }
  };

  const handleCreate = () => {
    const name = newBranchName.trim();
    if (name) {
      createBranch(name);
      setNewBranchName('');
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewBranchName('');
    }
  };

  return (
    <div
      ref={barRef}
      className={`pugh-branch-bar${isDark ? ' pugh-dark' : ''}`}
    >
      <button
        type="button"
        className="pugh-branch-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeBranch}
        <span className="pugh-branch-item-badge">
          {commitLog.length}
        </span>
        <span className="pugh-branch-trigger-arrow">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen && (
        <div className="pugh-branch-dropdown">
          {branchNames.map((name) => (
            <div
              key={name}
              className={`pugh-branch-item${name === activeBranch ? ' pugh-branch-item-active' : ''}`}
              onClick={() => {
                if (editingBranch !== name) {
                  handleSwitchBranch(name);
                }
              }}
            >
              {editingBranch === name ? (
                <input
                  className="pugh-branch-edit-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={commitRename}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span className="pugh-branch-item-name">
                  {name}
                </span>
              )}
              {name !== activeBranch && (
                <button
                  type="button"
                  className="pugh-branch-compare-button"
                  title={`Compare ${name} with ${activeBranch}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    compareBranch(name);
                    setIsOpen(false);
                  }}
                >
                  &#128269;
                </button>
              )}
              {name !== 'main' && (
                <button
                  type="button"
                  className="pugh-branch-rename-button"
                  title="Rename branch"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(name);
                  }}
                >
                  &#9998;
                </button>
              )}
              {name !== 'main' && (
                <button
                  type="button"
                  className="pugh-branch-delete-button"
                  title="Delete branch"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBranch(name);
                  }}
                >
                  &#10005;
                </button>
              )}
            </div>
          ))}

          {isCreating ? (
            <div className="pugh-branch-new-input-row">
              <input
                className="pugh-branch-edit-input"
                placeholder="Branch name…"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                autoFocus
              />
              <button
                type="button"
                className="pugh-branch-create-button"
                onClick={handleCreate}
              >
                Create
              </button>
            </div>
          ) : (
            <div className="pugh-branch-new-row">
              <button
                type="button"
                className="pugh-branch-new-button"
                onClick={() => setIsCreating(true)}
              >
                + New Branch
              </button>
            </div>
          )}
        </div>
      )}

      {branchDiff && comparingBranch && (
        <div className="pugh-branch-diff-panel">
          <div className="pugh-branch-diff-header">
            Comparing <code>{comparingBranch}</code> with <code>{activeBranch}</code>
          </div>
          <div className="pugh-branch-diff-columns">
            <div className="pugh-branch-diff-column">
              <strong>{comparingBranch}</strong>
              {branchDiff.sourceEvents.length === 0 ? (
                <div className="pugh-branch-diff-empty">No unique changes</div>
              ) : (
                branchDiff.sourceEvents.map((evt) => (
                  <div key={evt.id} className="pugh-branch-diff-event">
                    {describeEvent(evt)}
                  </div>
                ))
              )}
            </div>
            <div className="pugh-branch-diff-column">
              <strong>{activeBranch}</strong>
              {branchDiff.targetEvents.length === 0 ? (
                <div className="pugh-branch-diff-empty">No unique changes</div>
              ) : (
                branchDiff.targetEvents.map((evt) => (
                  <div key={evt.id} className="pugh-branch-diff-event">
                    {describeEvent(evt)}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="pugh-branch-diff-actions">
            <button
              type="button"
              className="pugh-branch-merge-button"
              onClick={() => mergeBranch(comparingBranch)}
            >
              Merge into {activeBranch}
            </button>
            <button
              type="button"
              className="pugh-branch-close-button"
              onClick={cancelCompare}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
