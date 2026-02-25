import { PrismaClient } from '@prisma/client';
import { createMarketCore, deleteMarketCore, UserRole } from '../app/actions/market-core';

// Helper to log test results
const log = (msg: string) => console.log(`[TEST] ${msg}`);
const fail = (msg: string): never => {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
};

async function main() {
  const prisma = new PrismaClient();

  try {
    log('Cleaning up database...');
    // Clean up
    await prisma.userMarket.deleteMany();
    await prisma.market.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    log('Creating Tenant A...');
    const tenantA = await prisma.tenant.create({
      data: {
        name: 'Tenant A',
        active_markets_limit: 5,
        user_seat_limit: 5,
        ai_token_quota: 100,
        ai_tokens_used: 0,
        is_active: true,
      },
    });

    log('Creating User A (Global Admin)...');
    const userA = await prisma.user.create({
      data: {
        tenant_id: tenantA.id,
        email: 'admin@tenantA.com',
        password_hash: 'hash',
        role: UserRole.GLOBAL_ADMIN as any, // Cast to match DB enum if needed
        language_preference: 'en',
      },
    });

    // Test 1: Create Market Success
    log('Test 1: Create Market (Success)...');
    try {
      await createMarketCore(
        { id: userA.id, tenant_id: userA.tenant_id, role: userA.role },
        prisma,
        { name: 'Market A1', region_code: 'US', timezone: 'UTC' }
      );
    } catch (e) {
      fail(`Failed to create market: ${e instanceof Error ? e.message : String(e)}`);
    }

    const market1 = await prisma.market.findFirst({ where: { name: 'Market A1' } });
    if (!market1) fail('Market A1 not found in DB');

    if (market1!.tenant_id !== tenantA.id) fail('Market A1 has wrong tenant_id');
    log('✅ Test 1 Passed');

    // Test 2: Isolation
    log('Creating Tenant B and User B...');
    const tenantB = await prisma.tenant.create({
      data: {
        name: 'Tenant B',
        active_markets_limit: 5,
        user_seat_limit: 5,
        ai_token_quota: 100,
        ai_tokens_used: 0,
        is_active: true,
      },
    });

    const userB = await prisma.user.create({
      data: {
        tenant_id: tenantB.id,
        email: 'admin@tenantB.com',
        password_hash: 'hash',
        role: UserRole.GLOBAL_ADMIN as any,
        language_preference: 'en',
      },
    });

    log('Test 2: Isolation (Create Market for Tenant B)...');
    try {
      await createMarketCore(
        { id: userB.id, tenant_id: userB.tenant_id, role: userB.role },
        prisma,
        { name: 'Market B1', region_code: 'EU', timezone: 'CET' }
      );
    } catch (e) {
      fail(`Failed to create market B1: ${e instanceof Error ? e.message : String(e)}`);
    }

    const marketB1 = await prisma.market.findFirst({ where: { name: 'Market B1' } });
    if (!marketB1) fail('Market B1 not found');
    if (marketB1!.tenant_id !== tenantB.id) fail('Market B1 should belong to Tenant B');

    const countA = await prisma.market.count({ where: { tenant_id: tenantA.id } });
    if (countA !== 1) fail(`Tenant A should have 1 market, found ${countA}`);
    log('✅ Test 2 Passed');

    // Test 3: Deletion
    log('Test 3: Deletion...');
    try {
      await deleteMarketCore(
        { id: userA.id, tenant_id: userA.tenant_id, role: userA.role },
        prisma,
        market1!.id
      );
    } catch (e) {
      fail(`Failed to delete market: ${e instanceof Error ? e.message : String(e)}`);
    }

    const market1Deleted = await prisma.market.findUnique({ where: { id: market1!.id } });
    if (!market1Deleted) fail('Market A1 disappeared (should be soft deleted)');
    if (market1Deleted!.is_active) fail('Market A1 should be inactive');
    if (!market1Deleted!.deleted_at) fail('Market A1 should have deleted_at set');
    log('✅ Test 3 Passed');

    // Test 4: Permission (Local User)
    log('Test 4: Permission (Local User)...');
    const userLocal = await prisma.user.create({
      data: {
        tenant_id: tenantA.id,
        email: 'local@tenantA.com',
        password_hash: 'hash',
        role: UserRole.LOCAL_USER as any,
        language_preference: 'en',
      },
    });

    try {
      await createMarketCore(
        { id: userLocal.id, tenant_id: userLocal.tenant_id, role: userLocal.role },
        prisma,
        { name: 'Market A2', region_code: 'US', timezone: 'UTC' }
      );
      fail('Local user should not be able to create market');
    } catch (e) {
      log('✅ Test 4 Passed (Caught expected error)');
    }

  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
