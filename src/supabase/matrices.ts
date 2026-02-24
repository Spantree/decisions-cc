import { supabase } from './client';

export interface Matrix {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export async function listMatrices(): Promise<Matrix[]> {
  const { data, error } = await supabase
    .from('matrices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Matrix[];
}

export async function createMatrix(
  title: string,
  description = '',
): Promise<Matrix> {
  const { data, error } = await supabase
    .from('matrices')
    .insert({ title, description })
    .select()
    .single();

  if (error) throw error;
  return data as Matrix;
}

export async function updateMatrix(
  id: string,
  fields: Partial<Pick<Matrix, 'title' | 'description'>>,
): Promise<Matrix> {
  const { data, error } = await supabase
    .from('matrices')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Matrix;
}

export async function deleteMatrix(id: string): Promise<void> {
  const { error } = await supabase.from('matrices').delete().eq('id', id);

  if (error) throw error;
}
