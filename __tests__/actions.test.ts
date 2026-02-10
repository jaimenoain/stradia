import { createLocalTask } from '@/app/app/(dashboard)/[marketId]/board/actions'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('createLocalTask', () => {
  const mockFrom = jest.fn()
  const mockInsert = jest.fn()
  const mockSelect = jest.fn()
  const mockSingle = jest.fn()
  const mockGetUser = jest.fn()
  const mockAuth = { getUser: mockGetUser }

  beforeEach(() => {
    jest.clearAllMocks()
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockFrom.mockReturnValue({ insert: mockInsert })
    ;(createClient as jest.Mock).mockResolvedValue({
      from: mockFrom,
      auth: mockAuth,
    })
  })

  it('should insert a local task with correct parameters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user1' } } })
    mockSingle.mockResolvedValue({ data: { id: 'task1' }, error: null })

    const marketId = 'market1'
    const title = 'Local Task'
    const description = 'Desc'

    await createLocalTask(marketId, title, description)

    expect(mockFrom).toHaveBeenCalledWith('market_tasks')
    expect(mockInsert).toHaveBeenCalledWith({
      market_id: marketId,
      title,
      description,
      status: 'TODO',
      task_type: 'A',
      origin_template_task_id: null,
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/app/${marketId}/board`)
  })

  it('should throw error if user is not authorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await expect(createLocalTask('m1', 't1')).rejects.toThrow('Unauthorized')
  })
})
