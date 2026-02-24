import { useCallback, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  listMatrices,
  createMatrix,
  updateMatrix,
  deleteMatrix,
  type Matrix,
} from './supabase';

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) return String((e as { message: unknown }).message);
  return JSON.stringify(e);
}

function CrudPoc() {
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMatrices(await listMatrices());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setError(null);
    try {
      await createMatrix(newTitle.trim());
      setNewTitle('');
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) return;
    setError(null);
    try {
      await updateMatrix(id, { title: editTitle.trim() });
      setEditingId(null);
      setEditTitle('');
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteMatrix(id);
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Supabase CRUD POC</h2>

      {error && (
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
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="New matrix title..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
        />
        <button type="button" onClick={handleCreate} style={{ padding: '6px 14px', cursor: 'pointer' }}>
          Create
        </button>
        <button type="button" onClick={refresh} style={{ padding: '6px 14px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {loading && <p style={{ color: '#666' }}>Loading...</p>}

      {!loading && matrices.length === 0 && (
        <p style={{ color: '#666' }}>No matrices yet. Create one above.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {matrices.map((m) => (
          <li
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            {editingId === m.id ? (
              <>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate(m.id)}
                  style={{ flex: 1, padding: '4px 8px', fontSize: 14 }}
                  autoFocus
                />
                <button type="button" onClick={() => handleUpdate(m.id)} style={{ cursor: 'pointer' }}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setEditTitle('');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span style={{ flex: 1 }}>
                  <strong>{m.title}</strong>{' '}
                  <span style={{ color: '#999', fontSize: 12 }}>
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(m.id);
                    setEditTitle(m.title);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  style={{ cursor: 'pointer', color: '#c00' }}
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const meta: Meta = {
  title: 'Supabase/CRUD POC',
  component: CrudPoc,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
