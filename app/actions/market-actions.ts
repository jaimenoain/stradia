'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createMarketCore, deleteMarketCore, marketSchema, ActionState } from './market-core'

export type { ActionState }

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

  const validatedFields = marketSchema.safeParse({
    name: formData.get('name'),
    region_code: formData.get('region_code'),
    timezone: formData.get('timezone'),
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
      { id: user.id, tenant_id: dbUser.tenant_id, role: dbUser.role as unknown as string },
      prisma,
      validatedFields.data
    )

    revalidatePath('/settings')
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
      { id: user.id, tenant_id: dbUser.tenant_id, role: dbUser.role as unknown as string },
      prisma,
      marketId
    )

    revalidatePath('/settings')
    return { success: true, message: 'Market deleted successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete market';
    return { success: false, message }
  }
}
