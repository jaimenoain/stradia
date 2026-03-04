import { AdminMarketManager } from './admin-market-manager';
import { getMarkets } from '@/app/actions/market-actions';
import { getActiveTenants } from '@/app/actions/admin-actions';

export default async function AdminMarketsPage() {
  const markets = await getMarkets();
  const tenants = await getActiveTenants();

  return (
    <div className="flex flex-col gap-8">
      <AdminMarketManager markets={markets} tenants={tenants} />
    </div>
  );
}
