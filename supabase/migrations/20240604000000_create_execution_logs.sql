-- Create Execution Logs Table
create table public.execution_logs (
    id uuid not null default gen_random_uuid() primary key,
    task_id uuid not null references public.market_tasks(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    snapshot_id uuid references public.snapshots(id) on delete set null,
    status text not null,
    payload jsonb not null,
    created_at timestamptz not null default now()
);

-- Indexes
create index execution_logs_task_id_idx on public.execution_logs(task_id);
create index execution_logs_user_id_idx on public.execution_logs(user_id);
create index execution_logs_snapshot_id_idx on public.execution_logs(snapshot_id);

-- Enable RLS
alter table public.execution_logs enable row level security;

-- Policies

-- Allow users to view logs if they belong to the same organization as the market task
create policy "Users can view execution logs for their organization"
on public.execution_logs for select
to authenticated
using (
  exists (
    select 1 from public.market_tasks mt
    join public.markets m on m.id = mt.market_id
    where mt.id = execution_logs.task_id
    and m.org_id = public.get_my_org_id()
  )
);

-- Allow users to insert logs if they belong to the same organization as the market task
-- And enforce that the user_id matches the authenticated user
create policy "Users can insert execution logs for their organization"
on public.execution_logs for insert
to authenticated
with check (
  exists (
    select 1 from public.market_tasks mt
    join public.markets m on m.id = mt.market_id
    where mt.id = execution_logs.task_id
    and m.org_id = public.get_my_org_id()
  )
  and user_id = auth.uid()
);
