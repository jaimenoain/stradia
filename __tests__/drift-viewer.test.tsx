
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { DriftViewer } from '@/components/dashboard/drift-viewer'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import '@testing-library/jest-dom'

// Mocks
jest.mock('@/lib/supabase/client')
jest.mock('@tanstack/react-query')
jest.mock('next/navigation')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  DiffEditor: ({ original, modified }: any) => (
    <div data-testid="mock-diff-editor">
      <div data-testid="diff-original">{original}</div>
      <div data-testid="diff-modified">{modified}</div>
    </div>
  ),
}))

// Mock TextEncoder
import { TextEncoder } from 'util'
global.TextEncoder = TextEncoder

// Mock crypto for hash generation
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
})

describe('DriftViewer', () => {
  const mockOnClose = jest.fn()
  const mockInvalidateQueries = jest.fn()
  const mockSupabase = {
    functions: {
      invoke: jest.fn(),
    },
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(),
      update: jest.fn(),
      eq: jest.fn(),
    })),
  }

  const taskId = 'task-123'
  const marketId = 'market-456'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    })
    ;(useParams as jest.Mock).mockReturnValue({ marketId })
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('renders correctly when open', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: {
        expected: { foo: 'bar' },
        actual: { foo: 'baz' },
      },
      error: null,
    })

    await act(async () => {
        render(<DriftViewer taskId={taskId} isOpen={true} onClose={mockOnClose} />)
    })

    expect(screen.getByText('Drift Analysis')).toBeInTheDocument()
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('mock-diff-editor')).toBeInTheDocument()
    })

    expect(screen.getByText('Stradia Expected (Original)')).toBeInTheDocument()
    expect(screen.getByText('Live Actual (Modified)')).toBeInTheDocument()
  })

  it('handles Overwrite action', async () => {
    const expectedData = { foo: 'bar' }
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: {
        expected: expectedData,
        actual: { foo: 'baz' },
      },
      error: null,
    })

    // Mock second invoke for execute-action
    mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true },
        error: null,
    })

    await act(async () => {
        render(<DriftViewer taskId={taskId} isOpen={true} onClose={mockOnClose} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Overwrite External')).toBeInTheDocument()
    })

    const overwriteBtn = screen.getByText('Overwrite External')
    fireEvent.click(overwriteBtn)

    await waitFor(() => {
        // First call was get-drift-details
        // Second call should be execute-action
        expect(mockSupabase.functions.invoke).toHaveBeenLastCalledWith('execute-action', {
            body: { taskId, payload: expectedData },
        })
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['market-board', marketId] })
        expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles Ingest action', async () => {
    const actualData = { foo: 'baz' }
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: {
        expected: { foo: 'bar' },
        actual: actualData,
      },
      error: null,
    })

    mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
    })

    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    const mockUpdate = jest.fn().mockResolvedValue({ error: null })
    const mockEq = jest.fn().mockReturnValue({ error: null }) // final step of chain

    // Mock the chain: from -> insert
    // AND from -> update -> eq
    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'execution_logs') {
            return { insert: mockInsert }
        }
        if (table === 'market_tasks') {
            return { update: mockUpdate }
        }
        return {}
    })

    // Ensure mockUpdate returns the chainable object
    mockUpdate.mockReturnValue({ eq: mockEq })

    await act(async () => {
        render(<DriftViewer taskId={taskId} isOpen={true} onClose={mockOnClose} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Ingest Drift')).toBeInTheDocument()
    })

    const ingestBtn = screen.getByText('Ingest Drift')
    fireEvent.click(ingestBtn)

    await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
            task_id: taskId,
            user_id: 'user-1',
            status: 'DONE',
            payload: actualData,
            snapshot_id: null,
        })
        // Check update call - we can't easily check the hash since it's generated inside component
        // but we can check the status update
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            status: 'DONE',
            execution_notes: expect.stringContaining('Drift resolved via Ingest'),
        }))
        expect(mockEq).toHaveBeenCalledWith('id', taskId)
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['market-board', marketId] })
        expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
