import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPughStore, type PughStoreInstance } from './createPughStore';
import { createMemoryRepository } from '../repository/memory';
import type { MatrixRepository } from '../repository/types';
import { DEFAULT_MATRIX_CONFIG } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tick(ms = 350): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wait for auto-commit (300ms debounce) to flush. */
async function waitForAutoCommit(): Promise<void> {
  await tick(400);
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('createPughStore', () => {
  describe('initial state', () => {
    it('creates with empty defaults', () => {
      const store = createPughStore();
      const s = store.getState();
      expect(s.criteria).toEqual([]);
      expect(s.options).toEqual([]);
      expect(s.ratings).toEqual([]);
      expect(s.weights).toEqual({});
      expect(s.matrixConfig).toEqual(DEFAULT_MATRIX_CONFIG);
      expect(s.activeBranch).toBe('main');
      expect(s.branchNames).toEqual(['main']);
      expect(s.pendingEvents).toEqual([]);
    });

    it('creates with seed data', () => {
      const store = createPughStore({
        criteria: [{ id: 'c1', label: 'Speed', user: 'a' }],
        options: [{ id: 'o1', label: 'React', user: 'a' }],
        ratings: [{ id: 'r1', optionId: 'o1', criterionId: 'c1', value: 7, timestamp: 1, user: 'a' }],
        weights: { c1: 15 },
      });
      const s = store.getState();
      expect(s.criteria).toHaveLength(1);
      expect(s.options).toHaveLength(1);
      expect(s.ratings).toHaveLength(1);
      expect(s.weights).toEqual({ c1: 15 });
    });

    it('initializes UI state correctly', () => {
      const store = createPughStore();
      const s = store.getState();
      expect(s.view).toBe('table');
      expect(s.showTotals).toBe(false);
      expect(s.showWeights).toBe(false);
      expect(s.showLabels).toBe(false);
      expect(s.editingCell).toBeNull();
      expect(s.editingHeader).toBeNull();
      expect(s.drawerCell).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Dispatch
  // -----------------------------------------------------------------------

  describe('dispatch', () => {
    it('updates domain state via event projection', () => {
      const store = createPughStore();
      const s = store.getState();
      s.addCriterion('c1', 'Speed');
      const after = store.getState();
      expect(after.criteria).toHaveLength(1);
      expect(after.criteria[0].label).toBe('Speed');
      expect(after.weights['c1']).toBe(10);
    });

    it('queues pending events', () => {
      const store = createPughStore();
      store.getState().addOption('o1', 'React', 'test');
      expect(store.getState().pendingEvents).toHaveLength(1);
    });

    it('multiple dispatches accumulate pending events', () => {
      const store = createPughStore();
      const s = store.getState();
      s.addCriterion('c1', 'Speed');
      s.addOption('o1', 'React', 'test');
      expect(store.getState().pendingEvents).toHaveLength(2);
    });

    it('domain state reflects all events including pending', () => {
      const store = createPughStore({
        criteria: [{ id: 'c1', label: 'Speed', user: 'a' }],
        options: [{ id: 'o1', label: 'React', user: 'a' }],
      });
      store.getState().addRating({
        id: 'r1',
        optionId: 'o1',
        criterionId: 'c1',
        value: 8,
        timestamp: Date.now(),
        user: 'test',
      });
      const after = store.getState();
      expect(after.ratings).toHaveLength(1);
      expect(after.ratings[0].value).toBe(8);
    });
  });

  // -----------------------------------------------------------------------
  // Domain action wrappers
  // -----------------------------------------------------------------------

  describe('domain actions', () => {
    let store: PughStoreInstance;

    beforeEach(() => {
      store = createPughStore({
        criteria: [
          { id: 'c1', label: 'Speed', user: 'a' },
          { id: 'c2', label: 'Cost', user: 'a' },
        ],
        options: [
          { id: 'o1', label: 'React', user: 'a' },
          { id: 'o2', label: 'Vue', user: 'a' },
        ],
      });
    });

    it('addOption adds an option', () => {
      store.getState().addOption('o3', 'Svelte', 'test');
      expect(store.getState().options).toHaveLength(3);
    });

    it('removeOption removes an option', () => {
      store.getState().removeOption('o1');
      expect(store.getState().options).toHaveLength(1);
      expect(store.getState().options[0].id).toBe('o2');
    });

    it('renameOption renames an option', () => {
      store.getState().renameOption('o1', 'React 19');
      expect(store.getState().options.find((o) => o.id === 'o1')?.label).toBe('React 19');
    });

    it('addCriterion adds a criterion', () => {
      store.getState().addCriterion('c3', 'DX');
      expect(store.getState().criteria).toHaveLength(3);
    });

    it('removeCriterion removes a criterion', () => {
      store.getState().removeCriterion('c1');
      expect(store.getState().criteria).toHaveLength(1);
      expect(store.getState().criteria[0].id).toBe('c2');
    });

    it('renameCriterion renames a criterion', () => {
      store.getState().renameCriterion('c1', 'Performance');
      expect(store.getState().criteria.find((c) => c.id === 'c1')?.label).toBe('Performance');
    });

    it('setWeight changes criterion weight', () => {
      store.getState().setWeight('c1', 20);
      expect(store.getState().weights['c1']).toBe(20);
    });

    it('setCriterionScale overrides criterion scale', () => {
      store.getState().setCriterionScale('c1', { kind: 'binary' });
      expect(store.getState().criteria.find((c) => c.id === 'c1')?.scale).toEqual({ kind: 'binary' });
    });

    it('setMatrixDefaultScale updates default scale', () => {
      store.getState().setMatrixDefaultScale({ kind: 'unbounded' });
      expect(store.getState().matrixConfig.defaultScale).toEqual({ kind: 'unbounded' });
    });
  });

  // -----------------------------------------------------------------------
  // commitPending
  // -----------------------------------------------------------------------

  describe('commitPending', () => {
    it('clears pending events after commit', async () => {
      const repo = createMemoryRepository();
      const store = createPughStore({ repository: repo });
      await store.getState().init();

      store.getState().addCriterion('c1', 'Speed');
      expect(store.getState().pendingEvents.length).toBeGreaterThan(0);

      await store.getState().commitPending();
      expect(store.getState().pendingEvents).toEqual([]);
    });

    it('persists events to the repository', async () => {
      const repo = createMemoryRepository();
      const store = createPughStore({ repository: repo });
      await store.getState().init();

      store.getState().addCriterion('c1', 'Speed');
      await store.getState().commitPending();

      const events = await repo.checkout('main');
      const criterionAddedEvents = events.filter((e) => e.type === 'CriterionAdded');
      expect(criterionAddedEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('is a no-op when there are no pending events', async () => {
      const repo = createMemoryRepository();
      const store = createPughStore({ repository: repo });
      await store.getState().init();
      await store.getState().commitPending();
      // Should not throw
      expect(store.getState().pendingEvents).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Auto-commit (debounced)
  // -----------------------------------------------------------------------

  describe('auto-commit', () => {
    it('auto-commits pending events after debounce period', async () => {
      vi.useRealTimers();
      const repo = createMemoryRepository();
      const store = createPughStore({ repository: repo });
      await store.getState().init();

      store.getState().addCriterion('c1', 'Speed');
      expect(store.getState().pendingEvents.length).toBeGreaterThan(0);

      await waitForAutoCommit();
      expect(store.getState().pendingEvents).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // init() — hydration
  // -----------------------------------------------------------------------

  describe('init', () => {
    it('seeds fresh repository when no main ref exists', async () => {
      const repo = createMemoryRepository();
      const store = createPughStore({
        criteria: [{ id: 'c1', label: 'Speed', user: 'a' }],
        repository: repo,
      });
      await store.getState().init();

      expect(store.getState().isLoading).toBe(false);
      const events = await repo.checkout('main');
      expect(events.length).toBeGreaterThan(0);
    });

    it('hydrates from existing repository', async () => {
      const repo = createMemoryRepository();

      // First store: seed and commit
      const store1 = createPughStore({
        criteria: [{ id: 'c1', label: 'Speed', user: 'a' }],
        options: [{ id: 'o1', label: 'React', user: 'a' }],
        repository: repo,
      });
      await store1.getState().init();

      // Second store: hydrate from same repo (no seed data)
      const store2 = createPughStore({ repository: repo });
      await store2.getState().init();

      expect(store2.getState().isLoading).toBe(false);
      expect(store2.getState().criteria).toHaveLength(1);
      expect(store2.getState().options).toHaveLength(1);
    });

    it('creates empty initial commit when no seed data', async () => {
      const repo = createMemoryRepository();
      const store = createPughStore({ repository: repo });
      await store.getState().init();

      expect(store.getState().isLoading).toBe(false);
      const log = await repo.log('main');
      expect(log.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // Branch CRUD
  // -----------------------------------------------------------------------

  describe('branch operations', () => {
    let store: PughStoreInstance;
    let repo: MatrixRepository;

    beforeEach(async () => {
      repo = createMemoryRepository();
      store = createPughStore({
        criteria: [{ id: 'c1', label: 'Speed', user: 'a' }],
        options: [{ id: 'o1', label: 'React', user: 'a' }],
        repository: repo,
      });
      await store.getState().init();
    });

    it('createBranch creates and switches to new branch', async () => {
      store.getState().createBranch('feature');
      await tick();
      const s = store.getState();
      expect(s.activeBranch).toBe('feature');
      expect(s.branchNames).toContain('feature');
      expect(s.branchNames).toContain('main');
    });

    it('switchBranch changes active branch', async () => {
      store.getState().createBranch('feature');
      await tick();
      store.getState().switchBranch('main');
      await tick();
      expect(store.getState().activeBranch).toBe('main');
    });

    it('renameBranch renames a branch', async () => {
      store.getState().createBranch('feature');
      await tick();
      store.getState().renameBranch('feature', 'experiment');
      await tick();
      const s = store.getState();
      expect(s.branchNames).toContain('experiment');
      expect(s.branchNames).not.toContain('feature');
      expect(s.activeBranch).toBe('experiment');
    });

    it('deleteBranch removes the branch', async () => {
      store.getState().createBranch('feature');
      await tick();
      store.getState().switchBranch('main');
      await tick();
      store.getState().deleteBranch('feature');
      await tick();
      expect(store.getState().branchNames).not.toContain('feature');
    });

    it('deleteBranch falls back to main when deleting active branch', async () => {
      store.getState().createBranch('feature');
      await tick();
      expect(store.getState().activeBranch).toBe('feature');
      store.getState().deleteBranch('feature');
      await tick();
      expect(store.getState().activeBranch).toBe('main');
    });
  });

  // -----------------------------------------------------------------------
  // Cannot delete main
  // -----------------------------------------------------------------------

  describe('cannot delete main', () => {
    it('deleteBranch("main") is a no-op', async () => {
      const repo = createMemoryRepository();
      const store = createPughStore({ repository: repo });
      await store.getState().init();

      store.getState().deleteBranch('main');
      await tick();
      expect(store.getState().activeBranch).toBe('main');
      expect(store.getState().branchNames).toContain('main');
    });
  });

  // -----------------------------------------------------------------------
  // Branch isolation
  // -----------------------------------------------------------------------

  describe('branch isolation', () => {
    it('changes on one branch do not appear on another', async () => {
      const repo = createMemoryRepository();
      const store = createPughStore({
        criteria: [{ id: 'c1', label: 'Speed', user: 'a' }],
        repository: repo,
      });
      await store.getState().init();

      // Create feature branch
      store.getState().createBranch('feature');
      await tick();

      // Add option on feature branch
      store.getState().addOption('o1', 'React', 'test');
      await store.getState().commitPending();
      expect(store.getState().options).toHaveLength(1);

      // Switch to main
      store.getState().switchBranch('main');
      await tick();

      // Main should NOT have the option
      expect(store.getState().options).toHaveLength(0);
      expect(store.getState().activeBranch).toBe('main');
    });

    it('each branch maintains its own history', async () => {
      const repo = createMemoryRepository();
      const store = createPughStore({ repository: repo });
      await store.getState().init();

      // Add criterion on main
      store.getState().addCriterion('c1', 'Speed');
      await store.getState().commitPending();

      // Fork feature from main
      store.getState().createBranch('feature');
      await tick();

      // Add different criterion on feature
      store.getState().addCriterion('c2', 'Cost');
      await store.getState().commitPending();

      // Feature has c1 + c2
      expect(store.getState().criteria).toHaveLength(2);

      // Main only has c1
      store.getState().switchBranch('main');
      await tick();
      expect(store.getState().criteria).toHaveLength(1);
      expect(store.getState().criteria[0].id).toBe('c1');
    });
  });

  // -----------------------------------------------------------------------
  // Persistence round-trip
  // -----------------------------------------------------------------------

  describe('persistence round-trip', () => {
    it('data survives store re-creation with same repository', async () => {
      const repo = createMemoryRepository();

      // Store 1: create data
      const store1 = createPughStore({ repository: repo });
      await store1.getState().init();
      store1.getState().addCriterion('c1', 'Speed');
      store1.getState().addOption('o1', 'React', 'test');
      await store1.getState().commitPending();

      // Store 2: hydrate from same repo
      const store2 = createPughStore({ repository: repo });
      await store2.getState().init();

      expect(store2.getState().criteria).toHaveLength(1);
      expect(store2.getState().criteria[0].label).toBe('Speed');
      expect(store2.getState().options).toHaveLength(1);
      expect(store2.getState().options[0].label).toBe('React');
    });

    it('branches survive store re-creation', async () => {
      const repo = createMemoryRepository();

      const store1 = createPughStore({ repository: repo });
      await store1.getState().init();
      store1.getState().createBranch('feature');
      await tick();

      const store2 = createPughStore({ repository: repo });
      await store2.getState().init();
      expect(store2.getState().branchNames).toContain('feature');
    });
  });

  // -----------------------------------------------------------------------
  // UI actions
  // -----------------------------------------------------------------------

  describe('UI actions', () => {
    it('toggleTotals toggles showTotals', () => {
      const store = createPughStore();
      expect(store.getState().showTotals).toBe(false);
      store.getState().toggleTotals();
      expect(store.getState().showTotals).toBe(true);
      store.getState().toggleTotals();
      expect(store.getState().showTotals).toBe(false);
    });

    it('toggleWeights toggles showWeights', () => {
      const store = createPughStore();
      store.getState().toggleWeights();
      expect(store.getState().showWeights).toBe(true);
    });

    it('toggleLabels toggles showLabels', () => {
      const store = createPughStore();
      store.getState().toggleLabels();
      expect(store.getState().showLabels).toBe(true);
    });

    it('toggleView switches between table and chart', () => {
      const store = createPughStore();
      expect(store.getState().view).toBe('table');
      store.getState().toggleView();
      expect(store.getState().view).toBe('chart');
      store.getState().toggleView();
      expect(store.getState().view).toBe('table');
    });

    it('startEditing / cancelEditing manages cell editing state', () => {
      const store = createPughStore();
      store.getState().startEditing('o1', 'c1');
      expect(store.getState().editingCell).toEqual({ optionId: 'o1', criterionId: 'c1' });
      store.getState().cancelEditing();
      expect(store.getState().editingCell).toBeNull();
    });

    it('openDrawer / closeDrawer manages drawer state', () => {
      const store = createPughStore({
        criteria: [{ id: 'c1', label: 'Speed', user: 'a' }],
        options: [{ id: 'o1', label: 'React', user: 'a' }],
      });
      store.getState().openDrawer('o1', 'c1');
      expect(store.getState().drawerCell).toEqual({ optionId: 'o1', criterionId: 'c1' });
      expect(store.getState().editingCell).toBeNull();
      store.getState().closeDrawer();
      expect(store.getState().drawerCell).toBeNull();
    });
  });
});
