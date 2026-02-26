
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import { execSync } from 'child_process';

async function runVerification() {
  console.log('Running Super Admin RLS Verification...');

  const db = new PGlite();

  console.log('1. Generating Schema SQL from Prisma...');
  let schemaSql = '';
  try {
     schemaSql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', { encoding: 'utf-8' });
  } catch (e) {
      console.error('Failed to generate schema SQL', e);
      process.exit(1);
  }
  // Apply schema
  try {
    await db.exec(schemaSql);
    console.log('✅ Base Schema applied.');
  } catch (e) {
    console.error('Failed to apply base schema', e);
    process.exit(1);
  }

  console.log('2. Setting up Mocks & Applying Migrations...');

  // Setup Auth Mocks
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$
      SELECT current_setting('request.jwt.claims', true)::jsonb;
    $$ LANGUAGE sql STABLE;

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    $$ LANGUAGE sql STABLE;
  `);

  // Apply migrations
  const migrations = [
    'supabase/migrations/0001_rls_and_indexes.sql',
    'supabase/migrations/0002_rls_policies.sql',
    'supabase/migrations/0004_super_admin_rls.sql'
  ];

  for (const migrationPath of migrations) {
    if (fs.existsSync(migrationPath)) {
      try {
          const sql = fs.readFileSync(migrationPath, 'utf-8');
          await db.exec(sql);
          console.log(`✅ ${migrationPath} applied.`);
      } catch (e) {
          console.error(`Failed to apply ${migrationPath}`, e);
          process.exit(1);
      }
    } else {
      console.warn(`⚠️  ${migrationPath} not found.`);
    }
  }

  console.log('3. Seeding Data...');
  await seedData(db);

  console.log('4. Verifying Super Admin Policies...');
  await verifySuperAdminPolicies(db);
}

async function seedData(db: any) {
  try {
      // Tenant A
      await db.exec(`INSERT INTO "Tenant" (id, name, active_markets_limit, user_seat_limit, ai_token_quota, ai_tokens_used, is_active) VALUES ('11111111-1111-1111-1111-111111111111', 'Tenant A', 10, 10, 1000, 0, true);`);
      // Tenant B
      await db.exec(`INSERT INTO "Tenant" (id, name, active_markets_limit, user_seat_limit, ai_token_quota, ai_tokens_used, is_active) VALUES ('22222222-2222-2222-2222-222222222222', 'Tenant B', 10, 10, 1000, 0, true);`);

      // Markets
      await db.exec(`INSERT INTO "Market" (id, tenant_id, name, region_code, timezone, is_active) VALUES ('mkt-a1-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Market A1', 'US', 'UTC', true);`);
      // Market A2 (Tenant A) - Unassigned to Local User
      await db.exec(`INSERT INTO "Market" (id, tenant_id, name, region_code, timezone, is_active) VALUES ('mkt-a2-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Market A2', 'US', 'UTC', true);`);
      await db.exec(`INSERT INTO "Market" (id, tenant_id, name, region_code, timezone, is_active) VALUES ('mkt-b1-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Market B1', 'US', 'UTC', true);`);

      // Seed Users for Tests
      // Global Admin (Tenant A)
      await db.exec(`INSERT INTO "User" (id, tenant_id, email, password_hash, role, language_preference) VALUES ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin@a.com', 'hash', 'GLOBAL_ADMIN', 'en');`);
      // Local User (Tenant A)
      await db.exec(`INSERT INTO "User" (id, tenant_id, email, password_hash, role, language_preference) VALUES ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'user@a.com', 'hash', 'LOCAL_USER', 'en');`);
      // UserMarket Assignment
      await db.exec(`INSERT INTO "UserMarket" (user_id, market_id) VALUES ('aaaa2222-2222-2222-2222-222222222222', 'mkt-a1-1111-1111-1111-111111111111');`);
  } catch (e) {
      console.error('Failed to seed data', e);
      process.exit(1);
  }
}

