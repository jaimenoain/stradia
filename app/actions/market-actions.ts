'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@prisma/client'

const marketSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  region_code: z.string().min(1, 'Region code is required'),
  timezone: z.string().min(1, 'Timezone is required'),
})

export type ActionState = {
  success: boolean
  message: string
  errors?: {
    name?: string[]
    region_code?: string[]
    timezone?: string[]
  }
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

  if (!dbUser || dbUser.role !== UserRole.GLOBAL_ADMIN) {
    return { success: false, message: 'Forbidden: Only Global Admins can create markets' }
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

  const { name, region_code, timezone } = validatedFields.data

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: dbUser.tenant_id },
      select: { active_markets_limit: true },
    })

    if (!tenant) {
      return { success: false, message: 'Tenant not found' }
    }

    const currentMarketCount = await prisma.market.count({
      where: {
        tenant_id: dbUser.tenant_id,
        is_active: true,
        deleted_at: null,
      },
    })

    if (currentMarketCount >= tenant.active_markets_limit) {
      return { success: false, message: 'Active Market limit reached' }
    }

    await prisma.market.create({
      data: {
        tenant_id: dbUser.tenant_id,
        name,
        region_code,
        timezone,
        is_active: true,
      },
    })

    revalidatePath('/settings')
    return { success: true, message: 'Market created successfully' }
  } catch (error) {
    console.error('Failed to create market:', error)
    return { success: false, message: 'Failed to create market' }
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

  if (!dbUser || dbUser.role !== UserRole.GLOBAL_ADMIN) {
    return { success: false, message: 'Forbidden: Only Global Admins can delete markets' }
  }

  try {
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    })

    if (!market || market.tenant_id !== dbUser.tenant_id) {
      return { success: false, message: 'Market not found or access denied' }
    }

    await prisma.market.update({
      where: { id: marketId },
      data: {
        is_active: false,
        deleted_at: new Date(),
      },
    })

    revalidatePath('/settings')
    return { success: true, message: 'Market deleted successfully' }
  } catch (error) {
    console.error('Failed to delete market:', error)
    return { success: false, message: 'Failed to delete market' }
  }
}
