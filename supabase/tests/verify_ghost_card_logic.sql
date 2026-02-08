BEGIN;

DO $$
DECLARE
  v_org_id uuid;
  v_market_id uuid;
  v_template_id uuid;
  v_version_id uuid;
  v_mandatory_task_id uuid;
  v_optional_task_id uuid;
  v_count integer;
  v_market_task_origin uuid;
BEGIN
  -- 1. Setup Data
  -- Create Organization
  INSERT INTO public.organizations (name) VALUES ('Test Org') RETURNING id INTO v_org_id;

  -- Create Market
  INSERT INTO public.markets (name, org_id) VALUES ('Test Market', v_org_id) RETURNING id INTO v_market_id;

  -- Create Template
  INSERT INTO public.templates (name, owner_org_id) VALUES ('Test Template', v_org_id) RETURNING id INTO v_template_id;

  -- Create Template Version (DRAFT first to allow adding tasks)
  INSERT INTO public.template_versions (template_id, version_string, status) VALUES (v_template_id, '1.0.0', 'DRAFT') RETURNING id INTO v_version_id;

  -- Create Mandatory Task
  INSERT INTO public.template_tasks (template_version_id, title, is_optional, weight, task_type)
  VALUES (v_version_id, 'Mandatory Task', false, 1, 'A')
  RETURNING id INTO v_mandatory_task_id;

  -- Create Optional Task
  INSERT INTO public.template_tasks (template_version_id, title, is_optional, weight, task_type)
  VALUES (v_version_id, 'Optional Task', true, 2, 'A')
  RETURNING id INTO v_optional_task_id;

  -- Publish Version (Optional step, but good practice as logic might depend on it in future, though current deploy_strategy doesn't check status)
  UPDATE public.template_versions SET status = 'PUBLISHED' WHERE id = v_version_id;

  -- 2. Call deploy_strategy
  PERFORM public.deploy_strategy(v_market_id, v_version_id);

  -- 3. Verify Ghost Card Logic (Count = 1)
  SELECT count(*) INTO v_count FROM public.market_tasks WHERE market_id = v_market_id;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'Ghost Card Logic Failure: Expected 1 market task, found %', v_count;
  END IF;

  -- 4. Verify Lineage
  SELECT origin_template_task_id INTO v_market_task_origin FROM public.market_tasks WHERE market_id = v_market_id LIMIT 1;

  IF v_market_task_origin != v_mandatory_task_id THEN
    RAISE EXCEPTION 'Lineage Failure: Market task origin (%) does not match mandatory task (%)', v_market_task_origin, v_mandatory_task_id;
  END IF;

  RAISE NOTICE 'Ghost Card Logic and Lineage Verified.';

  -- 5. Verify Idempotency
  PERFORM public.deploy_strategy(v_market_id, v_version_id);

  SELECT count(*) INTO v_count FROM public.market_tasks WHERE market_id = v_market_id;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'Idempotency Failure: Expected 1 market task after re-deployment, found %', v_count;
  END IF;

  RAISE NOTICE 'Idempotency Verified.';

END $$;

ROLLBACK;
