import { commitId as makeCommitId } from '../ids';
import type { Commit, MatrixRepository, MergeStrategy } from './types';
import { collectEventIds } from './walkCommits';

/**
 * Merge source branch into target branch using the given strategy.
 *
 * - 'ours': keep target events, ignore source-only events. The merge commit
 *   records both parents so history is preserved.
 * - 'theirs': replay all source events after target events.
 * - 'manual': same as 'theirs' — the caller is expected to have already
 *   resolved conflicts on the source branch before merging.
 *
 * Returns the merge commit on the target branch.
 */
export async function mergeBranches(
  repo: MatrixRepository,
  sourceBranch: string,
  targetBranch: string,
  strategy: MergeStrategy,
  author: string,
  comment?: string,
): Promise<Commit> {
  const sourceRef = await repo.refs.getRef(sourceBranch);
  const targetRef = await repo.refs.getRef(targetBranch);

  if (!sourceRef) throw new Error(`Branch '${sourceBranch}' does not exist`);
  if (!targetRef) throw new Error(`Branch '${targetBranch}' does not exist`);

  // Collect events that are unique to source (not already in target)
  const targetEventIds = new Set(await collectEventIds(targetRef.commitId, repo.objects));
  const sourceEventIds = await collectEventIds(sourceRef.commitId, repo.objects);
  const newEventIds = sourceEventIds.filter((id) => !targetEventIds.has(id));

  let mergeEventIds: string[];

  switch (strategy) {
    case 'ours':
      // Keep target as-is — no new events, just record the merge
      mergeEventIds = [];
      break;
    case 'theirs':
    case 'manual':
      // Include source-only events in the merge commit
      mergeEventIds = newEventIds;
      break;
  }

  // Ensure all merge events are in the object store
  // (they should already be there from the source branch)

  const mergeCommit: Commit = {
    id: makeCommitId(),
    parentIds: [targetRef.commitId, sourceRef.commitId],
    eventIds: mergeEventIds,
    author,
    timestamp: Date.now(),
    comment: comment ?? `Merge '${sourceBranch}' into '${targetBranch}'`,
  };

  await repo.objects.putCommit(mergeCommit);
  await repo.refs.putRef({ name: targetBranch, commitId: mergeCommit.id, type: 'branch' });

  return mergeCommit;
}
