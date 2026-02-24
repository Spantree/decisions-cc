create table if not exists public.matrices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.matrices enable row level security;

create policy "Allow anonymous read access"
  on public.matrices for select
  using (true);

create policy "Allow anonymous insert access"
  on public.matrices for insert
  with check (true);

create policy "Allow anonymous update access"
  on public.matrices for update
  using (true)
  with check (true);

create policy "Allow anonymous delete access"
  on public.matrices for delete
  using (true);
