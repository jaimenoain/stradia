import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Paths
const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');
const TEST_SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.pagination.prisma');
const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'pagination_test.db');
const TEST_DB_URL = `file:${TEST_DB_PATH}`;
const GENERATED_CLIENT_PATH = path.join(process.cwd(), 'node_modules', '@prisma', 'client-pagination');

async function main() {
  console.log('🚀 Starting User Pagination Verification...');

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
        // We replace the whole block or just inject output
        // The easiest way is to rely on the fact that 'generator client {' is unique
        schema = schema.replace(
            'generator client {',
            `generator client {\n  output = "${GENERATED_CLIENT_PATH}"`
        );
    }

    fs.writeFileSync(TEST_SCHEMA_PATH, schema);

    // Generate Client
    console.log('⚙️  Generating Prisma Client for Test...');
    // We need to install the client to the custom path
    execSync(`npx prisma generate --schema ${TEST_SCHEMA_PATH}`, { stdio: 'inherit' });

    // Push DB
    console.log('🗄️  Pushing Schema to SQLite DB...');
    execSync(`npx prisma db push --schema ${TEST_SCHEMA_PATH}`, { stdio: 'inherit' });

    // Dynamic Import of the generated client
    // We import from the custom path
    const { PrismaClient, UserRole } = require(GENERATED_CLIENT_PATH);
    const prisma = new PrismaClient();

    try {
        await runTests(prisma, UserRole);
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

async function runTests(prisma: any, UserRole: any) {
  console.log('🧪 Running Pagination Tests...');

  // Setup Data
  const tenantId = 'tenant-test-pagination';
  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: 'Pagination Test Tenant',
      active_markets_limit: 5,
      user_seat_limit: 100,
      ai_token_quota: 1000,
      ai_tokens_used: 0,
      is_active: true
    }
  });

  // Create 15 Users
  console.log('🌱 Seeding 15 users...');
  const usersData = Array.from({ length: 15 }).map((_, i) => ({
    id: `user-${i + 1}`,
    tenant_id: tenantId,
    email: `user${i + 1}@test.com`,
    password_hash: 'hash',
    role: UserRole.LOCAL_USER,
    language_preference: 'en'
  }));

  await prisma.user.createMany({
    data: usersData
  });

  // --- Test 1: Page 1 (Take 10, Skip 0) ---
  console.log('🔸 Test 1: Fetch Page 1 (Take 10, Skip 0)');
  const page1 = await prisma.user.findMany({
    where: { tenant_id: tenantId },
    orderBy: { email: 'asc' },
    take: 10,
    skip: 0
  });

  if (page1.length === 10) {
      console.log('✅ Page 1 returned 10 users.');
  } else {
      throw new Error(`Test 1 Failed: Expected 10 users, got ${page1.length}`);
  }

  // Verify content of page 1 (user1@test.com to user10@test.com? careful with sorting)
  // Sorting by email ASC: user1@, user10@, user11@, user12@, user13@, user14@, user15@, user2@...
  // Lexicographical order:
  // user1
  // user10
  // user11
  // ...
  // user15
  // user2
  // user3
  // ...
  // user9

  // Total 15 users.
  // 1, 10, 11, 12, 13, 14, 15, 2, 3, 4, 5, 6, 7, 8, 9
  // Page 1 (10 items): 1, 10, 11, 12, 13, 14, 15, 2, 3, 4
  // Page 2 (5 items): 5, 6, 7, 8, 9

  // --- Test 2: Page 2 (Take 10, Skip 10) ---
  console.log('🔸 Test 2: Fetch Page 2 (Take 10, Skip 10)');
  const page2 = await prisma.user.findMany({
    where: { tenant_id: tenantId },
    orderBy: { email: 'asc' },
    take: 10,
    skip: 10
  });

  if (page2.length === 5) {
      console.log('✅ Page 2 returned 5 users.');
  } else {
      throw new Error(`Test 2 Failed: Expected 5 users, got ${page2.length}`);
  }

  // --- Test 3: Total Count ---
  console.log('🔸 Test 3: Total Count');
  const count = await prisma.user.count({
    where: { tenant_id: tenantId }
  });

  if (count === 15) {
      console.log('✅ Total count is 15.');
  } else {
      throw new Error(`Test 3 Failed: Expected 15, got ${count}`);
  }
}

main();
