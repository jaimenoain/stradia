-- Migration to automatically assign org_id to the owner's profile upon organization creation

create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Automatically update the profile of the organization owner
  if new.owner_id is not null then
    update public.profiles
    set org_id = new.id
    where user_id = new.owner_id;
  end if;
  return new;
end;
$$;

-- Safely create the trigger only if the table exists
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'organizations') then
    drop trigger if exists on_organization_created on public.organizations;
    create trigger on_organization_created
      after insert on public.organizations
      for each row execute procedure public.handle_new_organization();
  end if;
end
$$;
