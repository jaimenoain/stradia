export type VaultProvider = 'GTM' | 'GOOGLE_ADS' | 'META'

export const VAULT_PROVIDERS: VaultProvider[] = ['GTM', 'GOOGLE_ADS', 'META']

export type VaultStatus = Record<VaultProvider, boolean>
