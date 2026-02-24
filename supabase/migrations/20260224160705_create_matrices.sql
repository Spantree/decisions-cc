-- Event-sourced tables for the Pugh Decision Matrix repository layer.
-- Three tables mirror the git-like ObjectStore + RefStore architecture.

-- ── events ─────────────────────────────────────────────────────────
-- Each row stores a single PughEvent as JSONB.
create table if not exists public.events (
  id text primary key,
  matrix_id uuid not null,
  payload jsonb not null
);

create index idx_events_matrix_id on public.events (matrix_id);

alter table public.events enable row level security;

create policy "anon select events" on public.events for select using (true);
create policy "anon insert events" on public.events for insert with check (true);
create policy "anon update events" on public.events for update using (true) with check (true);
create policy "anon delete events" on public.events for delete using (true);

-- ── commits ────────────────────────────────────────────────────────
-- Each row stores a commit node in the DAG.
create table if not exists public.commits (
  id text primary key,
  matrix_id uuid not null,
  parent_ids text[] not null default '{}',
  event_ids text[] not null default '{}',
  author text not null,
  timestamp bigint not null,
  comment text
);

create index idx_commits_matrix_id on public.commits (matrix_id);

alter table public.commits enable row level security;

create policy "anon select commits" on public.commits for select using (true);
create policy "anon insert commits" on public.commits for insert with check (true);
create policy "anon update commits" on public.commits for update using (true) with check (true);
create policy "anon delete commits" on public.commits for delete using (true);

-- ── refs ───────────────────────────────────────────────────────────
-- Named pointers (branches / tags) to commits, scoped per matrix.
create table if not exists public.refs (
  matrix_id uuid not null,
  name text not null,
  commit_id text not null,
  type text not null default 'branch',
  primary key (matrix_id, name)
);

alter table public.refs enable row level security;

create policy "anon select refs" on public.refs for select using (true);
create policy "anon insert refs" on public.refs for insert with check (true);
create policy "anon update refs" on public.refs for update using (true) with check (true);
create policy "anon delete refs" on public.refs for delete using (true);
