-- Create Task Activity Logs Table
create table public.task_activity_logs (
  id uuid not null default gen_random_uuid() primary key,
  market_task_id uuid not null references public.market_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  previous_status text,
  new_status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index
create index task_activity_logs_market_task_id_idx on public.task_activity_logs(market_task_id);

-- Enable RLS
alter table public.task_activity_logs enable row level security;

-- Policies

-- Allow users to view logs if they belong to the same organization as the market task
create policy "Users can view logs for their organization"
on public.task_activity_logs for select
to authenticated
using (
  exists (
    select 1 from public.market_tasks mt
    join public.markets m on m.id = mt.market_id
    where mt.id = task_activity_logs.market_task_id
    and m.org_id = public.get_my_org_id()
  )
);

-- Allow users to insert logs if they belong to the same organization as the market task
create policy "Users can insert logs for their organization"
on public.task_activity_logs for insert
to authenticated
with check (
  exists (
    select 1 from public.market_tasks mt
    join public.markets m on m.id = mt.market_id
    where mt.id = task_activity_logs.market_task_id
    and m.org_id = public.get_my_org_id()
  )
);
