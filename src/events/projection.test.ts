import { describe, it, expect } from 'vitest';
import { projectEvents } from './projection';
import type { PughEvent } from './types';
import { DEFAULT_MATRIX_CONFIG } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let seq = 0;
function base(overrides: Partial<PughEvent> = {}): Pick<PughEvent, 'id' | 'timestamp' | 'user' | 'branchId'> {
  seq += 1;
  return { id: `evt_${seq}`, timestamp: seq, user: 'test', branchId: 'main', ...overrides };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('projectEvents', () => {
  it('returns empty state for no events', () => {
    const state = projectEvents([]);
    expect(state.criteria).toEqual([]);
    expect(state.options).toEqual([]);
    expect(state.ratings).toEqual([]);
    expect(state.weights).toEqual({});
    expect(state.matrixConfig).toEqual(DEFAULT_MATRIX_CONFIG);
  });

  // -----------------------------------------------------------------------
  // MatrixCreated
  // -----------------------------------------------------------------------

  describe('MatrixCreated', () => {
    it('sets matrixConfig', () => {
      const scale = { kind: 'numeric' as const, min: -2, max: 2, step: 1 };
      const state = projectEvents([
        { ...base(), type: 'MatrixCreated', title: 'Test', allowNegative: true, defaultScale: scale },
      ]);
      expect(state.matrixConfig).toEqual({ allowNegative: true, defaultScale: scale });
    });
  });

  // -----------------------------------------------------------------------
  // MatrixDefaultScaleSet
  // -----------------------------------------------------------------------

  describe('MatrixDefaultScaleSet', () => {
    it('updates defaultScale while preserving rest of config', () => {
      const initialScale = { kind: 'numeric' as const, min: 1, max: 10, step: 1 };
      const newScale = { kind: 'binary' as const };
      const state = projectEvents([
        { ...base(), type: 'MatrixCreated', title: 'T', allowNegative: true, defaultScale: initialScale },
        { ...base(), type: 'MatrixDefaultScaleSet', defaultScale: newScale },
      ]);
      expect(state.matrixConfig.defaultScale).toEqual(newScale);
      expect(state.matrixConfig.allowNegative).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // No-op events
  // -----------------------------------------------------------------------

  describe('no-op events', () => {
    it.each([
      { type: 'MatrixTitleChanged' as const, title: 'New' },
      { type: 'MatrixDescriptionChanged' as const, description: 'Desc' },
      { type: 'MatrixArchived' as const },
    ])('$type does not change state', (payload) => {
      const state = projectEvents([{ ...base(), ...payload } as PughEvent]);
      expect(state.criteria).toEqual([]);
      expect(state.options).toEqual([]);
      expect(state.ratings).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // CriterionAdded
  // -----------------------------------------------------------------------

  describe('CriterionAdded', () => {
    it('adds a criterion with default weight 10', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Speed', scale: undefined },
      ]);
      expect(state.criteria).toHaveLength(1);
      expect(state.criteria[0]).toEqual({ id: 'c1', label: 'Speed', user: 'test', scale: undefined });
      expect(state.weights['c1']).toBe(10);
    });

    it('preserves custom scale on criterion', () => {
      const scale = { kind: 'binary' as const };
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Pass?', scale },
      ]);
      expect(state.criteria[0].scale).toEqual(scale);
    });
  });

  // -----------------------------------------------------------------------
  // CriterionRenamed
  // -----------------------------------------------------------------------

  describe('CriterionRenamed', () => {
    it('renames a criterion', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Old' },
        { ...base(), type: 'CriterionRenamed', criterionId: 'c1', label: 'New' },
      ]);
      expect(state.criteria[0].label).toBe('New');
    });

    it('is a no-op for non-existent criterion', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionRenamed', criterionId: 'missing', label: 'X' },
      ]);
      expect(state.criteria).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // CriterionScaleOverridden
  // -----------------------------------------------------------------------

  describe('CriterionScaleOverridden', () => {
    it('overrides criterion scale', () => {
      const newScale = { kind: 'unbounded' as const };
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Count' },
        { ...base(), type: 'CriterionScaleOverridden', criterionId: 'c1', scale: newScale },
      ]);
      expect(state.criteria[0].scale).toEqual(newScale);
    });
  });

  // -----------------------------------------------------------------------
  // CriterionDescriptionChanged
  // -----------------------------------------------------------------------

  describe('CriterionDescriptionChanged', () => {
    it('sets description on a criterion', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Speed' },
        { ...base(), type: 'CriterionDescriptionChanged', criterionId: 'c1', description: 'How fast is it?' },
      ]);
      expect(state.criteria[0].description).toBe('How fast is it?');
    });
  });

  // -----------------------------------------------------------------------
  // CriterionReordered
  // -----------------------------------------------------------------------

  describe('CriterionReordered', () => {
    it('moves criterion to a new position', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'A' },
        { ...base(), type: 'CriterionAdded', criterionId: 'c2', label: 'B' },
        { ...base(), type: 'CriterionAdded', criterionId: 'c3', label: 'C' },
        { ...base(), type: 'CriterionReordered', criterionId: 'c3', position: 0 },
      ]);
      expect(state.criteria.map((c) => c.id)).toEqual(['c3', 'c1', 'c2']);
    });

    it('is a no-op for non-existent criterion', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'A' },
        { ...base(), type: 'CriterionReordered', criterionId: 'missing', position: 0 },
      ]);
      expect(state.criteria.map((c) => c.id)).toEqual(['c1']);
    });
  });

  // -----------------------------------------------------------------------
  // CriterionRemoved — cascade deletes
  // -----------------------------------------------------------------------

  describe('CriterionRemoved', () => {
    it('removes criterion and its weight', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Speed' },
        { ...base(), type: 'CriterionRemoved', criterionId: 'c1' },
      ]);
      expect(state.criteria).toHaveLength(0);
      expect(state.weights).not.toHaveProperty('c1');
    });

    it('cascade-deletes ratings referencing the removed criterion', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Speed' },
        { ...base(), type: 'CriterionAdded', criterionId: 'c2', label: 'Cost' },
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'Opt1' },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 5 },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c2', value: 8 },
        { ...base(), type: 'CriterionRemoved', criterionId: 'c1' },
      ]);
      expect(state.ratings).toHaveLength(1);
      expect(state.ratings[0].criterionId).toBe('c2');
    });
  });

  // -----------------------------------------------------------------------
  // CriterionWeightAdjusted
  // -----------------------------------------------------------------------

  describe('CriterionWeightAdjusted', () => {
    it('overrides the default weight', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Speed' },
        { ...base(), type: 'CriterionWeightAdjusted', criterionId: 'c1', weight: 5 },
      ]);
      expect(state.weights['c1']).toBe(5);
    });
  });

  // -----------------------------------------------------------------------
  // OptionAdded
  // -----------------------------------------------------------------------

  describe('OptionAdded', () => {
    it('adds an option', () => {
      const state = projectEvents([
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'React' },
      ]);
      expect(state.options).toHaveLength(1);
      expect(state.options[0]).toEqual({ id: 'o1', label: 'React', user: 'test' });
    });
  });

  // -----------------------------------------------------------------------
  // OptionRenamed
  // -----------------------------------------------------------------------

  describe('OptionRenamed', () => {
    it('renames an option', () => {
      const state = projectEvents([
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'Old' },
        { ...base(), type: 'OptionRenamed', optionId: 'o1', label: 'New' },
      ]);
      expect(state.options[0].label).toBe('New');
    });
  });

  // -----------------------------------------------------------------------
  // OptionDescriptionChanged
  // -----------------------------------------------------------------------

  describe('OptionDescriptionChanged', () => {
    it('sets description on an option', () => {
      const state = projectEvents([
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'React' },
        { ...base(), type: 'OptionDescriptionChanged', optionId: 'o1', description: 'A JS library' },
      ]);
      expect(state.options[0].description).toBe('A JS library');
    });
  });

  // -----------------------------------------------------------------------
  // OptionReordered
  // -----------------------------------------------------------------------

  describe('OptionReordered', () => {
    it('moves option to a new position', () => {
      const state = projectEvents([
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'A' },
        { ...base(), type: 'OptionAdded', optionId: 'o2', label: 'B' },
        { ...base(), type: 'OptionAdded', optionId: 'o3', label: 'C' },
        { ...base(), type: 'OptionReordered', optionId: 'o3', position: 0 },
      ]);
      expect(state.options.map((o) => o.id)).toEqual(['o3', 'o1', 'o2']);
    });
  });

  // -----------------------------------------------------------------------
  // OptionRemoved — cascade deletes
  // -----------------------------------------------------------------------

  describe('OptionRemoved', () => {
    it('removes option', () => {
      const state = projectEvents([
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'X' },
        { ...base(), type: 'OptionRemoved', optionId: 'o1' },
      ]);
      expect(state.options).toHaveLength(0);
    });

    it('cascade-deletes ratings referencing the removed option', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Speed' },
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'React' },
        { ...base(), type: 'OptionAdded', optionId: 'o2', label: 'Vue' },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 7 },
        { ...base(), type: 'RatingAssigned', optionId: 'o2', criterionId: 'c1', value: 9 },
        { ...base(), type: 'OptionRemoved', optionId: 'o1' },
      ]);
      expect(state.ratings).toHaveLength(1);
      expect(state.ratings[0].optionId).toBe('o2');
    });
  });

  // -----------------------------------------------------------------------
  // RatingAssigned
  // -----------------------------------------------------------------------

  describe('RatingAssigned', () => {
    it('adds a rating entry', () => {
      const state = projectEvents([
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 8, label: 'Good', comment: 'Nice' },
      ]);
      expect(state.ratings).toHaveLength(1);
      expect(state.ratings[0]).toMatchObject({
        optionId: 'o1',
        criterionId: 'c1',
        value: 8,
        label: 'Good',
        comment: 'Nice',
      });
    });

    it('appends multiple ratings (does not replace)', () => {
      const state = projectEvents([
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 5 },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 8 },
      ]);
      expect(state.ratings).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // RatingRemoved
  // -----------------------------------------------------------------------

  describe('RatingRemoved', () => {
    it('removes all ratings matching option+criterion pair', () => {
      const state = projectEvents([
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 5 },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 8 },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c2', value: 3 },
        { ...base(), type: 'RatingRemoved', optionId: 'o1', criterionId: 'c1' },
      ]);
      expect(state.ratings).toHaveLength(1);
      expect(state.ratings[0].criterionId).toBe('c2');
    });
  });

  // -----------------------------------------------------------------------
  // CommentAdded
  // -----------------------------------------------------------------------

  describe('CommentAdded', () => {
    it('adds a comment-only rating entry (value undefined)', () => {
      const state = projectEvents([
        { ...base(), type: 'CommentAdded', optionId: 'o1', criterionId: 'c1', comment: 'Hmm' },
      ]);
      expect(state.ratings).toHaveLength(1);
      expect(state.ratings[0].value).toBeUndefined();
      expect(state.ratings[0].comment).toBe('Hmm');
    });

    it('supports parentCommentId for threaded replies', () => {
      const state = projectEvents([
        { ...base(), type: 'CommentAdded', optionId: 'o1', criterionId: 'c1', comment: 'Root' },
        { ...base(), type: 'CommentAdded', optionId: 'o1', criterionId: 'c1', comment: 'Reply', parentCommentId: 'cmt_1' },
      ]);
      expect(state.ratings[1].parentCommentId).toBe('cmt_1');
    });
  });

  // -----------------------------------------------------------------------
  // Event ordering
  // -----------------------------------------------------------------------

  describe('event ordering', () => {
    it('later rename overrides earlier rename', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Original' },
        { ...base(), type: 'CriterionRenamed', criterionId: 'c1', label: 'Second' },
        { ...base(), type: 'CriterionRenamed', criterionId: 'c1', label: 'Third' },
      ]);
      expect(state.criteria[0].label).toBe('Third');
    });

    it('add after remove results in re-creation', () => {
      const state = projectEvents([
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'First' },
        { ...base(), type: 'OptionRemoved', optionId: 'o1' },
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'Recreated' },
      ]);
      expect(state.options).toHaveLength(1);
      expect(state.options[0].label).toBe('Recreated');
    });

    it('weight adjustment after criterion removal does not crash', () => {
      const state = projectEvents([
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'X' },
        { ...base(), type: 'CriterionRemoved', criterionId: 'c1' },
        { ...base(), type: 'CriterionWeightAdjusted', criterionId: 'c1', weight: 20 },
      ]);
      // The weight is set even though criterion is gone (projection doesn't validate)
      expect(state.criteria).toHaveLength(0);
      expect(state.weights['c1']).toBe(20);
    });
  });

  // -----------------------------------------------------------------------
  // Exhaustive type coverage — ensure all PughEvent types are handled
  // -----------------------------------------------------------------------

  describe('exhaustive type coverage', () => {
    it('handles every event type without throwing', () => {
      const allEvents: PughEvent[] = [
        { ...base(), type: 'MatrixCreated', title: 'T', allowNegative: false, defaultScale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
        { ...base(), type: 'MatrixDefaultScaleSet', defaultScale: { kind: 'binary' } },
        { ...base(), type: 'MatrixTitleChanged', title: 'X' },
        { ...base(), type: 'MatrixDescriptionChanged', description: 'D' },
        { ...base(), type: 'MatrixArchived' },
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'C1' },
        { ...base(), type: 'CriterionRenamed', criterionId: 'c1', label: 'C1b' },
        { ...base(), type: 'CriterionScaleOverridden', criterionId: 'c1', scale: { kind: 'binary' } },
        { ...base(), type: 'CriterionDescriptionChanged', criterionId: 'c1', description: 'D' },
        { ...base(), type: 'CriterionReordered', criterionId: 'c1', position: 0 },
        { ...base(), type: 'CriterionWeightAdjusted', criterionId: 'c1', weight: 5 },
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'O1' },
        { ...base(), type: 'OptionRenamed', optionId: 'o1', label: 'O1b' },
        { ...base(), type: 'OptionDescriptionChanged', optionId: 'o1', description: 'D' },
        { ...base(), type: 'OptionReordered', optionId: 'o1', position: 0 },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 7 },
        { ...base(), type: 'RatingRemoved', optionId: 'o1', criterionId: 'c1' },
        { ...base(), type: 'CommentAdded', optionId: 'o1', criterionId: 'c1', comment: 'C' },
        { ...base(), type: 'CriterionRemoved', criterionId: 'c1' },
        { ...base(), type: 'OptionRemoved', optionId: 'o1' },
      ];

      expect(() => projectEvents(allEvents)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Complex scenario
  // -----------------------------------------------------------------------

  describe('complex scenario', () => {
    it('builds correct state from a realistic event stream', () => {
      const state = projectEvents([
        { ...base(), type: 'MatrixCreated', title: 'Framework Comparison', allowNegative: false, defaultScale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
        { ...base(), type: 'CriterionAdded', criterionId: 'c1', label: 'Performance' },
        { ...base(), type: 'CriterionAdded', criterionId: 'c2', label: 'DX' },
        { ...base(), type: 'CriterionAdded', criterionId: 'c3', label: 'Bundle Size' },
        { ...base(), type: 'OptionAdded', optionId: 'o1', label: 'React' },
        { ...base(), type: 'OptionAdded', optionId: 'o2', label: 'Vue' },
        { ...base(), type: 'OptionAdded', optionId: 'o3', label: 'Svelte' },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c1', value: 7 },
        { ...base(), type: 'RatingAssigned', optionId: 'o2', criterionId: 'c1', value: 8 },
        { ...base(), type: 'RatingAssigned', optionId: 'o3', criterionId: 'c1', value: 9 },
        { ...base(), type: 'RatingAssigned', optionId: 'o1', criterionId: 'c2', value: 9 },
        { ...base(), type: 'CriterionWeightAdjusted', criterionId: 'c1', weight: 15 },
        { ...base(), type: 'CriterionWeightAdjusted', criterionId: 'c3', weight: 5 },
        // Remove Bundle Size — should cascade-delete any ratings for c3
        { ...base(), type: 'CriterionRemoved', criterionId: 'c3' },
      ]);

      expect(state.criteria).toHaveLength(2);
      expect(state.criteria.map((c) => c.label)).toEqual(['Performance', 'DX']);
      expect(state.options).toHaveLength(3);
      expect(state.ratings).toHaveLength(4);
      expect(state.weights).toEqual({ c1: 15, c2: 10 });
      expect(state.weights).not.toHaveProperty('c3');
    });
  });
});
