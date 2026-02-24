import { supabase } from '../../supabase/client';
import type { Ref, RefStore } from '../types';

export function createSupabaseRefStore(matrixId: string): RefStore {
  return {
    async putRef(ref: Ref) {
      const { error } = await supabase.from('refs').upsert({
        matrix_id: matrixId,
        name: ref.name,
        commit_id: ref.commitId,
        type: ref.type,
      });
      if (error) throw error;
    },

    async getRef(name: string) {
      const { data, error } = await supabase
        .from('refs')
        .select('*')
        .eq('matrix_id', matrixId)
        .eq('name', name)
        .maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      return {
        name: data.name as string,
        commitId: data.commit_id as string,
        type: data.type as 'branch' | 'tag',
      };
    },

    async deleteRef(name: string) {
      const { error } = await supabase
        .from('refs')
        .delete()
        .eq('matrix_id', matrixId)
        .eq('name', name);
      if (error) throw error;
    },

    async listRefs() {
      const { data, error } = await supabase
        .from('refs')
        .select('*')
        .eq('matrix_id', matrixId);
      if (error) throw error;
      return (data ?? []).map(
        (row: { name: string; commit_id: string; type: string }) => ({
          name: row.name,
          commitId: row.commit_id,
          type: row.type as 'branch' | 'tag',
        }),
      );
    },
  };
}
