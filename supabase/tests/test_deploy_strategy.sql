-- SQL Verification Script for Strategy Deployment Engine

BEGIN;

DO $$
DECLARE
  user_id uuid := gen_random_uuid();
  org_id uuid;
  market_id uuid;
  template_id uuid;
  version_id uuid;
  task_req_id uuid;
  task_opt_id uuid;
  strategy_check record;
  task_check_req record;
  task_check_opt record;
  task_count integer;
  v_status text;
BEGIN
  -- 1. Setup User and Org
  INSERT INTO auth.users (id, email) VALUES (user_id, 'deploy_tester@test.com');
  -- Profile created automatically

  -- Simulate User Session
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Create Org
  INSERT INTO public.organizations (name, owner_id) VALUES ('Test Org', user_id) RETURNING id INTO org_id;
  UPDATE public.profiles SET org_id = org_id WHERE user_id = user_id;

  -- Create Market
  INSERT INTO public.markets (name, org_id) VALUES ('Test Market', org_id) RETURNING id INTO market_id;

  -- Create Template
  INSERT INTO public.templates (owner_org_id, name) VALUES (org_id, 'Test Strategy') RETURNING id INTO template_id;

  -- Create Version
  INSERT INTO public.template_versions (template_id, version_string, status)
  VALUES (template_id, '1.0.0', 'DRAFT') RETURNING id INTO version_id;

  -- Create Tasks
  -- Required Task
  INSERT INTO public.template_tasks (template_version_id, title, task_type, is_optional)
  VALUES (version_id, 'Required Task', 'A', false) RETURNING id INTO task_req_id;

  -- Optional Task
  INSERT INTO public.template_tasks (template_version_id, title, task_type, is_optional)
  VALUES (version_id, 'Optional Task', 'B', true) RETURNING id INTO task_opt_id;

  ----------------------------------------------------------------
  -- 2. Deploy Strategy
  ----------------------------------------------------------------
  PERFORM public.deploy_strategy(market_id, version_id);

  ----------------------------------------------------------------
  -- 3. Verification
  ----------------------------------------------------------------

  -- Check market_strategies
  SELECT * INTO strategy_check FROM public.market_strategies
  WHERE market_id = market_id AND template_version_id = version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEPLOY FAILURE: Market Strategy record not found.';
  ELSE
    RAISE NOTICE 'SUCCESS: Market Strategy record created.';
  END IF;

  -- Check Required Task exists
  SELECT * INTO task_check_req FROM public.market_tasks
  WHERE market_id = market_id AND origin_template_task_id = task_req_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEPLOY FAILURE: Required Task not created in market_tasks.';
  ELSE
    RAISE NOTICE 'SUCCESS: Required Task created.';
  END IF;

  -- Check Optional Task does NOT exist
  SELECT * INTO task_check_opt FROM public.market_tasks
  WHERE market_id = market_id AND origin_template_task_id = task_opt_id;

  IF FOUND THEN
    RAISE EXCEPTION 'DEPLOY FAILURE: Optional Task created (Ghost Card rule violated)!';
  ELSE
    RAISE NOTICE 'SUCCESS: Optional Task correctly skipped.';
  END IF;

  ----------------------------------------------------------------
  -- 4. Idempotency Check
  ----------------------------------------------------------------

  -- Modify status of existing task
  UPDATE public.market_tasks SET status = 'DONE' WHERE id = task_check_req.id;

  -- Redeploy
  PERFORM public.deploy_strategy(market_id, version_id);

  -- Check status is preserved
  SELECT status INTO v_status FROM public.market_tasks WHERE id = task_check_req.id;

  IF v_status <> 'DONE' THEN
      RAISE EXCEPTION 'IDEMPOTENCY FAILURE: Task status reset to %', v_status;
  ELSE
      RAISE NOTICE 'SUCCESS: Task status preserved after redeploy.';
  END IF;

  -- Check no new tasks created (count should be 1)
  SELECT count(*) INTO task_count FROM public.market_tasks WHERE market_id = market_id;
  IF task_count <> 1 THEN
     RAISE EXCEPTION 'IDEMPOTENCY FAILURE: Duplicate tasks created. Count: %', task_count;
  ELSE
     RAISE NOTICE 'SUCCESS: Task count remains correct.';
  END IF;

  RAISE NOTICE 'ALL TESTS PASSED.';

END $$;

ROLLBACK;
