import { useCallback, useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createSupabaseRepository } from './repository/supabase';
import type { MatrixRepository, Commit, Ref } from './repository/types';
import type { PughEvent } from './events/types';
import { eventId, criterionId, optionId, MAIN_BRANCH_ID } from './ids';
import { projectEvents } from './events/projection';
import { uuidv7 } from 'uuidv7';

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e)
    return String((e as { message: unknown }).message);
  return JSON.stringify(e);
}

const MATRIX_ID_KEY = 'supabase-story-matrix-id';

function getOrCreateMatrixId(): string {
  const stored = localStorage.getItem(MATRIX_ID_KEY);
  if (stored) return stored;
  const id = uuidv7();
  localStorage.setItem(MATRIX_ID_KEY, id);
  return id;
}

// ── Sub-components ─────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        marginBottom: 12,
        background: '#fee',
        border: '1px solid #c66',
        borderRadius: 4,
        color: '#900',
      }}
    >
      {message}
    </div>
  );
}

function CommitLog({ commits }: { commits: Commit[] }) {
  if (commits.length === 0) return <p style={{ color: '#888' }}>No commits yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {commits.map((c) => (
        <div
          key={c.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr auto',
            gap: 8,
            padding: '4px 8px',
            background: '#f8f9fa',
            borderRadius: 4,
            fontSize: 13,
            fontFamily: 'monospace',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#b58900', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.id.slice(0, 16)}
          </span>
          <span>{c.comment ?? '(no message)'}</span>
          <span style={{ color: '#888', whiteSpace: 'nowrap' }}>
            {new Date(c.timestamp).toLocaleTimeString()} &middot; {c.eventIds.length} event
            {c.eventIds.length !== 1 ? 's' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function BranchList({
  refs,
  activeBranch,
  onSwitch,
}: {
  refs: Ref[];
  activeBranch: string;
  onSwitch: (name: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {refs.map((r) => (
        <button
          key={r.name}
          type="button"
          onClick={() => onSwitch(r.name)}
          style={{
            padding: '4px 10px',
            border: r.name === activeBranch ? '2px solid #268bd2' : '1px solid #ccc',
            borderRadius: 12,
            background: r.name === activeBranch ? '#eef6fc' : '#fff',
            fontWeight: r.name === activeBranch ? 600 : 400,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {r.name}
        </button>
      ))}
    </div>
  );
}

// ── Main Story Component ───────────────────────────────────────────

function SupabaseEventStore() {
  const matrixId = useRef(getOrCreateMatrixId()).current;
  const repoRef = useRef<MatrixRepository | null>(null);
  const [activeBranch, setActiveBranch] = useState('main');
  const [refs, setRefs] = useState<Ref[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [projected, setProjected] = useState<ReturnType<typeof projectEvents> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [criterionLabel, setCriterionLabel] = useState('');
  const [optionLabel, setOptionLabel] = useState('');
  const [newBranch, setNewBranch] = useState('');

  function getRepo(): MatrixRepository {
    if (!repoRef.current) {
      repoRef.current = createSupabaseRepository(matrixId);
    }
    return repoRef.current;
  }

  const refresh = useCallback(
    async (branch = activeBranch) => {
      setLoading(true);
      setError(null);
      try {
        const repo = getRepo();
        const allRefs = await repo.refs.listRefs();
        setRefs(allRefs);
        const events = await repo.checkout(branch);
        setProjected(projectEvents(events));
        const log = await repo.log(branch, 20);
        setCommits(log);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeBranch, matrixId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAddCriterion = async () => {
    if (!criterionLabel.trim()) return;
    setError(null);
    try {
      const event: PughEvent = {
        id: eventId(),
        type: 'CriterionAdded',
        criterionId: criterionId(),
        label: criterionLabel.trim(),
        timestamp: Date.now(),
        user: 'storybook',
        branchId: MAIN_BRANCH_ID,
      };
      await getRepo().commit(activeBranch, [event], 'storybook', `Add criterion: ${criterionLabel.trim()}`);
      setCriterionLabel('');
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const handleAddOption = async () => {
    if (!optionLabel.trim()) return;
    setError(null);
    try {
      const event: PughEvent = {
        id: eventId(),
        type: 'OptionAdded',
        optionId: optionId(),
        label: optionLabel.trim(),
        timestamp: Date.now(),
        user: 'storybook',
        branchId: MAIN_BRANCH_ID,
      };
      await getRepo().commit(activeBranch, [event], 'storybook', `Add option: ${optionLabel.trim()}`);
      setOptionLabel('');
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const handleFork = async () => {
    if (!newBranch.trim()) return;
    setError(null);
    try {
      await getRepo().fork(newBranch.trim(), activeBranch);
      setNewBranch('');
      setActiveBranch(newBranch.trim());
      await refresh(newBranch.trim());
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const handleSwitchBranch = async (name: string) => {
    setActiveBranch(name);
    await refresh(name);
  };

  const handleReset = () => {
    localStorage.removeItem(MATRIX_ID_KEY);
    repoRef.current = null;
    const id = getOrCreateMatrixId();
    repoRef.current = createSupabaseRepository(id);
    setActiveBranch('main');
    setCommits([]);
    setProjected(null);
    setRefs([]);
    refresh('main');
  };

  const sectionStyle = {
    marginBottom: 20,
    padding: 16,
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    background: '#fff',
  } as const;

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#666',
    marginBottom: 6,
  };

  const inputStyle = {
    flex: 1,
    padding: '6px 10px',
    fontSize: 14,
    border: '1px solid #ccc',
    borderRadius: 4,
  };

  const btnStyle = {
    padding: '6px 14px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: 4,
    background: '#f8f9fa',
    fontSize: 13,
  };

  const btnPrimary = {
    ...btnStyle,
    background: '#268bd2',
    color: '#fff',
    border: '1px solid #268bd2',
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Supabase Event Store</h2>
          <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
            matrix {matrixId.slice(0, 8)}...
          </span>
        </div>
        <button type="button" onClick={handleReset} style={{ ...btnStyle, color: '#c00', borderColor: '#c00' }}>
          New Matrix
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Branches */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Branches</span>
        {refs.length > 0 ? (
          <BranchList refs={refs} activeBranch={activeBranch} onSwitch={handleSwitchBranch} />
        ) : (
          <p style={{ color: '#888', margin: 0, fontSize: 13 }}>
            No branches yet. Add a criterion or option to create the first commit.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            type="text"
            placeholder="New branch name..."
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFork()}
            style={inputStyle}
          />
          <button type="button" onClick={handleFork} style={btnStyle}>
            Fork
          </button>
        </div>
      </div>

      {/* Add Data */}
      <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <span style={labelStyle}>Add Criterion</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              placeholder="e.g. Cost"
              value={criterionLabel}
              onChange={(e) => setCriterionLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
              style={inputStyle}
            />
            <button type="button" onClick={handleAddCriterion} style={btnPrimary}>
              Add
            </button>
          </div>
        </div>
        <div>
          <span style={labelStyle}>Add Option</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              placeholder="e.g. React"
              value={optionLabel}
              onChange={(e) => setOptionLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              style={inputStyle}
            />
            <button type="button" onClick={handleAddOption} style={btnPrimary}>
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Projected State */}
      <div style={sectionStyle}>
        <span style={labelStyle}>
          Current State
          {loading && ' (loading...)'}
        </span>
        {projected && (projected.criteria.length > 0 || projected.options.length > 0) ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 13 }}>
                Criteria ({projected.criteria.length})
              </strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
                {projected.criteria.map((c) => (
                  <li key={c.id}>{c.label}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ fontSize: 13 }}>
                Options ({projected.options.length})
              </strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
                {projected.options.map((o) => (
                  <li key={o.id}>{o.label}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          !loading && (
            <p style={{ color: '#888', margin: 0, fontSize: 13 }}>
              Empty state. Add criteria and options above.
            </p>
          )
        )}
      </div>

      {/* Commit Log */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={labelStyle}>Commit Log ({commits.length})</span>
          <button type="button" onClick={() => refresh()} style={{ ...btnStyle, fontSize: 12, padding: '3px 10px' }}>
            Refresh
          </button>
        </div>
        <CommitLog commits={commits} />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Supabase/Event Store',
  component: SupabaseEventStore,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
