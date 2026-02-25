-- 0004_super_admin_rls.sql

-- Helper function to get role from JWT
CREATE OR REPLACE FUNCTION get_jwt_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  select current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
$$;

-- Tenant Policy for Super Admin
CREATE POLICY "super_admin_all" ON "Tenant"
FOR ALL
USING (
  get_jwt_role() = 'SUPER_ADMIN'
)
WITH CHECK (
  get_jwt_role() = 'SUPER_ADMIN'
);

-- User Policy for Super Admin
CREATE POLICY "super_admin_all" ON "User"
FOR ALL
USING (
  get_jwt_role() = 'SUPER_ADMIN'
)
WITH CHECK (
  get_jwt_role() = 'SUPER_ADMIN'
);

-- Market Policy for Super Admin
CREATE POLICY "super_admin_all" ON "Market"
FOR ALL
USING (
  get_jwt_role() = 'SUPER_ADMIN'
)
WITH CHECK (
  get_jwt_role() = 'SUPER_ADMIN'
);

-- UserMarket Policy for Super Admin
CREATE POLICY "super_admin_all" ON "UserMarket"
FOR ALL
USING (
  get_jwt_role() = 'SUPER_ADMIN'
)
WITH CHECK (
  get_jwt_role() = 'SUPER_ADMIN'
);
