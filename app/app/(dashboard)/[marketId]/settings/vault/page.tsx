import { getVaultStatus } from './actions'
import { VaultGrid } from './vault-grid'

export default async function VaultSettingsPage({
  params,
}: {
  params: Promise<{ marketId: string }>
}) {
  const { marketId } = await params
  const initialStatus = await getVaultStatus(marketId)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credentials Vault</h1>
        <p className="text-muted-foreground">
          Manage your API credentials securely. Connections are encrypted and stored in your vault.
        </p>
      </div>
      <VaultGrid marketId={marketId} initialStatus={initialStatus} />
    </div>
  )
}
