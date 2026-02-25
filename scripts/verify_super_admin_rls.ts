import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function runVerification() {
  console.log('Running Super Admin RLS Policy Verification using PGlite...');

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

  console.log('2. Setting up Mocks (auth.jwt, auth.uid) & Applying Migrations...');

  // Setup Auth Mocks BEFORE migrations that use them
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$
      SELECT current_setting('request.jwt.claims', true)::jsonb;
    $$ LANGUAGE sql STABLE;

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    $$ LANGUAGE sql STABLE;
  `);
  console.log('✅ Auth Mocks setup.');

  try {
    const migration1 = fs.readFileSync('supabase/migrations/0001_rls_and_indexes.sql', 'utf-8');
    await db.exec(migration1);
    console.log('✅ 0001_rls_and_indexes applied.');
  } catch (e) {
    console.error('Failed to apply migration 0001', e);
    process.exit(1);
  }

  const migration2Path = 'supabase/migrations/0002_rls_policies.sql';
  if (fs.existsSync(migration2Path)) {
    try {
        const migration2 = fs.readFileSync(migration2Path, 'utf-8');
        await db.exec(migration2);
        console.log('✅ 0002_rls_policies applied.');
    } catch (e) {
        console.error('Failed to apply migration 0002', e);
        process.exit(1);
    }
  } else {
    console.warn('⚠️  0002_rls_policies.sql not found. Skipping.');
  }

  const migration4Path = 'supabase/migrations/0004_super_admin_rls.sql';
  if (fs.existsSync(migration4Path)) {
    try {
        const migration4 = fs.readFileSync(migration4Path, 'utf-8');
        await db.exec(migration4);
        console.log('✅ 0004_super_admin_rls applied.');
    } catch (e) {
        console.error('Failed to apply migration 0004', e);
        process.exit(1);
    }
  } else {
    console.error('❌ 0004_super_admin_rls.sql not found. Aborting.');
    process.exit(1);
  }

  console.log('4. Seeding Data...');
  await seedData(db);

  console.log('5. Verifying Policies...');
  await verifyPolicies(db);
}

async function seedData(db: any) {
  try {
      // Tenant A
      await db.exec(`INSERT INTO "Tenant" (id, name, active_markets_limit, user_seat_limit, ai_token_quota, ai_tokens_used, is_active) VALUES ('11111111-1111-1111-1111-111111111111', 'Tenant A', 10, 10, 1000, 0, true);`);
      // Tenant B
      await db.exec(`INSERT INTO "Tenant" (id, name, active_markets_limit, user_seat_limit, ai_token_quota, ai_tokens_used, is_active) VALUES ('22222222-2222-2222-2222-222222222222', 'Tenant B', 10, 10, 1000, 0, true);`);

      // Users
      // Admin A (Global Admin)
      await db.exec(`INSERT INTO "User" (id, tenant_id, email, password_hash, role, language_preference) VALUES ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin@a.com', 'hash', 'GLOBAL_ADMIN', 'en');`);
      // Local User A1 (Local User)
      await db.exec(`INSERT INTO "User" (id, tenant_id, email, password_hash, role, language_preference) VALUES ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'user1@a.com', 'hash', 'LOCAL_USER', 'en');`);
      // Local User B1 (Local User)
      await db.exec(`INSERT INTO "User" (id, tenant_id, email, password_hash, role, language_preference) VALUES ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'user1@b.com', 'hash', 'LOCAL_USER', 'en');`);
      // SUPER ADMIN (Platform Level - Dummy Tenant ID for DB constraint but conceptually global)
      await db.exec(`INSERT INTO "User" (id, tenant_id, email, password_hash, role, language_preference) VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'super@admin.com', 'hash', 'SUPER_ADMIN', 'en');`);


      // Markets
      // Market A1 (Tenant A)
      await db.exec(`INSERT INTO "Market" (id, tenant_id, name, region_code, timezone, is_active) VALUES ('mkt-a1-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Market A1', 'US', 'UTC', true);`);
      // Market A2 (Tenant A)
      await db.exec(`INSERT INTO "Market" (id, tenant_id, name, region_code, timezone, is_active) VALUES ('mkt-a2-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Market A2', 'US', 'UTC', true);`);
      // Market B1 (Tenant B)
      await db.exec(`INSERT INTO "Market" (id, tenant_id, name, region_code, timezone, is_active) VALUES ('mkt-b1-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Market B1', 'US', 'UTC', true);`);

      // UserMarket
      // User A1 -> Market A1
      await db.exec(`INSERT INTO "UserMarket" (user_id, market_id) VALUES ('aaaa2222-2222-2222-2222-222222222222', 'mkt-a1-1111-1111-1111-111111111111');`);
  } catch (e) {
      console.error('Failed to seed data', e);
      process.exit(1);
  }
}

async function verifyPolicies(db: any) {
  // We need to create 'authenticated' role to simulate RLS enforcement (superuser bypasses RLS)
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

  // --- STANDARD REGRESSION TESTS ---

  // Test 1: Global Admin A
  console.log('\n--- Test 1: Global Admin A (Tenant A) ---');
  await setJwt(db, 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'GLOBAL_ADMIN');

  const marketsAdmin = await db.query(`SELECT id FROM "Market"`);
  assert(marketsAdmin.rows.length === 2, `Admin should see 2 markets (own tenant), saw ${marketsAdmin.rows.length}`);
  console.log('✅ Global Admin sees all tenant markets.');

  // Test 2: Cross Tenant Check (Negative)
  console.log('\n--- Test 2: Cross Tenant Check (Tenant Table) ---');
  const tenants = await db.query(`SELECT id FROM "Tenant"`);
  assert(tenants.rows.length === 1, `Admin should see 1 tenant, saw ${tenants.rows.length}`);
  if (tenants.rows.length > 0) {
      assert(tenants.rows[0].id === '11111111-1111-1111-1111-111111111111', 'Admin should see own tenant');
  }
  console.log('✅ Tenant Isolation verified.');


  // --- NEW SUPER ADMIN TESTS ---

  // Test 3: Super Admin Access
  console.log('\n--- Test 3: Super Admin Access ---');
  await setJwt(db, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'SUPER_ADMIN');

  // Check Tenants
  const allTenants = await db.query(`SELECT id FROM "Tenant"`);
  assert(allTenants.rows.length === 2, `Super Admin should see ALL tenants (2), saw ${allTenants.rows.length}`);
  console.log('✅ Super Admin sees ALL tenants.');

  // Check Markets
  const allMarkets = await db.query(`SELECT id FROM "Market"`);
  assert(allMarkets.rows.length === 3, `Super Admin should see ALL markets (3), saw ${allMarkets.rows.length}`);
  console.log('✅ Super Admin sees ALL markets.');

  // Check Users
  const allUsers = await db.query(`SELECT id FROM "User"`);
  // 3 seed users + 1 super admin = 4
  assert(allUsers.rows.length === 4, `Super Admin should see ALL users (4), saw ${allUsers.rows.length}`);
  console.log('✅ Super Admin sees ALL users.');

  console.log('\n✅ ALL TESTS PASSED');
}

async function setJwt(db: any, sub: string, tenantId: string, role: string) {
  const jwt = JSON.stringify({
    sub: sub,
    app_metadata: {
      tenant_id: tenantId,
      role: role
    }
  });
  // Use is_local=false to persist across statements in PGlite session
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
