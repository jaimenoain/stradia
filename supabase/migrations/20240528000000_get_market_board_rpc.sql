create or replace function public.get_market_board(target_market_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  result jsonb;
begin
  -- Logic:
  -- 1. Identify active strategies (market_strategies) for the market.
  --    We pick the latest deployed strategy based on deployed_at.
  -- 2. Fetch all template_tasks for that version.
  -- 3. Left join market_tasks on origin_template_task_id and market_id.
  -- 4. Construct JSON with Ghost Card logic.

  select jsonb_agg(
    jsonb_build_object(
      'id', case
              when mt.id is not null then mt.id::text
              else 'temp_' || tt.id::text
            end,
      'status', coalesce(mt.status, 'GHOST'),
      'is_ghost', (mt.id is null),
      'title', tt.title,
      'description', tt.description,
      'task_type', tt.task_type,
      'origin_template_task_id', tt.id,
      'weight', tt.weight,
      'is_optional', tt.is_optional,
      'task_config', tt.task_config
    ) order by tt.weight asc, tt.created_at asc
  ) into result
  from (
    select template_version_id, market_id
    from public.market_strategies
    where market_id = target_market_id
    order by deployed_at desc
    limit 1
  ) ms
  join public.template_versions tv on tv.id = ms.template_version_id
  join public.template_tasks tt on tt.template_version_id = tv.id
  left join public.market_tasks mt on mt.origin_template_task_id = tt.id and mt.market_id = ms.market_id;

  return coalesce(result, '[]'::jsonb);
end;
$$;
