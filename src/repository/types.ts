import type { PughEvent } from '../events/types';
import type { PughDomainState } from '../store/types';

/** A commit bundles events with parent pointer(s), forming a DAG. */
export interface Commit {
  id: string;
  parentIds: string[];
  eventIds: string[];
  author: string;
  timestamp: number;
  comment?: string;
}

/** A named pointer to a commit (branch or tag). */
export interface Ref {
  name: string;
  commitId: string;
  type: 'branch' | 'tag';
}

/** Content-addressable store for events and commits. */
export interface ObjectStore {
  getEvent(id: string): Promise<PughEvent | undefined>;
  putEvent(event: PughEvent): Promise<void>;
  getCommit(id: string): Promise<Commit | undefined>;
  putCommit(commit: Commit): Promise<void>;
  getEvents(ids: string[]): Promise<PughEvent[]>;
}

/** Store for named refs (branches and tags). */
export interface RefStore {
  getRef(name: string): Promise<Ref | undefined>;
  putRef(ref: Ref): Promise<void>;
  deleteRef(name: string): Promise<void>;
  listRefs(): Promise<Ref[]>;
}

export type MergeStrategy = 'ours' | 'theirs' | 'manual';

/** Describes differences between two branches. */
export interface BranchDiff {
  commonAncestorId: string | null;
  sourceBranch: string;
  targetBranch: string;
  sourceEvents: PughEvent[];
  targetEvents: PughEvent[];
  sourceState: PughDomainState;
  targetState: PughDomainState;
}

/** Backend-agnostic repository for managing a matrix's commit history. */
export interface MatrixRepository {
  objects: ObjectStore;
  refs: RefStore;

  /** Create a commit from events on the given branch. Returns the new commit. */
  commit(branchName: string, events: PughEvent[], author: string, comment?: string): Promise<Commit>;

  /** Checkout a branch: walk commits, collect events, return them in order. */
  checkout(branchName: string): Promise<PughEvent[]>;

  /** Return the commit log for a branch (reverse-chrono order). */
  log(branchName: string, limit?: number): Promise<Commit[]>;

  /** Fork a new branch from an existing branch. */
  fork(newBranchName: string, sourceBranchName: string): Promise<Ref>;

  /** Compute diff between two branches. */
  diff(sourceBranch: string, targetBranch: string): Promise<BranchDiff>;

  /** Merge source branch into target branch using the given strategy. */
  merge(sourceBranch: string, targetBranch: string, strategy: MergeStrategy, author: string, comment?: string): Promise<Commit>;
}
