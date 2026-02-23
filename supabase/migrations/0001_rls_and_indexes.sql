-- Enable RLS
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Market" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserMarket" ENABLE ROW LEVEL SECURITY;

-- Create Indexes
CREATE INDEX IF NOT EXISTS "idx_User_tenant_id" ON "User" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_Market_tenant_id" ON "Market" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_UserMarket_user_id" ON "UserMarket" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_UserMarket_market_id" ON "UserMarket" ("market_id");

-- Create JWT extraction function
CREATE OR REPLACE FUNCTION get_jwt_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  select (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid
$$;
