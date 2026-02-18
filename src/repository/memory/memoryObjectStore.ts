import type { PughEvent } from '../../events/types';
import type { Commit, ObjectStore } from '../types';

export function createMemoryObjectStore(): ObjectStore {
  const events = new Map<string, PughEvent>();
  const commits = new Map<string, Commit>();

  return {
    async getEvent(id: string) {
      return events.get(id);
    },

    async putEvent(event: PughEvent) {
      events.set(event.id, event);
    },

    async getCommit(id: string) {
      return commits.get(id);
    },

    async putCommit(commit: Commit) {
      commits.set(commit.id, commit);
    },

    async getEvents(ids: string[]) {
      const result: PughEvent[] = [];
      for (const id of ids) {
        const event = events.get(id);
        if (event) result.push(event);
      }
      return result;
    },
  };
}
