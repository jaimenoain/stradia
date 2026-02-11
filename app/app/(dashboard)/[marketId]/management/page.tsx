export default async function ManagementPage({
  params,
}: {
  params: Promise<{ marketId: string }>
}) {
  await params

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market Management</h1>
        <p className="text-muted-foreground">
          Manage your market settings and configurations.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <h3 className="text-2xl font-bold tracking-tight">Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            Market management features are currently under development.
          </p>
        </div>
      </div>
    </div>
  )
}
