
import { signup } from '@/app/login/actions'
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

describe('signup action', () => {
  const mockFormData = new FormData()
  mockFormData.append('email', 'test@example.com')
  mockFormData.append('password', 'password123')

  const mockSupabase = {
    auth: {
      signUp: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock redirect to throw an error to simulate termination
    ;(redirect as unknown as jest.Mock).mockImplementation((url) => {
      throw new Error(`Redirected to ${url}`)
    })
  })

  it('should redirect with error if createClient fails', async () => {
    (createClient as jest.Mock).mockRejectedValue(new Error('Supabase environment variables are missing'))

    await expect(signup(mockFormData)).rejects.toThrow('Redirected to /signup?error=Configuration error. Please contact support.')

    expect(createClient).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/signup?error=Configuration error. Please contact support.')
  })

  it('should call signUp and redirect on success', async () => {
    (createClient as jest.Mock).mockResolvedValue(mockSupabase)
    mockSupabase.auth.signUp.mockResolvedValue({ error: null })

    await expect(signup(mockFormData)).rejects.toThrow('Redirected to /app')

    expect(createClient).toHaveBeenCalled()
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(redirect).toHaveBeenCalledWith('/app')
  })

  it('should redirect with error if signUp fails', async () => {
    (createClient as jest.Mock).mockResolvedValue(mockSupabase)
    mockSupabase.auth.signUp.mockResolvedValue({ error: { message: 'Auth error' } })

    await expect(signup(mockFormData)).rejects.toThrow('Redirected to /signup?error=Auth%20error')

    expect(mockSupabase.auth.signUp).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/signup?error=Auth%20error')
  })
})
