import { prisma } from '@/lib/prisma';
import { AdminMarketManager } from './admin-market-manager';

export default async function AdminMarketsPage() {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let markets: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenants: any[] = [];

  if (!useMocks) {
    markets = await prisma.market.findMany({
      include: {
        tenant: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    tenants = await prisma.tenant.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } else {
    markets = [
      {
        id: '1',
        name: 'Mock Market North',
        region_code: 'MN',
        timezone: 'America/New_York',
        is_active: true,
        deleted_at: null,
        tenant: { id: 't1', name: 'Mock Tenant 1' },
      }
    ];
    tenants = [
      { id: 't1', name: 'Mock Tenant 1' },
      { id: 't2', name: 'Mock Tenant 2' },
    ];
  }

  const serializedMarkets = markets.map(market => ({
    ...market,
    deleted_at: market.deleted_at ? market.deleted_at.toISOString() : null,
  }));

  return (
    <div className="flex flex-col gap-8">
      <AdminMarketManager markets={serializedMarkets} tenants={tenants} />
    </div>
  );
}
