export interface Persister {
  load(key: string): Promise<string | null> | (string | null);
  save(key: string, value: string): Promise<void> | void;
  remove(key: string): Promise<void> | void;
  subscribe?(key: string, cb: (value: string | null) => void): () => void;
}
