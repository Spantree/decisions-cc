import type { PughEvent } from '../events/types';
import { commitId as makeCommitId } from '../ids';
import type { Commit, MatrixRepository, MergeStrategy, ObjectStore, RefStore } from './types';
import { walkCommits, collectEventIds } from './walkCommits';
import { diffBranches } from './diff';
import { mergeBranches } from './merge';

export function createMatrixRepository(
  objects: ObjectStore,
  refs: RefStore,
): MatrixRepository {
  const repo: MatrixRepository = {
    objects,
    refs,

    async commit(branchName, events, author, comment?) {
      // Store all events
      for (const event of events) {
        await objects.putEvent(event);
      }

      // Get current branch tip (if any) for parent
      const ref = await refs.getRef(branchName);
      const parentIds = ref ? [ref.commitId] : [];

      const commit: Commit = {
        id: makeCommitId(),
        parentIds,
        eventIds: events.map((e) => e.id),
        author,
        timestamp: Date.now(),
        comment,
      };

      await objects.putCommit(commit);
      await refs.putRef({ name: branchName, commitId: commit.id, type: 'branch' });

      return commit;
    },

    async checkout(branchName) {
      const ref = await refs.getRef(branchName);
      if (!ref) return [];

      const eventIds = await collectEventIds(ref.commitId, objects);
      return objects.getEvents(eventIds);
    },

    async log(branchName, limit?) {
      const ref = await refs.getRef(branchName);
      if (!ref) return [];

      return walkCommits(ref.commitId, objects, limit);
    },

    async fork(newBranchName, sourceBranchName) {
      const sourceRef = await refs.getRef(sourceBranchName);
      if (!sourceRef) {
        throw new Error(`Branch '${sourceBranchName}' does not exist`);
      }

      const newRef = { name: newBranchName, commitId: sourceRef.commitId, type: 'branch' as const };
      await refs.putRef(newRef);
      return newRef;
    },

    async diff(sourceBranch, targetBranch) {
      return diffBranches(repo, sourceBranch, targetBranch);
    },

    async merge(sourceBranch, targetBranch, strategy, author, comment?) {
      return mergeBranches(repo, sourceBranch, targetBranch, strategy, author, comment);
    },
  };

  return repo;
}
