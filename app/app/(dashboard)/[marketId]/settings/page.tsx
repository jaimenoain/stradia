import { redirect } from 'next/navigation'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ marketId: string }>
}) {
  const { marketId } = await params
  redirect(`/app/${marketId}/settings/vault`)
}
