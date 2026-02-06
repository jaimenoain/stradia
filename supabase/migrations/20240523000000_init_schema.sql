-- Create tables
create table public.organizations (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.markets (
  id uuid not null default gen_random_uuid() primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  region_code text,
  currency text
);

create table public.profiles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  role text,
  constraint profiles_user_id_key unique (user_id)
);

-- Indexes for performance
create index markets_org_id_idx on public.markets(org_id);
create index profiles_org_id_idx on public.profiles(org_id);

-- RLS
alter table public.organizations enable row level security;
alter table public.markets enable row level security;
alter table public.profiles enable row level security;

-- Helper function to avoid RLS recursion and standardize org lookup
-- Security Definer allows it to bypass RLS on profiles table
create or replace function public.get_my_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where user_id = auth.uid();
$$;

-- Policies for Organizations
create policy "Users can create organizations"
on public.organizations for insert
to authenticated
with check (true);

create policy "Users can view their own organization"
on public.organizations for select
to authenticated
using (id = get_my_org_id());

create policy "Users can update their own organization"
on public.organizations for update
to authenticated
using (id = get_my_org_id());

-- Policies for Markets
create policy "Users can view markets of their organization"
on public.markets for select
to authenticated
using (org_id = get_my_org_id());

create policy "Users can insert markets for their organization"
on public.markets for insert
to authenticated
with check (org_id = get_my_org_id());

create policy "Users can update markets of their organization"
on public.markets for update
to authenticated
using (org_id = get_my_org_id());

-- Policies for Profiles
-- Allow users to view their own profile
create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (user_id = auth.uid());

-- Allow users to view profiles in their same organization
create policy "Users can view profiles in their organization"
on public.profiles for select
to authenticated
using (org_id = get_my_org_id());

-- Allow users to update their own profile (e.g. to set org_id or name)
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (user_id = auth.uid());

-- Trigger for new user creation
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
