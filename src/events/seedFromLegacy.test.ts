import { describe, it, expect } from 'vitest';
import { seedEventsFromOptions } from './seedFromLegacy';
import { projectEvents } from './projection';
import type { Criterion, Option, RatingEntry } from '../types';

// ---------------------------------------------------------------------------
// Empty input
// ---------------------------------------------------------------------------

describe('seedEventsFromOptions', () => {
  it('returns empty array for no input', () => {
    expect(seedEventsFromOptions({})).toEqual([]);
  });

  it('returns empty array for empty arrays', () => {
    expect(seedEventsFromOptions({ criteria: [], options: [], ratings: [] })).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Criteria seeding
  // -----------------------------------------------------------------------

  describe('criteria seeding', () => {
    it('generates CriterionAdded for each criterion', () => {
      const criteria: Criterion[] = [
        { id: 'c1', label: 'Speed', user: 'alice' },
        { id: 'c2', label: 'Cost', user: 'bob' },
      ];
      const events = seedEventsFromOptions({ criteria });
      const added = events.filter((e) => e.type === 'CriterionAdded');
      expect(added).toHaveLength(2);
      expect(added[0]).toMatchObject({ criterionId: 'c1', label: 'Speed', user: 'alice' });
      expect(added[1]).toMatchObject({ criterionId: 'c2', label: 'Cost', user: 'bob' });
    });

    it('generates CriterionDescriptionChanged when description is present', () => {
      const criteria: Criterion[] = [
        { id: 'c1', label: 'Speed', user: 'alice', description: 'How fast?' },
        { id: 'c2', label: 'Cost', user: 'bob' }, // no description
      ];
      const events = seedEventsFromOptions({ criteria });
      const descEvents = events.filter((e) => e.type === 'CriterionDescriptionChanged');
      expect(descEvents).toHaveLength(1);
      expect(descEvents[0]).toMatchObject({ criterionId: 'c1', description: 'How fast?' });
    });

    it('preserves custom scale on criterion', () => {
      const criteria: Criterion[] = [
        { id: 'c1', label: 'Pass?', user: 'a', scale: { kind: 'binary' } },
      ];
      const events = seedEventsFromOptions({ criteria });
      const added = events.find((e) => e.type === 'CriterionAdded');
      expect(added).toMatchObject({ scale: { kind: 'binary' } });
    });
  });

  // -----------------------------------------------------------------------
  // Weight seeding
  // -----------------------------------------------------------------------

  describe('weight seeding', () => {
    it('generates CriterionWeightAdjusted only for non-default weights', () => {
      const criteria: Criterion[] = [
        { id: 'c1', label: 'Speed', user: 'a' },
        { id: 'c2', label: 'Cost', user: 'a' },
      ];
      const weights = { c1: 10, c2: 5 };
      const events = seedEventsFromOptions({ criteria, weights });
      const weightEvents = events.filter((e) => e.type === 'CriterionWeightAdjusted');
      expect(weightEvents).toHaveLength(1);
      expect(weightEvents[0]).toMatchObject({ criterionId: 'c2', weight: 5 });
    });

    it('skips weight events when all weights are default (10)', () => {
      const criteria: Criterion[] = [{ id: 'c1', label: 'Speed', user: 'a' }];
      const events = seedEventsFromOptions({ criteria, weights: { c1: 10 } });
      const weightEvents = events.filter((e) => e.type === 'CriterionWeightAdjusted');
      expect(weightEvents).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Options seeding
  // -----------------------------------------------------------------------

  describe('options seeding', () => {
    it('generates OptionAdded for each option', () => {
      const options: Option[] = [
        { id: 'o1', label: 'React', user: 'alice' },
        { id: 'o2', label: 'Vue', user: 'bob' },
      ];
      const events = seedEventsFromOptions({ options });
      const added = events.filter((e) => e.type === 'OptionAdded');
      expect(added).toHaveLength(2);
      expect(added[0]).toMatchObject({ optionId: 'o1', label: 'React' });
    });

    it('generates OptionDescriptionChanged when description is present', () => {
      const options: Option[] = [
        { id: 'o1', label: 'React', user: 'a', description: 'A JS library' },
        { id: 'o2', label: 'Vue', user: 'a' },
      ];
      const events = seedEventsFromOptions({ options });
      const descEvents = events.filter((e) => e.type === 'OptionDescriptionChanged');
      expect(descEvents).toHaveLength(1);
      expect(descEvents[0]).toMatchObject({ optionId: 'o1', description: 'A JS library' });
    });
  });

  // -----------------------------------------------------------------------
  // Ratings seeding
  // -----------------------------------------------------------------------

  describe('ratings seeding', () => {
    it('generates RatingAssigned for each rating', () => {
      const ratings: RatingEntry[] = [
        { id: 'r1', optionId: 'o1', criterionId: 'c1', value: 7, timestamp: 100, user: 'alice' },
        { id: 'r2', optionId: 'o2', criterionId: 'c1', value: 9, label: 'Great', comment: 'Wow', timestamp: 200, user: 'bob' },
      ];
      const events = seedEventsFromOptions({ ratings });
      const assigned = events.filter((e) => e.type === 'RatingAssigned');
      expect(assigned).toHaveLength(2);
      expect(assigned[0]).toMatchObject({ optionId: 'o1', criterionId: 'c1', value: 7 });
      expect(assigned[1]).toMatchObject({ optionId: 'o2', value: 9, label: 'Great', comment: 'Wow' });
    });
  });

  // -----------------------------------------------------------------------
  // Event ordering
  // -----------------------------------------------------------------------

  describe('event ordering', () => {
    it('emits criteria before options before ratings', () => {
      const events = seedEventsFromOptions({
        criteria: [{ id: 'c1', label: 'Speed', user: 'a' }],
        options: [{ id: 'o1', label: 'React', user: 'a' }],
        ratings: [{ id: 'r1', optionId: 'o1', criterionId: 'c1', value: 5, timestamp: 1, user: 'a' }],
      });
      const types = events.map((e) => e.type);
      const criterionIdx = types.indexOf('CriterionAdded');
      const optionIdx = types.indexOf('OptionAdded');
      const ratingIdx = types.indexOf('RatingAssigned');
      expect(criterionIdx).toBeLessThan(optionIdx);
      expect(optionIdx).toBeLessThan(ratingIdx);
    });
  });

  // -----------------------------------------------------------------------
  // Round-trip: seed → project → matches original
  // -----------------------------------------------------------------------

  describe('round-trip', () => {
    it('seed events projected back reconstruct the original data', () => {
      const criteria: Criterion[] = [
        { id: 'c1', label: 'Speed', user: 'alice', description: 'How fast?' },
        { id: 'c2', label: 'Cost', user: 'bob', scale: { kind: 'binary' } },
      ];
      const options: Option[] = [
        { id: 'o1', label: 'React', user: 'alice', description: 'A library' },
        { id: 'o2', label: 'Vue', user: 'bob' },
      ];
      const ratings: RatingEntry[] = [
        { id: 'r1', optionId: 'o1', criterionId: 'c1', value: 7, timestamp: 100, user: 'alice' },
        { id: 'r2', optionId: 'o2', criterionId: 'c2', value: 1, timestamp: 200, user: 'bob' },
      ];
      const weights = { c1: 15, c2: 10 };

      const events = seedEventsFromOptions({ criteria, options, ratings, weights });
      const state = projectEvents(events);

      expect(state.criteria).toHaveLength(2);
      expect(state.criteria[0]).toMatchObject({ id: 'c1', label: 'Speed', description: 'How fast?' });
      expect(state.criteria[1]).toMatchObject({ id: 'c2', label: 'Cost', scale: { kind: 'binary' } });

      expect(state.options).toHaveLength(2);
      expect(state.options[0]).toMatchObject({ id: 'o1', label: 'React', description: 'A library' });
      expect(state.options[1]).toMatchObject({ id: 'o2', label: 'Vue' });

      expect(state.ratings).toHaveLength(2);
      expect(state.weights).toEqual({ c1: 15, c2: 10 });
    });
  });

  // -----------------------------------------------------------------------
  // All event ids are unique
  // -----------------------------------------------------------------------

  describe('event ids', () => {
    it('generates unique ids for all events', () => {
      const events = seedEventsFromOptions({
        criteria: [
          { id: 'c1', label: 'A', user: 'a', description: 'D' },
          { id: 'c2', label: 'B', user: 'a' },
        ],
        options: [{ id: 'o1', label: 'X', user: 'a', description: 'D' }],
        ratings: [{ id: 'r1', optionId: 'o1', criterionId: 'c1', value: 5, timestamp: 1, user: 'a' }],
        weights: { c1: 5 },
      });
      const ids = events.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
