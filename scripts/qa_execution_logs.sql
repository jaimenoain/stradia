-- ==========================================
-- QA Verification Script for Task 4.5 (History & Rollback Log)
-- ==========================================

-- Instructions:
-- 1. Run these queries in the Supabase Dashboard SQL Editor.
-- 2. This script does NOT create data, it only verifies the schema and RLS setup.
-- 3. To verify data flow, please use the automated script `scripts/verify_execution_logs.mjs`.

-- ------------------------------------------
-- Step 1: Schema Validation
-- ------------------------------------------
-- Verify that the `execution_logs` table exists and has the correct columns.

SELECT
    column_name,
    data_type,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'execution_logs'
ORDER BY
    ordinal_position;

-- Expected Columns:
-- id (uuid, NO)
-- task_id (uuid, NO) -> FK to market_tasks
-- user_id (uuid, YES) -> FK to auth.users
-- snapshot_id (uuid, YES) -> FK to snapshots
-- status (text, NO)
-- payload (jsonb, NO)
-- created_at (timestamptz, NO)

-- ------------------------------------------
-- Step 2: Foreign Key Verification
-- ------------------------------------------
-- Verify foreign key constraints.

SELECT
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.key_column_usage AS kcu
JOIN
    information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = kcu.constraint_name
WHERE
    kcu.table_name = 'execution_logs'
    AND kcu.table_schema = 'public';

-- Expected FKs:
-- task_id -> market_tasks(id)
-- user_id -> users(id) (Note: might show up differently depending on auth schema visibility)
-- snapshot_id -> snapshots(id)

-- ------------------------------------------
-- Step 3: RLS Policy Verification
-- ------------------------------------------
-- Verify that RLS is enabled and policies exist.

SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename = 'execution_logs';

-- Expected Policies:
-- "Users can view execution logs for their organization" (SELECT)
-- "Users can insert execution logs for their organization" (INSERT)

-- ------------------------------------------
-- Step 4: Index Verification
-- ------------------------------------------
-- Verify indexes exist for performance.

SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'execution_logs';

-- Expected Indexes:
-- execution_logs_pkey
-- execution_logs_task_id_idx
-- execution_logs_user_id_idx
-- execution_logs_snapshot_id_idx

-- ==========================================
-- End of Verification Script
-- ==========================================
