create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'planner', 'viewer');
create type public.source_kind as enum ('manual', 'gmail', 'google_drive', 'google_calendar', 'file');
create type public.change_status as enum ('candidate', 'confirmed', 'dismissed');
create type public.impact_status as enum ('suggested', 'accepted', 'dismissed', 'resolved');
create type public.task_status as enum ('todo', 'doing', 'done');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'planner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  attendee_count integer check (attendee_count >= 0),
  status text not null default 'planning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind public.source_kind not null,
  external_id text,
  title text not null,
  uri text,
  content_text text,
  metadata jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, kind, external_id)
);

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null,
  name text not null,
  attributes jsonb not null default '{}'::jsonb,
  source_id uuid references public.sources(id) on delete set null,
  confidence numeric(4,3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  from_entity_id uuid not null references public.entities(id) on delete cascade,
  to_entity_id uuid not null references public.entities(id) on delete cascade,
  relation text not null,
  source_id uuid references public.sources(id) on delete set null,
  confidence numeric(4,3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique (from_entity_id, to_entity_id, relation)
);

create table public.changes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  entity_id uuid references public.entities(id) on delete set null,
  kind text not null,
  summary text not null,
  before_value jsonb,
  after_value jsonb not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  status public.change_status not null default 'candidate',
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.impacts (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references public.changes(id) on delete cascade,
  affected_entity_id uuid references public.entities(id) on delete set null,
  area text not null,
  title text not null,
  explanation text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  evidence jsonb not null default '[]'::jsonb,
  status public.impact_status not null default 'suggested',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  impact_id uuid references public.impacts(id) on delete set null,
  title text not null,
  status public.task_status not null default 'todo',
  assigned_to uuid references auth.users(id),
  due_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entities_event_idx on public.entities(event_id);
create index relationships_event_idx on public.relationships(event_id);
create index relationships_from_idx on public.relationships(from_entity_id);
create index relationships_to_idx on public.relationships(to_entity_id);
create index sources_event_observed_idx on public.sources(event_id, observed_at desc);
create index changes_event_created_idx on public.changes(event_id, created_at desc);
create index impacts_change_idx on public.impacts(change_id);
create index tasks_event_status_idx on public.tasks(event_id, status);

create or replace function public.add_workspace_owner()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.memberships (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger add_workspace_owner_after_insert
after insert on public.workspaces
for each row execute function public.add_workspace_owner();

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.memberships where workspace_id = target_workspace and user_id = auth.uid()) $$;

create or replace function public.can_access_event(target_event uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.events e where e.id = target_event and public.is_workspace_member(e.workspace_id)) $$;

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.events enable row level security;
alter table public.sources enable row level security;
alter table public.entities enable row level security;
alter table public.relationships enable row level security;
alter table public.changes enable row level security;
alter table public.impacts enable row level security;
alter table public.tasks enable row level security;

create policy "members read workspaces" on public.workspaces for select using (public.is_workspace_member(id));
create policy "owners create workspaces" on public.workspaces for insert with check (created_by = auth.uid());
create policy "members read memberships" on public.memberships for select using (public.is_workspace_member(workspace_id));
create policy "workspace creator adds self" on public.memberships for insert with check (user_id = auth.uid() and exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = auth.uid()));
create policy "members manage events" on public.events for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members manage sources" on public.sources for all using (public.can_access_event(event_id)) with check (public.can_access_event(event_id));
create policy "members manage entities" on public.entities for all using (public.can_access_event(event_id)) with check (public.can_access_event(event_id));
create policy "members manage relationships" on public.relationships for all using (public.can_access_event(event_id)) with check (public.can_access_event(event_id));
create policy "members manage changes" on public.changes for all using (public.can_access_event(event_id)) with check (public.can_access_event(event_id));
create policy "members manage impacts" on public.impacts for all using (exists (select 1 from public.changes c where c.id = change_id and public.can_access_event(c.event_id))) with check (exists (select 1 from public.changes c where c.id = change_id and public.can_access_event(c.event_id)));
create policy "members manage tasks" on public.tasks for all using (public.can_access_event(event_id)) with check (public.can_access_event(event_id));
