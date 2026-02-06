-- SQL Verification Script for RLS Policies
-- This script simulates two users and verifies cross-organization isolation.
-- Run this as a superuser or a role with sufficient privileges to create users in auth.users.

BEGIN;

-- 1. Setup Test Users
DO $$
DECLARE
  user_a_id uuid := gen_random_uuid();
  user_b_id uuid := gen_random_uuid();
  org_a_id uuid;
  org_b_id uuid;
  market_a_id uuid;
  market_b_id uuid;
  market_check record;
BEGIN
  -- Create User A
  INSERT INTO auth.users (id, email) VALUES (user_a_id, 'user_a@test.com');
  -- Profile A created automatically by trigger

  -- Create User B
  INSERT INTO auth.users (id, email) VALUES (user_b_id, 'user_b@test.com');
  -- Profile B created automatically by trigger

  ----------------------------------------------------------------
  -- 2. User A Actions
  ----------------------------------------------------------------
  -- Simulate User A session
  PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Create Org A (Assume logic gap fixed with owner_id or workaround used)
  INSERT INTO public.organizations (name, owner_id) VALUES ('Org A', user_a_id) RETURNING id INTO org_a_id;

  -- Link User A to Org A
  UPDATE public.profiles SET org_id = org_a_id WHERE user_id = user_a_id;

  -- Create Market A
  INSERT INTO public.markets (name, org_id) VALUES ('Market A', org_a_id) RETURNING id INTO market_a_id;

  ----------------------------------------------------------------
  -- 3. User B Actions
  ----------------------------------------------------------------
  -- Simulate User B session
  PERFORM set_config('request.jwt.claim.sub', user_b_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Create Org B
  INSERT INTO public.organizations (name, owner_id) VALUES ('Org B', user_b_id) RETURNING id INTO org_b_id;

  -- Link User B to Org B
  UPDATE public.profiles SET org_id = org_b_id WHERE user_id = user_b_id;

  -- Create Market B
  INSERT INTO public.markets (name, org_id) VALUES ('Market B', org_b_id) RETURNING id INTO market_b_id;

  ----------------------------------------------------------------
  -- 4. Verification: User A Access
  ----------------------------------------------------------------
  -- Simulate User A session again
  PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Attempt to read Market B (should return empty)
  SELECT * INTO market_check FROM public.markets WHERE id = market_b_id;

  IF FOUND THEN
    RAISE EXCEPTION 'RLS FAILURE: User A can see Market B!';
  ELSE
    RAISE NOTICE 'SUCCESS: User A cannot see Market B.';
  END IF;

  -- Attempt to read Market A (should succeed)
  SELECT * INTO market_check FROM public.markets WHERE id = market_a_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RLS FAILURE: User A cannot see Market A!';
  ELSE
    RAISE NOTICE 'SUCCESS: User A sees Market A.';
  END IF;

  RAISE NOTICE 'ALL TESTS PASSED.';

END $$;

ROLLBACK; -- Clean up changes
