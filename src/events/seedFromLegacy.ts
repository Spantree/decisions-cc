import type { Criterion, Option, RatingEntry } from '../types';
import type { PughEvent } from './types';
import { eventId, MAIN_BRANCH_ID } from '../ids';

export interface SeedOptions {
  criteria?: Criterion[];
  options?: Option[];
  ratings?: RatingEntry[];
  weights?: Record<string, number>;
}

export function seedEventsFromOptions(opts: SeedOptions): PughEvent[] {
  const events: PughEvent[] = [];
  const now = Date.now();

  for (const c of opts.criteria ?? []) {
    events.push({
      id: eventId(),
      type: 'CriterionAdded',
      criterionId: c.id,
      label: c.label,
      scale: c.scale,
      timestamp: now,
      user: c.user,
      branchId: MAIN_BRANCH_ID,
    });
    if (c.description) {
      events.push({
        id: eventId(),
        type: 'CriterionDescriptionChanged',
        criterionId: c.id,
        description: c.description,
        timestamp: now,
        user: c.user,
        branchId: MAIN_BRANCH_ID,
      });
    }
  }

  // Set explicit weights (overriding the default 10 from CriterionAdded)
  if (opts.weights) {
    for (const [criterionId, weight] of Object.entries(opts.weights)) {
      if (weight !== 10) {
        events.push({
          id: eventId(),
          type: 'CriterionWeightAdjusted',
          criterionId,
          weight,
          timestamp: now,
          user: 'system',
          branchId: MAIN_BRANCH_ID,
        });
      }
    }
  }

  for (const t of opts.options ?? []) {
    events.push({
      id: eventId(),
      type: 'OptionAdded',
      optionId: t.id,
      label: t.label,
      timestamp: now,
      user: t.user,
      branchId: MAIN_BRANCH_ID,
    });
    if (t.description) {
      events.push({
        id: eventId(),
        type: 'OptionDescriptionChanged',
        optionId: t.id,
        description: t.description,
        timestamp: now,
        user: t.user,
        branchId: MAIN_BRANCH_ID,
      });
    }
  }

  for (const s of opts.ratings ?? []) {
    events.push({
      id: eventId(),
      type: 'RatingAssigned',
      optionId: s.optionId,
      criterionId: s.criterionId,
      value: s.value,
      label: s.label,
      comment: s.comment,
      timestamp: s.timestamp,
      user: s.user,
      branchId: MAIN_BRANCH_ID,
    });
  }

  return events;
}
