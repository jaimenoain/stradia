-- Migration: Allow Local Tasks

-- 1. Alter market_tasks table
alter table public.market_tasks
  alter column origin_template_task_id drop not null;

alter table public.market_tasks
  add column if not exists title text;

alter table public.market_tasks
  add column if not exists description text;

alter table public.market_tasks
  add column if not exists task_type text default 'A';

-- 2. Update get_market_board RPC
create or replace function public.get_market_board(target_market_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  result jsonb;
begin
  with active_strategy as (
    select template_version_id, market_id
    from public.market_strategies
    where market_id = target_market_id
    order by deployed_at desc
    limit 1
  ),
  template_based_tasks as (
    select
      case
        when mt.id is not null then mt.id::text
        else 'temp_' || tt.id::text
      end as id,
      coalesce(mt.status, 'GHOST') as status,
      (mt.id is null) as is_ghost,
      tt.title,
      tt.description,
      tt.task_type,
      tt.id as origin_template_task_id,
      tt.weight,
      tt.is_optional,
      tt.task_config,
      tt.created_at
    from active_strategy ms
    join public.template_versions tv on tv.id = ms.template_version_id
    join public.template_tasks tt on tt.template_version_id = tv.id
    left join public.market_tasks mt on mt.origin_template_task_id = tt.id and mt.market_id = ms.market_id
  ),
  local_tasks as (
    select
      mt.id::text as id,
      mt.status,
      false as is_ghost,
      mt.title,
      mt.description,
      mt.task_type,
      null as origin_template_task_id,
      0 as weight,
      false as is_optional,
      '{}'::jsonb as task_config,
      mt.created_at
    from public.market_tasks mt
    where mt.market_id = target_market_id
    and mt.origin_template_task_id is null
  )
  select jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'status', t.status,
      'is_ghost', t.is_ghost,
      'title', t.title,
      'description', t.description,
      'task_type', t.task_type,
      'origin_template_task_id', t.origin_template_task_id,
      'weight', t.weight,
      'is_optional', t.is_optional,
      'task_config', t.task_config
    ) order by t.weight asc, t.created_at asc
  ) into result
  from (
    select * from template_based_tasks
    union all
    select * from local_tasks
  ) t;

  return coalesce(result, '[]'::jsonb);
end;
$$;
