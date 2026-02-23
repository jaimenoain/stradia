-- 0002_rls_policies.sql

-- Ensure RLS is enabled
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Market" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserMarket" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "tenant_isolation" ON "Tenant";
DROP POLICY IF EXISTS "tenant_isolation" ON "User";
DROP POLICY IF EXISTS "market_isolation" ON "Market";
DROP POLICY IF EXISTS "usermarket_isolation" ON "UserMarket";

-- Tenant Policies
-- Users can only see/modify their own tenant record
CREATE POLICY "tenant_isolation" ON "Tenant"
FOR ALL
USING (id::uuid = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
WITH CHECK (id::uuid = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- User Policies
-- Users can only see/modify users in their own tenant
CREATE POLICY "tenant_isolation" ON "User"
FOR ALL
USING (tenant_id::uuid = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id::uuid = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- UserMarket Policies
-- Visibility restricted to users within the same tenant
CREATE POLICY "usermarket_isolation" ON "UserMarket"
FOR ALL
USING (
  exists (
    select 1 from "User"
    where id = "UserMarket".user_id
    and tenant_id::uuid = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  )
)
WITH CHECK (
  exists (
    select 1 from "User"
    where id = "UserMarket".user_id
    and tenant_id::uuid = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  )
);

-- Market Policies
-- Visibility: Global Admin (all in tenant) OR Assigned (UserMarket)
CREATE POLICY "market_isolation" ON "Market"
FOR ALL
USING (
  tenant_id::uuid = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  AND
  (
    -- Global Admin Override
    exists (
      select 1 from "User"
      where id::uuid = auth.uid()
      and role::text = 'GLOBAL_ADMIN'
    )
    OR
    -- Assigned Market
    exists (
      select 1 from "UserMarket"
      where user_id::uuid = auth.uid()
      and market_id = "Market".id
    )
  )
)
WITH CHECK (
  tenant_id::uuid = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  AND
  (
    -- Global Admin Override
    exists (
      select 1 from "User"
      where id::uuid = auth.uid()
      and role::text = 'GLOBAL_ADMIN'
    )
    OR
    -- Assigned Market
    exists (
      select 1 from "UserMarket"
      where user_id::uuid = auth.uid()
      and market_id = "Market".id
    )
  )
);
