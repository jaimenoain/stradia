-- SQL Verification Script for Integrity Scoring Engine
-- Run this in the Supabase SQL Editor

BEGIN;

DO $$
DECLARE
  user_id uuid := gen_random_uuid();
  org_id uuid;
  market_id uuid;
  template_id uuid;
  version_id uuid;
  task1_id uuid;
  task2_id uuid;
  mt1_id uuid;
  mt2_id uuid;
  score_check numeric;
BEGIN
  RAISE NOTICE 'Starting Integrity Scoring Tests...';

  -- 1. Setup User and Org
  INSERT INTO auth.users (id, email) VALUES (user_id, 'scoring_tester@test.com');
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  INSERT INTO public.organizations (name, owner_id) VALUES ('Test Org', user_id) RETURNING id INTO org_id;
  UPDATE public.profiles SET org_id = org_id WHERE user_id = user_id;

  INSERT INTO public.markets (name, org_id) VALUES ('Test Market', org_id) RETURNING id INTO market_id;

  -- 2. Setup Template & Tasks
  INSERT INTO public.templates (owner_org_id, name) VALUES (org_id, 'Test Strategy') RETURNING id INTO template_id;
  INSERT INTO public.template_versions (template_id, version_string, status)
  VALUES (template_id, '1.0.0', 'DRAFT') RETURNING id INTO version_id;

  -- Task 1 (Weight 1)
  INSERT INTO public.template_tasks (template_version_id, title, task_type, weight)
  VALUES (version_id, 'Task 1', 'A', 1) RETURNING id INTO task1_id;

  -- Task 2 (Weight 3)
  INSERT INTO public.template_tasks (template_version_id, title, task_type, weight)
  VALUES (version_id, 'Task 2', 'A', 3) RETURNING id INTO task2_id;

  -- 3. Deploy Strategy (Manually insert market_tasks to trigger scoring)
  INSERT INTO public.market_tasks (market_id, origin_template_task_id, status)
  VALUES (market_id, task1_id, 'TODO') RETURNING id INTO mt1_id;

  INSERT INTO public.market_tasks (market_id, origin_template_task_id, status)
  VALUES (market_id, task2_id, 'TODO') RETURNING id INTO mt2_id;

  -- 4. Check Initial Score (Should be 0)
  SELECT integrity_score INTO score_check FROM public.market_scores WHERE market_id = market_id;
  IF score_check <> 0 THEN
    RAISE EXCEPTION 'FAIL: Initial score expected 0, got %', score_check;
  ELSE
    RAISE NOTICE 'PASS: Initial score is 0.';
  END IF;

  -- 5. Update Task 1 to DONE (1/4 = 25%)
  UPDATE public.market_tasks SET status = 'DONE' WHERE id = mt1_id;
  SELECT integrity_score INTO score_check FROM public.market_scores WHERE market_id = market_id;
  IF score_check <> 25 THEN
    RAISE EXCEPTION 'FAIL: Score expected 25, got %', score_check;
  ELSE
    RAISE NOTICE 'PASS: Score updated to 25.';
  END IF;

  -- 6. Update Task 2 to DONE (4/4 = 100%)
  UPDATE public.market_tasks SET status = 'DONE' WHERE id = mt2_id;
  SELECT integrity_score INTO score_check FROM public.market_scores WHERE market_id = market_id;
  IF score_check <> 100 THEN
    RAISE EXCEPTION 'FAIL: Score expected 100, got %', score_check;
  ELSE
    RAISE NOTICE 'PASS: Score updated to 100.';
  END IF;

  -- 7. Update Task 1 to DRIFTED (3/4 = 75%)
  UPDATE public.market_tasks SET status = 'DRIFTED' WHERE id = mt1_id;
  SELECT integrity_score INTO score_check FROM public.market_scores WHERE market_id = market_id;
  IF score_check <> 75 THEN
    RAISE EXCEPTION 'FAIL: Score expected 75, got %', score_check;
  ELSE
    RAISE NOTICE 'PASS: Score updated to 75 (DRIFTED handled).';
  END IF;

  -- 8. Delete Task 2 (Remaining: Task 1 DRIFTED. Total=1. Completed=0. Score=0.)
  DELETE FROM public.market_tasks WHERE id = mt2_id;
  SELECT integrity_score INTO score_check FROM public.market_scores WHERE market_id = market_id;
  IF score_check <> 0 THEN
    RAISE EXCEPTION 'FAIL: Score expected 0, got %', score_check;
  ELSE
    RAISE NOTICE 'PASS: Score updated to 0 after delete.';
  END IF;

  RAISE NOTICE 'ALL INTEGRITY SCORING TESTS PASSED.';

END $$;

ROLLBACK;
