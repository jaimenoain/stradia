-- Fix for Organization RLS Visibility
-- Add owner_id to organizations to allow creators to see their orgs before joining

-- Add owner_id column
alter table public.organizations add column if not exists owner_id uuid references auth.users(id);

-- Update SELECT policy
drop policy if exists "Users can view their own organization" on public.organizations;
create policy "Users can view their own organization"
on public.organizations for select
to authenticated
using (id = get_my_org_id() or owner_id = auth.uid());

-- Update UPDATE policy
drop policy if exists "Users can update their own organization" on public.organizations;
create policy "Users can update their own organization"
on public.organizations for update
to authenticated
using (id = get_my_org_id() or owner_id = auth.uid());
