-- SQL Test Script for Integrity Scoring Trigger
-- File: test_scoring_trigger.sql
--
-- Objectives:
-- 1. Real-Time Triggering: Verify market_scores updates on market_tasks changes.
-- 2. The "Global Only" Invariant: Local Custom Tasks do NOT affect score.
-- 3. The "Drift" Penalty: DRIFTED Global Tasks reduce score.
-- 4. Weight Calculation: Score is based on weight sum, not count.
-- 5. Division by Zero: Handle 0 Global Tasks gracefully.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Setup Test Data
-- -----------------------------------------------------------------------------

-- Create a unique Organization for this test
INSERT INTO public.organizations (id, name)
VALUES ('test-org-score-1', 'Test Scoring Org')
ON CONFLICT (id) DO NOTHING;

-- Create a unique Market
INSERT INTO public.markets (id, org_id, name)
VALUES ('test-market-score-1', 'test-org-score-1', 'Test Scoring Market')
ON CONFLICT (id) DO NOTHING;

-- Create a Template and Version
INSERT INTO public.templates (id, owner_org_id, name)
VALUES ('test-template-score-1', 'test-org-score-1', 'Test Scoring Template')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.template_versions (id, template_id, version_string, status)
VALUES ('test-ver-score-1', 'test-template-score-1', '1.0.0', 'DRAFT')
ON CONFLICT (id) DO NOTHING;

-- Create a Global Task Template (Weight 10)
INSERT INTO public.template_tasks (id, template_version_id, title, task_type, weight)
VALUES ('test-task-global-1', 'test-ver-score-1', 'Global Task 1', 'A', 10)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. Test Logic & Assertions
-- -----------------------------------------------------------------------------

-- A. Initial State: No Tasks. Score should be 0 (or row doesn't exist yet, effectively 0).
-- Note: The trigger fires on market_tasks changes. Since we haven't inserted tasks,
-- market_scores might not have a row for this market if created via direct SQL insert without backfill trigger.
-- However, backfill migration should have run for existing markets. For new markets, score row is created on first task.

-- B. Insert "Local Task" (Weight 0/Ignored) and mark it DONE.
-- This tests "Global Only Invariant" and "Division by Zero" (0 Global Tasks).
INSERT INTO public.market_tasks (market_id, origin_template_task_id, status, title, task_type)
VALUES ('test-market-score-1', NULL, 'DONE', 'Local Task 1', 'A');

DO $$
DECLARE
    v_score numeric;
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count FROM public.market_scores WHERE market_id = 'test-market-score-1';
    IF v_count = 0 THEN
        RAISE EXCEPTION 'Market Score row was not created after inserting Local Task.';
    END IF;

    SELECT integrity_score INTO v_score FROM public.market_scores WHERE market_id = 'test-market-score-1';

    IF v_score IS NULL THEN
        RAISE EXCEPTION 'Score is NULL, expected 0.';
    END IF;

    IF v_score != 0 THEN
        RAISE EXCEPTION 'Assertion Failed: Score should be 0 after Local Task DONE (Global Only Invariant). Got %', v_score;
    END IF;
END $$;


-- C. Insert "Global Task" (Weight 10). Status TODO.
-- Score should remain 0 (0/10 completed).
INSERT INTO public.market_tasks (market_id, origin_template_task_id, status)
VALUES ('test-market-score-1', 'test-task-global-1', 'TODO');

DO $$
DECLARE
    v_score numeric;
BEGIN
    SELECT integrity_score INTO v_score FROM public.market_scores WHERE market_id = 'test-market-score-1';

    IF v_score != 0 THEN
        RAISE EXCEPTION 'Assertion Failed: Score should be 0 with Global Task TODO. Got %', v_score;
    END IF;
END $$;


-- D. Mark Global Task DONE.
-- Score should become 100% (10/10 completed).
UPDATE public.market_tasks
SET status = 'DONE'
WHERE market_id = 'test-market-score-1' AND origin_template_task_id = 'test-task-global-1';

DO $$
DECLARE
    v_score numeric;
BEGIN
    SELECT integrity_score INTO v_score FROM public.market_scores WHERE market_id = 'test-market-score-1';

    IF v_score != 100 THEN
        RAISE EXCEPTION 'Assertion Failed: Score should be 100 after Global Task DONE. Got %', v_score;
    END IF;
END $$;


-- E. Change Global Task to DRIFTED.
-- Score should drop to 0% (0/10 completed). This tests the "Drift" Penalty.
UPDATE public.market_tasks
SET status = 'DRIFTED'
WHERE market_id = 'test-market-score-1' AND origin_template_task_id = 'test-task-global-1';

DO $$
DECLARE
    v_score numeric;
BEGIN
    SELECT integrity_score INTO v_score FROM public.market_scores WHERE market_id = 'test-market-score-1';

    IF v_score != 0 THEN
        RAISE EXCEPTION 'Assertion Failed: Score should be 0 after Global Task DRIFTED. Got %', v_score;
    END IF;
END $$;

-- Cleanup (Rollback transaction to leave DB clean)
ROLLBACK;
