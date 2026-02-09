-- Create Snapshots Table
create table if not exists public.snapshots (
    id uuid not null default gen_random_uuid() primary key,
    market_id uuid not null references public.markets(id) on delete cascade,
    task_id uuid not null references public.market_tasks(id) on delete cascade,
    resource_type text not null, -- e.g., 'GTM_TAG', 'GTM_TRIGGER'
    resource_id text not null, -- e.g., Tag ID
    content jsonb not null,
    created_at timestamptz not null default now()
);

-- Add result_hash to market_tasks
alter table public.market_tasks
add column if not exists result_hash text;

-- Enable RLS on snapshots
alter table public.snapshots enable row level security;

-- Snapshots Policies

-- View: Authenticated users can view snapshots for their organization
create policy "Users can view snapshots for their organization"
on public.snapshots for select
to authenticated
using (
  exists (
    select 1 from public.markets m
    where m.id = snapshots.market_id
    and m.org_id = public.get_my_org_id()
  )
);

-- Insert: Authenticated users can insert snapshots for their organization
-- (Mainly for testing/admin, as the Edge Function uses service_role)
create policy "Users can insert snapshots for their organization"
on public.snapshots for insert
to authenticated
with check (
  exists (
    select 1 from public.markets m
    where m.id = snapshots.market_id
    and m.org_id = public.get_my_org_id()
  )
);
