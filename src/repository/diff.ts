import type { PughEvent } from '../events/types';
import { projectEvents } from '../events/projection';
import type { BranchDiff, MatrixRepository } from './types';
import { walkCommits, collectEventIds } from './walkCommits';

/**
 * Find the lowest common ancestor (LCA) of two commit tips.
 * Returns the commit ID of the LCA, or null if there is no shared ancestor.
 */
async function findLCA(
  commitIdA: string,
  commitIdB: string,
  objects: MatrixRepository['objects'],
): Promise<string | null> {
  // Collect all ancestor IDs of A
  const ancestorsA = new Set<string>();
  const commitsA = await walkCommits(commitIdA, objects);
  for (const c of commitsA) {
    ancestorsA.add(c.id);
  }

  // Walk B in reverse-chrono order; first match is LCA
  const commitsB = await walkCommits(commitIdB, objects);
  for (const c of commitsB) {
    if (ancestorsA.has(c.id)) {
      return c.id;
    }
  }

  return null;
}

/**
 * Collect events from after a given ancestor commit up to the tip commit.
 * If ancestorId is null, returns all events up to the tip.
 */
async function eventsAfterAncestor(
  tipCommitId: string,
  ancestorId: string | null,
  objects: MatrixRepository['objects'],
): Promise<PughEvent[]> {
  if (!ancestorId) {
    // No shared ancestor — return all events
    const eventIds = await collectEventIds(tipCommitId, objects);
    return objects.getEvents(eventIds);
  }

  // Collect event IDs from ancestor
  const ancestorEventIds = new Set(await collectEventIds(ancestorId, objects));

  // Collect all event IDs up to tip
  const allEventIds = await collectEventIds(tipCommitId, objects);

  // Events unique to this branch (after the ancestor)
  const newEventIds = allEventIds.filter((id) => !ancestorEventIds.has(id));
  return objects.getEvents(newEventIds);
}

export async function diffBranches(
  repo: MatrixRepository,
  sourceBranch: string,
  targetBranch: string,
): Promise<BranchDiff> {
  const sourceRef = await repo.refs.getRef(sourceBranch);
  const targetRef = await repo.refs.getRef(targetBranch);

  if (!sourceRef) throw new Error(`Branch '${sourceBranch}' does not exist`);
  if (!targetRef) throw new Error(`Branch '${targetBranch}' does not exist`);

  const commonAncestorId = await findLCA(sourceRef.commitId, targetRef.commitId, repo.objects);

  const sourceEvents = await eventsAfterAncestor(sourceRef.commitId, commonAncestorId, repo.objects);
  const targetEvents = await eventsAfterAncestor(targetRef.commitId, commonAncestorId, repo.objects);

  // Project full state for each branch
  const allSourceEventIds = await collectEventIds(sourceRef.commitId, repo.objects);
  const allTargetEventIds = await collectEventIds(targetRef.commitId, repo.objects);
  const allSourceEvents = await repo.objects.getEvents(allSourceEventIds);
  const allTargetEvents = await repo.objects.getEvents(allTargetEventIds);

  return {
    commonAncestorId,
    sourceBranch,
    targetBranch,
    sourceEvents,
    targetEvents,
    sourceState: projectEvents(allSourceEvents),
    targetState: projectEvents(allTargetEvents),
  };
}
