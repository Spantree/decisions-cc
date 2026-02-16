import { useState, useRef, useEffect } from 'react';
import { usePughStore } from './store/usePughStore';

export interface BranchSelectorProps {
  isDark?: boolean;
}

export function BranchSelector({ isDark }: BranchSelectorProps) {
  const branches = usePughStore((s) => s.branches);
  const eventsByBranch = usePughStore((s) => s.eventsByBranch);
  const activeBranchId = usePughStore((s) => s.activeBranchId);
  const createBranch = usePughStore((s) => s.createBranch);
  const switchBranch = usePughStore((s) => s.switchBranch);
  const renameBranch = usePughStore((s) => s.renameBranch);
  const deleteBranch = usePughStore((s) => s.deleteBranch);

  const [isOpen, setIsOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingBranchId(null);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  const handleSwitchBranch = (branchId: string) => {
    switchBranch(branchId);
    setIsOpen(false);
  };

  const startRename = (branchId: string, currentName: string) => {
    setEditingBranchId(branchId);
    setEditName(currentName);
  };

  const commitRename = () => {
    if (editingBranchId && editName.trim()) {
      renameBranch(editingBranchId, editName.trim());
    }
    setEditingBranchId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitRename();
    } else if (e.key === 'Escape') {
      setEditingBranchId(null);
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
        {activeBranch?.name ?? 'main'}
        <span className="pugh-branch-item-badge">
          {eventsByBranch[activeBranchId]?.length ?? 0}
        </span>
        <span className="pugh-branch-trigger-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="pugh-branch-dropdown">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`pugh-branch-item${branch.id === activeBranchId ? ' pugh-branch-item-active' : ''}`}
              onClick={() => {
                if (editingBranchId !== branch.id) {
                  handleSwitchBranch(branch.id);
                }
              }}
            >
              {editingBranchId === branch.id ? (
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
                <span
                  className="pugh-branch-item-name"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(branch.id, branch.name);
                  }}
                >
                  {branch.name}
                </span>
              )}
              <span className="pugh-branch-item-badge">
                {eventsByBranch[branch.id]?.length ?? 0}
              </span>
              {branch.id !== 'main' && (
                <button
                  type="button"
                  className="pugh-branch-delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBranch(branch.id);
                  }}
                >
                  ✕
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
    </div>
  );
}
