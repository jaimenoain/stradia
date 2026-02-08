-- Create Template Engine Tables

-- Templates Table
create table public.templates (
  id uuid not null default gen_random_uuid() primary key,
  owner_org_id uuid references public.organizations(id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Template Versions Table
create table public.template_versions (
  id uuid not null default gen_random_uuid() primary key,
  template_id uuid not null references public.templates(id) on delete cascade,
  version_string text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  changelog text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_versions_template_id_version_string_key unique (template_id, version_string)
);

-- Template Tasks Table
create table public.template_tasks (
  id uuid not null default gen_random_uuid() primary key,
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  title text not null,
  description text,
  task_type text not null check (task_type in ('A', 'B', 'C')),
  weight integer not null default 1,
  is_optional boolean not null default false,
  task_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index templates_owner_org_id_idx on public.templates(owner_org_id);
create index template_versions_template_id_idx on public.template_versions(template_id);
create index template_tasks_template_version_id_idx on public.template_tasks(template_version_id);

-- Enable RLS
alter table public.templates enable row level security;
alter table public.template_versions enable row level security;
alter table public.template_tasks enable row level security;

-- Immutability Functions and Triggers

-- Function to check version immutability
create or replace function public.check_version_immutability()
returns trigger as $$
begin
  -- Prevent updates or deletion if the version is PUBLISHED
  if old.status = 'PUBLISHED' then
    raise exception 'Cannot update or delete a PUBLISHED template version.';
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger for template_versions
create trigger enforce_version_immutability
before update or delete on public.template_versions
for each row execute function public.check_version_immutability();

-- Function to check task immutability based on parent version status
create or replace function public.check_task_immutability()
returns trigger as $$
declare
  v_status text;
begin
  -- Check OLD parent for DELETE and UPDATE
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
    select status into v_status from public.template_versions where id = old.template_version_id;
    if v_status = 'PUBLISHED' then
      raise exception 'Cannot modify tasks for a PUBLISHED template version.';
    end if;
  end if;

  -- Check NEW parent for INSERT and UPDATE
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    select status into v_status from public.template_versions where id = new.template_version_id;
    if v_status = 'PUBLISHED' then
      raise exception 'Cannot add or modify tasks for a PUBLISHED template version.';
    end if;
  end if;

  if (TG_OP = 'DELETE') then
      return old;
  else
      return new;
  end if;
end;
$$ language plpgsql;

-- Trigger for template_tasks
create trigger enforce_task_immutability
before insert or update or delete on public.template_tasks
for each row execute function public.check_task_immutability();
