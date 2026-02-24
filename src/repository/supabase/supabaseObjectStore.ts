import { supabase } from '../../supabase/client';
import type { PughEvent } from '../../events/types';
import type { Commit, ObjectStore } from '../types';

export function createSupabaseObjectStore(matrixId: string): ObjectStore {
  return {
    async putEvent(event: PughEvent) {
      const { error } = await supabase
        .from('events')
        .upsert({ id: event.id, matrix_id: matrixId, payload: event });
      if (error) throw error;
    },

    async getEvent(id: string) {
      const { data, error } = await supabase
        .from('events')
        .select('payload')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data?.payload as PughEvent) ?? undefined;
    },

    async getEvents(ids: string[]) {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('events')
        .select('id, payload')
        .in('id', ids);
      if (error) throw error;

      // Preserve input order
      const byId = new Map(
        (data ?? []).map((row: { id: string; payload: unknown }) => [row.id, row.payload as PughEvent]),
      );
      const result: PughEvent[] = [];
      for (const id of ids) {
        const event = byId.get(id);
        if (event) result.push(event);
      }
      return result;
    },

    async putCommit(commit: Commit) {
      const { error } = await supabase.from('commits').upsert({
        id: commit.id,
        matrix_id: matrixId,
        parent_ids: commit.parentIds,
        event_ids: commit.eventIds,
        author: commit.author,
        timestamp: commit.timestamp,
        comment: commit.comment ?? null,
      });
      if (error) throw error;
    },

    async getCommit(id: string) {
      const { data, error } = await supabase
        .from('commits')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      return {
        id: data.id as string,
        parentIds: data.parent_ids as string[],
        eventIds: data.event_ids as string[],
        author: data.author as string,
        timestamp: data.timestamp as number,
        comment: (data.comment as string) ?? undefined,
      };
    },
  };
}
