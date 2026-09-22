create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  external_account_id text,
  status text not null default 'connected',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, external_account_id)
);

alter table public.integrations enable row level security;

drop policy if exists "members can read integrations" on public.integrations;
create policy "members can read integrations" on public.integrations
for select using (
  exists (
    select 1 from public.memberships
    where memberships.workspace_id = integrations.workspace_id
      and memberships.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('event-sources', 'event-sources', false)
on conflict (id) do update set public = false;
