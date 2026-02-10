-- Migration: Create Integrity Scoring Engine

-- 1. Create Market Scores Table
create table public.market_scores (
  market_id uuid not null primary key references public.markets(id) on delete cascade,
  integrity_score numeric not null default 0,
  last_updated_at timestamptz not null default now()
);

-- RLS for market_scores
alter table public.market_scores enable row level security;

create policy "Users can view market scores for their organization"
on public.market_scores for select
to authenticated
using (
  exists (
    select 1 from public.markets m
    where m.id = market_scores.market_id
    and m.org_id = public.get_my_org_id()
  )
);

-- 2. Create Function to Calculate Market Score
create or replace function public.calculate_market_score(p_market_id uuid)
returns void
language plpgsql
security definer -- Needs to read all tasks and update scores, bypassing RLS if necessary (though usually invoked by trigger)
set search_path = public
as $$
declare
  v_total_weight numeric;
  v_completed_weight numeric;
  v_score numeric;
begin
  -- Calculate Total Weight of Global Tasks (origin is not null)
  select
    coalesce(sum(tt.weight), 0)
  into
    v_total_weight
  from
    public.market_tasks mt
    join public.template_tasks tt on mt.origin_template_task_id = tt.id
  where
    mt.market_id = p_market_id
    and mt.origin_template_task_id is not null; -- Explicitly ensure it's a global task

  -- Calculate Completed Weight of Global Tasks
  select
    coalesce(sum(tt.weight), 0)
  into
    v_completed_weight
  from
    public.market_tasks mt
    join public.template_tasks tt on mt.origin_template_task_id = tt.id
  where
    mt.market_id = p_market_id
    and mt.origin_template_task_id is not null
    and mt.status = 'DONE'; -- DRIFTED tasks are not DONE, so they are excluded

  -- Calculate Score
  if v_total_weight = 0 then
    v_score := 0;
  else
    v_score := (v_completed_weight / v_total_weight) * 100;
  end if;

  -- Upsert into market_scores
  insert into public.market_scores (market_id, integrity_score, last_updated_at)
  values (p_market_id, v_score, now())
  on conflict (market_id)
  do update set
    integrity_score = EXCLUDED.integrity_score,
    last_updated_at = EXCLUDED.last_updated_at;

end;
$$;

-- 3. Create Trigger Function
create or replace function public.trigger_calculate_market_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'DELETE') then
    perform public.calculate_market_score(OLD.market_id);
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    perform public.calculate_market_score(NEW.market_id);
    -- Handle case where market_id changes (though unlikely)
    if (OLD.market_id is distinct from NEW.market_id) then
        perform public.calculate_market_score(OLD.market_id);
    end if;
    return NEW;
  elsif (TG_OP = 'INSERT') then
    perform public.calculate_market_score(NEW.market_id);
    return NEW;
  end if;
  return null;
end;
$$;

-- 4. Create Trigger
create trigger on_market_task_change
after insert or delete or update of status, origin_template_task_id, market_id on public.market_tasks
for each row
execute function public.trigger_calculate_market_score();

-- 5. Backfill existing markets
do $$
declare
  m record;
begin
  for m in select id from public.markets loop
    perform public.calculate_market_score(m.id);
  end loop;
end;
$$;
