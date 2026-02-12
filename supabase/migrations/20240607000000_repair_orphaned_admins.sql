-- Repair migration to fix orphaned admins
-- Fixes issue where users are owners of an organization but have NULL org_id in their profile
-- This script is idempotent and safe to run multiple times.

WITH user_orgs AS (
    -- Get the most recent organization for each owner
    SELECT DISTINCT ON (owner_id) owner_id, id
    FROM public.organizations
    WHERE owner_id IS NOT NULL
    ORDER BY owner_id, created_at DESC
)
UPDATE public.profiles
SET org_id = user_orgs.id
FROM user_orgs
WHERE profiles.user_id = user_orgs.owner_id
  AND profiles.org_id IS NULL;
