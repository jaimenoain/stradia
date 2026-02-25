import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { isTenantActive } from '../lib/auth/tenant-lockout';
import 'dotenv/config';

// Paths
const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');
const TEST_SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.test.prisma');
const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'tenant_lockout_test.db');
const TEST_DB_URL = `file:${TEST_DB_PATH}`;
const GENERATED_CLIENT_PATH = path.join(process.cwd(), 'node_modules', '@prisma', 'client-test-lockout');

async function main() {
  console.log('🚀 Starting Tenant Lockout Verification...');

  try {
    // 1. Setup Test Environment
    console.log('📦 Setting up test database (SQLite)...');
    let schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

    // Replace provider
    schema = schema.replace(/provider\s+=\s+"postgresql"/, 'provider = "sqlite"');

    // Replace URL
    schema = schema.replace(/url\s+=\s+env\("DATABASE_URL"\)/, `url = "${TEST_DB_URL}"`);

    // Remove directUrl if present
    schema = schema.replace(/directUrl\s+=\s+env\("DIRECT_URL"\)/, '');

    // Add output to generator
    if (schema.includes('generator client {')) {
        schema = schema.replace(
            'generator client {',
            `generator client {\n  output = "${GENERATED_CLIENT_PATH}"`
        );
    }

    fs.writeFileSync(TEST_SCHEMA_PATH, schema);

    // Generate Client
    console.log('⚙️  Generating Prisma Client for Test...');
    execSync(`npm exec prisma -- generate --schema ${TEST_SCHEMA_PATH}`, { stdio: 'inherit' });

    // Push DB
    console.log('🗄️  Pushing Schema to SQLite DB...');
    execSync(`npm exec prisma -- db push --schema ${TEST_SCHEMA_PATH}`, { stdio: 'inherit' });

    // Dynamic Import of the generated client
    const { PrismaClient } = await import(GENERATED_CLIENT_PATH);
    const prisma = new PrismaClient();

    try {
        await runTests(prisma);
    } finally {
        await prisma.$disconnect();
    }

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    if (fs.existsSync(TEST_SCHEMA_PATH)) fs.unlinkSync(TEST_SCHEMA_PATH);
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    if (fs.existsSync(TEST_DB_PATH + '-journal')) fs.unlinkSync(TEST_DB_PATH + '-journal');
  }
}

async function runTests(prisma: any) {
  console.log('🧪 Running Logic Tests...');

  // --- Test 1: Active Tenant ---
  const activeTenantId = 'tenant-active-1';
  console.log('🔸 Test 1: Active Tenant (Expect true)');
  await prisma.tenant.create({
    data: {
      id: activeTenantId,
      name: 'Active Tenant',
      active_markets_limit: 5,
      user_seat_limit: 10,
      ai_token_quota: 1000,
      ai_tokens_used: 0,
      is_active: true
    }
  });

  const isActive1 = await isTenantActive(activeTenantId, prisma);
  if (isActive1 === true) {
      console.log('✅ Test 1 Passed: Active tenant returned true.');
  } else {
      throw new Error(`Test 1 Failed: Expected true, got ${isActive1}`);
  }

  // --- Test 2: Inactive Tenant ---
  const inactiveTenantId = 'tenant-inactive-1';
  console.log('🔸 Test 2: Inactive Tenant (Expect false)');
  await prisma.tenant.create({
    data: {
      id: inactiveTenantId,
      name: 'Inactive Tenant',
      active_markets_limit: 5,
      user_seat_limit: 10,
      ai_token_quota: 1000,
      ai_tokens_used: 0,
      is_active: false
    }
  });

  const isActive2 = await isTenantActive(inactiveTenantId, prisma);
  if (isActive2 === false) {
      console.log('✅ Test 2 Passed: Inactive tenant returned false.');
  } else {
      throw new Error(`Test 2 Failed: Expected false, got ${isActive2}`);
  }

  // --- Test 3: Non-existent Tenant ---
  console.log('🔸 Test 3: Non-existent Tenant (Expect false)');
  const isActive3 = await isTenantActive('non-existent-id', prisma);
  if (isActive3 === false) {
      console.log('✅ Test 3 Passed: Non-existent tenant returned false.');
  } else {
      throw new Error(`Test 3 Failed: Expected false, got ${isActive3}`);
  }

  console.log('🎉 All tests passed!');
}

main();
