import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HistoryList } from '@/components/dashboard/history-list'
import { useQuery } from '@tanstack/react-query'

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}))

jest.mock('@/app/app/(dashboard)/[marketId]/dashboard/actions', () => ({
  getTaskExecutionHistory: jest.fn(),
}))

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => {
  return function MockEditor(props: any) {
    return <div data-testid="monaco-editor" data-value={props.value}>{props.value}</div>
  }
})

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  Eye: () => <div data-testid="eye-icon" />,
  CheckCircle2: () => <div data-testid="check-circle" />,
  XCircle: () => <div data-testid="x-circle" />,
}))

// Mock Dialog
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode, open: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('HistoryList', () => {
  const mockMarketId = 'market-123'
  const mockTaskId = 'task-456'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<HistoryList marketId={mockMarketId} taskId={mockTaskId} />)
    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('renders error state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
    })

    render(<HistoryList marketId={mockMarketId} taskId={mockTaskId} />)
    expect(screen.getByText('Failed to load history.')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })

    render(<HistoryList marketId={mockMarketId} taskId={mockTaskId} />)
    expect(screen.getByText('No execution history found.')).toBeInTheDocument()
  })

  it('renders logs and opens snapshot modal', async () => {
    const mockLogs = [
      {
        id: 'log-1',
        task_id: mockTaskId,
        user_id: 'user-1',
        snapshot_id: 'snap-1',
        status: 'SUCCESS',
        payload: { foo: 'bar' },
        created_at: '2023-01-01T10:00:00Z',
        snapshots: {
          content: { key: 'value' },
        },
      },
    ]

    ;(useQuery as jest.Mock).mockReturnValue({
      data: mockLogs,
      isLoading: false,
      error: null,
    })

    render(<HistoryList marketId={mockMarketId} taskId={mockTaskId} />)

    expect(screen.getByText('success')).toBeInTheDocument()
    expect(screen.getByText(/User: user-1/)).toBeInTheDocument()

    // Click View Snapshot
    const viewButton = screen.getByText('View Snapshot')
    fireEvent.click(viewButton)

    // Check Dialog opens
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    // Check Editor content
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-value', expect.stringContaining('"key": "value"'))
  })

  it('renders payload if snapshot content is missing', async () => {
      const mockLogs = [
        {
          id: 'log-2',
          task_id: mockTaskId,
          user_id: null,
          snapshot_id: null,
          status: 'FAILURE',
          payload: { error: 'Something went wrong' },
          created_at: '2023-01-01T11:00:00Z',
          snapshots: null,
        },
      ]

      ;(useQuery as jest.Mock).mockReturnValue({
        data: mockLogs,
        isLoading: false,
        error: null,
      })

      render(<HistoryList marketId={mockMarketId} taskId={mockTaskId} />)

      expect(screen.getByText('failure')).toBeInTheDocument()
      expect(screen.getByText(/User: System/)).toBeInTheDocument()

      const viewButton = screen.getByText('View Snapshot')
      fireEvent.click(viewButton)

      await waitFor(() => {
          const editor = screen.getByTestId('monaco-editor')
          expect(editor).toHaveAttribute('data-value', expect.stringContaining('"error": "Something went wrong"'))
      })
    })

  it('renders payload if snapshots object exists but content is null', async () => {
    const mockLogs = [
      {
        id: 'log-3',
        task_id: mockTaskId,
        user_id: null,
        snapshot_id: 'snap-3',
        status: 'DRIFTED',
        payload: { drift: 'detected' },
        created_at: '2023-01-01T12:00:00Z',
        snapshots: { content: null },
      },
    ]

    ;(useQuery as jest.Mock).mockReturnValue({
      data: mockLogs,
      isLoading: false,
      error: null,
    })

    render(<HistoryList marketId={mockMarketId} taskId={mockTaskId} />)

    expect(screen.getByText('drifted')).toBeInTheDocument()

    const viewButton = screen.getByText('View Snapshot')
    fireEvent.click(viewButton)

    await waitFor(() => {
      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveAttribute('data-value', expect.stringContaining('"drift": "detected"'))
    })
  })
})
