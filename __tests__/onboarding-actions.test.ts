import { createOrganization } from '@/app/app/onboarding/actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('createOrganization', () => {
  const mockFormData = new FormData()
  mockFormData.append('organizationName', 'Acme Corp')

  const mockUser = { id: 'user-123' }
  const mockOrg = { id: 'org-456', name: 'Acme Corp' }

  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockOrg, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        select: jest.fn(),
      }),
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    // Mock redirect to throw an error to verify it was called
    ;(redirect as unknown as jest.Mock).mockImplementation((url) => {
      // In Next.js server actions, redirect throws an error. We can catch it or mock it.
      // Here we mock it to just return, but we check if it was called.
      // Wait, if we mock it to return, the function continues execution.
      // But redirect is supposed to be terminal.
      // So we should probably throw an error to stop execution if there is code after it.
      // However, revalidatePath is before redirect, so it should be fine.
    })
  })

  it('should create organization but NOT update profile manually', async () => {
    await createOrganization(mockFormData)

    expect(createClient).toHaveBeenCalled()
    expect(mockSupabase.auth.getUser).toHaveBeenCalled()

    // Verify organization creation
    expect(mockSupabase.from).toHaveBeenCalledWith('organizations')
    // We can't easily check the chain call arguments without complex mocks,
    // but we can check if update was called on profiles.

    // Verify that we attempt to insert into organizations
    // Note: Since `from` returns the same object in our mock, we need to be careful.
    // Better to check specific calls if possible.

    // Check if `update` was NOT called on `profiles`
    // The current implementation calls `update` on `profiles`.
    // We want to assert that it is NOT called.

    // To distinguish calls to `from('organizations')` and `from('profiles')`,
    // we can make `from` return different mocks based on the argument.

    const organizationsMock = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockOrg, error: null }),
        }),
      }),
    }

    const profilesMock = {
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organizations') return organizationsMock
      if (table === 'profiles') return profilesMock
      return {}
    })

    await createOrganization(mockFormData)

    expect(mockSupabase.from).toHaveBeenCalledWith('organizations')
    expect(organizationsMock.insert).toHaveBeenCalledWith({
      name: 'Acme Corp',
      owner_id: mockUser.id,
    })

    // This assertion should FAIL currently, and PASS after refactor
    expect(mockSupabase.from).not.toHaveBeenCalledWith('profiles')
    expect(profilesMock.update).not.toHaveBeenCalled()

    expect(revalidatePath).toHaveBeenCalledWith('/app', 'layout')
    expect(redirect).toHaveBeenCalledWith('/app')
  })
})
