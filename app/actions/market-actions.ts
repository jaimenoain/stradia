'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createMarketCore, updateMarketCore, deleteMarketCore, getMarketsCore, marketSchema, ActionState } from './market-core'

export async function getMarkets() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tenant_id: true, role: true },
  })

  if (!dbUser) {
    throw new Error('User not found in database')
  }

  const markets = await getMarketsCore(
    { id: user.id, tenant_id: dbUser.tenant_id ?? '', role: dbUser.role as unknown as string },
    prisma
  )

  return markets.map(market => ({
    id: market.id,
    name: market.name,
    region_code: market.region_code,
    timezone: market.timezone,
    is_active: market.is_active,
    deleted_at: market.deleted_at ? market.deleted_at.toISOString() : null,
    tenant: {
      id: market.tenant.id,
      name: market.tenant.name,
    }
  }))
}

export async function createMarketAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tenant_id: true, role: true },
  })

  if (!dbUser) {
    return { success: false, message: 'User not found in database' }
  }

  const tenantId = formData.get('tenant_id') as string | null

  const validatedFields = marketSchema.safeParse({
    name: formData.get('name'),
    region_code: formData.get('region_code'),
    timezone: formData.get('timezone'),
    ...(tenantId && { tenant_id: tenantId }),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await createMarketCore(
      { id: user.id, tenant_id: dbUser.tenant_id ?? '', role: dbUser.role as unknown as string },
      prisma,
      validatedFields.data
    )

    revalidatePath('/settings')
    revalidatePath('/admin/markets')
    return { success: true, message: 'Market created successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create market';
    return { success: false, message }
  }
}

export async function deleteMarketAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const marketId = formData.get('marketId') as string

  if (!marketId) {
    return { success: false, message: 'Market ID is required' }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tenant_id: true, role: true },
  })

  if (!dbUser) {
    return { success: false, message: 'User not found in database' }
  }

  try {
    await deleteMarketCore(
      { id: user.id, tenant_id: dbUser.tenant_id ?? '', role: dbUser.role as unknown as string },
      prisma,
      marketId
    )

    revalidatePath('/settings')
    revalidatePath('/admin/markets')
    return { success: true, message: 'Market deleted successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update market';
    return { success: false, message }
  }
}

export async function updateMarketAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const marketId = formData.get('marketId') as string

  if (!marketId) {
    return { success: false, message: 'Market ID is required' }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tenant_id: true, role: true },
  })

  if (!dbUser) {
    return { success: false, message: 'User not found in database' }
  }

  const tenantId = formData.get('tenant_id') as string | null

  const validatedFields = marketSchema.safeParse({
    name: formData.get('name'),
    region_code: formData.get('region_code'),
    timezone: formData.get('timezone'),
    ...(tenantId && { tenant_id: tenantId }),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await updateMarketCore(
      { id: user.id, tenant_id: dbUser.tenant_id ?? '', role: dbUser.role as unknown as string },
      prisma,
      marketId,
      validatedFields.data
    )

    revalidatePath('/settings')
    revalidatePath('/admin/markets')
    return { success: true, message: 'Market updated successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete market';
    return { success: false, message }
  }
}
