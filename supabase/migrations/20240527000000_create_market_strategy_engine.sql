-- Create Market Strategies Table
create table public.market_strategies (
  id uuid not null default gen_random_uuid() primary key,
  market_id uuid not null references public.markets(id) on delete cascade,
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  deployed_at timestamptz not null default now(),
  constraint market_strategies_unique_deployment unique (market_id, template_version_id)
);

-- Create Market Tasks Table
create table public.market_tasks (
  id uuid not null default gen_random_uuid() primary key,
  market_id uuid not null references public.markets(id) on delete cascade,
  origin_template_task_id uuid not null references public.template_tasks(id) on delete cascade,
  status text not null default 'TODO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_tasks_lineage_key unique (market_id, origin_template_task_id)
);

-- Indexes
create index market_strategies_market_id_idx on public.market_strategies(market_id);
create index market_tasks_market_id_idx on public.market_tasks(market_id);

-- Enable RLS
alter table public.market_strategies enable row level security;
alter table public.market_tasks enable row level security;

-- RLS Policies

-- Market Strategies Policies
create policy "Users can view market strategies for their organization"
on public.market_strategies for select
to authenticated
using (
  exists (
    select 1 from public.markets m
    where m.id = market_strategies.market_id
    and m.org_id = public.get_my_org_id()
  )
);

create policy "Users can insert market strategies for their organization"
on public.market_strategies for insert
to authenticated
with check (
  exists (
    select 1 from public.markets m
    where m.id = market_strategies.market_id
    and m.org_id = public.get_my_org_id()
  )
);

create policy "Users can update market strategies for their organization"
on public.market_strategies for update
to authenticated
using (
  exists (
    select 1 from public.markets m
    where m.id = market_strategies.market_id
    and m.org_id = public.get_my_org_id()
  )
);

create policy "Users can delete market strategies for their organization"
on public.market_strategies for delete
to authenticated
using (
  exists (
    select 1 from public.markets m
    where m.id = market_strategies.market_id
    and m.org_id = public.get_my_org_id()
  )
);

-- Market Tasks Policies
create policy "Users can view market tasks for their organization"
on public.market_tasks for select
to authenticated
using (
  exists (
    select 1 from public.markets m
    where m.id = market_tasks.market_id
    and m.org_id = public.get_my_org_id()
  )
);

create policy "Users can insert market tasks for their organization"
on public.market_tasks for insert
to authenticated
with check (
  exists (
    select 1 from public.markets m
    where m.id = market_tasks.market_id
    and m.org_id = public.get_my_org_id()
  )
);

create policy "Users can update market tasks for their organization"
on public.market_tasks for update
to authenticated
using (
  exists (
    select 1 from public.markets m
    where m.id = market_tasks.market_id
    and m.org_id = public.get_my_org_id()
  )
);

create policy "Users can delete market tasks for their organization"
on public.market_tasks for delete
to authenticated
using (
  exists (
    select 1 from public.markets m
    where m.id = market_tasks.market_id
    and m.org_id = public.get_my_org_id()
  )
);


-- Deploy Strategy Function
create or replace function public.deploy_strategy(p_market_id uuid, p_version_id uuid)
returns void
language plpgsql
as $$
begin
  -- 1. Upsert into market_strategies
  insert into public.market_strategies (market_id, template_version_id, deployed_at)
  values (p_market_id, p_version_id, now())
  on conflict (market_id, template_version_id)
  do update set deployed_at = now();

  -- 2. Bulk Insert into market_tasks
  -- Only insert if is_optional is FALSE (Ghost Card Rule)
  -- Use ON CONFLICT DO NOTHING to ensure idempotency (don't overwrite existing status)
  insert into public.market_tasks (market_id, origin_template_task_id, status)
  select
    p_market_id,
    tt.id,
    'TODO'
  from
    public.template_tasks tt
  where
    tt.template_version_id = p_version_id
    and tt.is_optional = false
  on conflict (market_id, origin_template_task_id)
  do nothing;

end;
$$;
