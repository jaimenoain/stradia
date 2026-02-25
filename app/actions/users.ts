'use server'

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { ProvisionUserDTO, provisionUserCore, updateUserRoleAndMarketsCore, deleteUserCore } from './users-core';

export async function inviteUser(dto: ProvisionUserDTO) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) {
    throw new Error('Tenant ID not found in session');
  }

  // Call core logic
  return await provisionUserCore(prisma, tenantId, dto);
}

export async function updateUserRoleAndMarkets(userId: string, dto: ProvisionUserDTO) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) {
    throw new Error('Tenant ID not found in session');
  }

  // Call core logic
  return await updateUserRoleAndMarketsCore(prisma, tenantId, userId, dto);
}

export async function deleteUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) {
    throw new Error('Tenant ID not found in session');
  }

  return await deleteUserCore(prisma, tenantId, userId);
}
