import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DriftViewer } from '@/components/dashboard/drift-viewer'
import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextEncoder, TextDecoder })

// Mock crypto
const mockDigest = jest.fn().mockResolvedValue(new ArrayBuffer(32))
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest,
    },
  },
})

// Mock Supabase
const mockInsert = jest.fn().mockResolvedValue({ error: null })
const mockUpdate = jest.fn() // Chainable mock
const mockUpdateExecute = jest.fn().mockResolvedValue({ error: null })
mockUpdate.mockReturnValue({ eq: mockUpdateExecute })

const mockInvoke = jest.fn().mockResolvedValue({ data: { expected: { foo: 'bar' }, actual: { foo: 'baz' } }, error: null })
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

const mockSupabase = {
  functions: {
    invoke: mockInvoke,
  },
  from: (table: string) => {
    if (table === 'execution_logs') return { insert: mockInsert }
    if (table === 'market_tasks') return { update: mockUpdate }
    return {}
  },
  auth: {
    getUser: mockGetUser,
  },
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// Mock Navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ marketId: 'market-1' }),
}))

// Mock Query Client
const mockInvalidateQueries = jest.fn()
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}))

// Mock Editor
jest.mock('@monaco-editor/react', () => ({
  DiffEditor: () => <div data-testid="diff-editor">Diff Editor</div>,
}))

// Mock Toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('DriftViewer Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInvoke.mockResolvedValue({ data: { expected: { foo: 'bar' }, actual: { foo: 'baz' } }, error: null })
    mockInsert.mockResolvedValue({ error: null })
    mockUpdateExecute.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('renders buttons when data is loaded', async () => {
    render(<DriftViewer taskId="task-1" isOpen={true} onClose={jest.fn()} />)

    await waitFor(() => expect(screen.getByTestId('diff-editor')).toBeInTheDocument())

    expect(screen.getByText('Overwrite External')).toBeInTheDocument()
    expect(screen.getByText('Ingest Drift')).toBeInTheDocument()
  })

  it('calls execute-action when Overwrite is clicked', async () => {
    const onClose = jest.fn()
    render(<DriftViewer taskId="task-1" isOpen={true} onClose={onClose} />)

    await waitFor(() => expect(screen.getByText('Overwrite External')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Overwrite External'))

    await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('execute-action', {
            body: { taskId: 'task-1', payload: { foo: 'bar' } }
        })
        expect(onClose).toHaveBeenCalled()
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['market-board', 'market-1'] })
    })
  })

  it('calls insert and update when Ingest is clicked', async () => {
    const onClose = jest.fn()
    render(<DriftViewer taskId="task-1" isOpen={true} onClose={onClose} />)

    await waitFor(() => expect(screen.getByText('Ingest Drift')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Ingest Drift'))

    await waitFor(() => {
        // Check Insert
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            task_id: 'task-1',
            user_id: 'user-1',
            status: 'DONE',
            payload: { foo: 'baz' }
        }))
        // Check Update
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            status: 'DONE',
        }))
        expect(mockUpdateExecute).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['market-board', 'market-1'] })
    })
  })
})