async function verifySuperAdminPolicies(db: any) {
  // Create authenticated role
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
        GRANT USAGE ON SCHEMA public TO authenticated;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
      END IF;
    END
    $$;
  `);

  // Test 1: Super Admin (Platform Level)
  console.log('\n--- Test 1: Super Admin Access ---');
  // Super Admin typically doesn't have a tenant_id, but has role SUPER_ADMIN
  // Use a valid UUID for sub to avoid cast errors
  await setJwt(db, '00000000-0000-0000-0000-000000000000', null, 'SUPER_ADMIN');

  // Should see ALL Tenants (2)
  const tenants = await db.query(`SELECT id FROM "Tenant"`);
  assert(tenants.rows.length === 2, `Super Admin should see 2 tenants, saw ${tenants.rows.length}`);

  // Should see ALL Markets (3)
  const markets = await db.query(`SELECT id FROM "Market"`);
  assert(markets.rows.length === 3, `Super Admin should see 3 markets, saw ${markets.rows.length}`);

  console.log('✅ Super Admin sees ALL data (Cross-Tenant Access).');

  // Test 2: Global Admin (Tenant A) Regression Check
  console.log('\n--- Test 2: Global Admin (Tenant A) Isolation ---');
  await setJwt(db, 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'GLOBAL_ADMIN');

  const tenantsGA = await db.query(`SELECT id FROM "Tenant"`);
  assert(tenantsGA.rows.length === 1, `Global Admin should see 1 tenant, saw ${tenantsGA.rows.length}`);
  assert(tenantsGA.rows[0].id === '11111111-1111-1111-1111-111111111111', 'Global Admin sees only own tenant');

  const marketsGA = await db.query(`SELECT id FROM "Market"`);
  // Assuming Global Admin sees all markets in their tenant
  // Wait, policy says: tenant_id match AND (GLOBAL_ADMIN OR Assigned)
  // GLOBAL_ADMIN check uses `auth.uid()`, need to ensure `User` table has the user with GLOBAL_ADMIN role?
  // 0002_rls_policies.sql:
  // exists (select 1 from "User" where id = auth.uid() and role = 'GLOBAL_ADMIN')

  // Ah! We didn't seed the User record for 'admin-a-id' in THIS script's seedData.
  // We need to seed the User record for the RLS policy to work properly for Global Admin.
  // Super Admin policy uses `get_jwt_role()` which relies on JWT claim, so it doesn't need a User record.
  // But standard policies rely on User table lookups for role check?

  // Let's check 0002_rls_policies.sql again.
  // Market policy:
  // exists (select 1 from "User" where id::uuid = auth.uid() and role::text = 'GLOBAL_ADMIN')

  // User seeded in seedData

  const marketsGA2 = await db.query(`SELECT id FROM "Market"`);
  assert(marketsGA2.rows.length === 2, `Global Admin should see 2 markets (A1, A2), saw ${marketsGA2.rows.length}`);
  // assert(marketsGA2.rows[0].id === 'mkt-a1-1111-1111-1111-111111111111', 'Global Admin sees correct market');

  console.log('✅ Global Admin (Tenant A) sees all tenant markets.');

  // Test 3: Local User (Tenant A) - Regression Check
  console.log('\n--- Test 3: Local User (Tenant A) Isolation ---');
  // User and assignment seeded in seedData

  await setJwt(db, 'aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'LOCAL_USER');

  const marketsUser = await db.query(`SELECT id FROM "Market"`);
  assert(marketsUser.rows.length === 1, `Local User should see 1 market (A1), saw ${marketsUser.rows.length}`);

  // Ensure they don't see Market A2 (which exists but is not assigned)
  if (marketsUser.rows.length > 0) {
      assert(marketsUser.rows[0].id === 'mkt-a1-1111-1111-1111-111111111111', 'Local User sees correct market');
  }

  console.log('✅ Local User (Tenant A) sees only assigned markets.');

  console.log('\n✅ ALL SUPER ADMIN & REGRESSION TESTS PASSED');
}

async function setJwt(db: any, sub: string, tenantId: string | null, role: string) {
  const jwt = JSON.stringify({
    sub: sub,
    app_metadata: {
      tenant_id: tenantId,
      role: role
    }
  });
  await db.exec(`SELECT set_config('request.jwt.claims', '${jwt}', false);`);
  await db.exec(`SET ROLE authenticated;`);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

runVerification().catch(e => {
  console.error(e);
  process.exit(1);
});
