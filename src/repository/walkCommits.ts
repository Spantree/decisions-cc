import type { Commit, ObjectStore } from './types';

/**
 * Walk the commit DAG starting from `commitId`, returning commits
 * in reverse-chronological order (newest first).
 *
 * Uses BFS with deduplication to handle merge commits (multiple parents).
 */
export async function walkCommits(
  commitId: string,
  objects: ObjectStore,
  limit?: number,
): Promise<Commit[]> {
  const visited = new Set<string>();
  const result: Commit[] = [];
  const queue: string[] = [commitId];

  while (queue.length > 0) {
    if (limit !== undefined && result.length >= limit) break;

    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const commit = await objects.getCommit(id);
    if (!commit) continue;

    result.push(commit);

    for (const parentId of commit.parentIds) {
      if (!visited.has(parentId)) {
        queue.push(parentId);
      }
    }
  }

  // Sort by timestamp descending (reverse-chrono)
  result.sort((a, b) => b.timestamp - a.timestamp);

  if (limit !== undefined) {
    return result.slice(0, limit);
  }
  return result;
}

/**
 * Collect all event IDs from a commit chain in chronological order.
 *
 * Performs a topological walk of the DAG, deduplicating shared ancestors
 * (important for merge commits), then returns event IDs in the order
 * they should be replayed.
 */
export async function collectEventIds(
  commitId: string,
  objects: ObjectStore,
): Promise<string[]> {
  // Walk all commits (no limit), then reverse to chronological order
  const commits = await walkCommits(commitId, objects);
  // Reverse to chronological (oldest first)
  commits.reverse();

  const seen = new Set<string>();
  const eventIds: string[] = [];

  for (const commit of commits) {
    for (const eid of commit.eventIds) {
      if (!seen.has(eid)) {
        seen.add(eid);
        eventIds.push(eid);
      }
    }
  }

  return eventIds;
}
