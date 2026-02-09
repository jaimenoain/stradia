import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { MarketBoard } from '@/components/dashboard/market-board'
import { useQuery, useMutation } from '@tanstack/react-query'

// Mock server actions
jest.mock('@/app/app/(dashboard)/[marketId]/dashboard/actions', () => ({
  updateTaskStatus: jest.fn(),
  acceptTask: jest.fn(),
  rejectTask: jest.fn(),
}))

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn() })),
  useQueryClient: jest.fn(() => ({
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  })),
}))

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: jest.fn(),
  }),
}))

// Mock DndContext to expose onDragEnd
jest.mock('@dnd-kit/core', () => {
  return {
    ...jest.requireActual('@dnd-kit/core'),
    DndContext: ({ onDragEnd, children }: any) => (
      <div data-testid="dnd-context">
        <button data-testid="trigger-drag-end" onClick={() => onDragEnd({
            active: { id: 'task-1' },
            over: { id: 'DONE' }
        })}>Drag Task A to DONE</button>
        <button data-testid="trigger-drag-end-b" onClick={() => onDragEnd({
            active: { id: 'task-2' },
            over: { id: 'DONE' }
        })}>Drag Task B to DONE</button>
        {children}
      </div>
    ),
    DragOverlay: ({ children }: any) => <div>{children}</div>,
    useSensor: jest.fn(),
    useSensors: jest.fn(),
    PointerSensor: jest.fn(),
    KeyboardSensor: jest.fn(),
  }
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '',
  useSearchParams: () => ({ get: jest.fn(), toString: jest.fn() }),
}))

// Mock simple components
jest.mock('@/components/dashboard/kanban-column', () => ({
  KanbanColumn: () => <div data-testid="kanban-column" />
}))
jest.mock('@/components/dashboard/empty-state', () => ({
    EmptyState: () => <div>Empty</div>
}))
jest.mock('@/components/dashboard/smart-card', () => ({
    SmartCard: () => <div>Card</div>
}))
jest.mock('@/components/dashboard/create-task-dialog', () => ({
    CreateTaskDialog: () => <div>Create</div>
}))
jest.mock('@/components/dashboard/task-detail-sheet', () => ({
    TaskDetailSheet: () => <div>Sheet</div>
}))

const mockTasks = [
  {
    id: 'task-1',
    status: 'TODO',
    task_type: 'A',
    title: 'Task A',
    weight: 1,
    origin_template_task_id: 't1',
  },
  {
    id: 'task-2',
    status: 'TODO',
    task_type: 'B',
    title: 'Task B',
    weight: 2,
    origin_template_task_id: 't2',
  }
]

describe('MarketBoard Completion Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    })
  })

  it('triggers modal when dragging Type A to DONE', async () => {
    ;(useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn() })
    render(<MarketBoard marketId="m1" />)

    fireEvent.click(screen.getByTestId('trigger-drag-end'))

    // Modal should appear
    expect(screen.getByText('Confirm Completion')).toBeInTheDocument()
  })

  it('does NOT trigger modal when dragging Type B to DONE', async () => {
    ;(useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn() })
    render(<MarketBoard marketId="m1" />)

    fireEvent.click(screen.getByTestId('trigger-drag-end-b'))

    // Modal should NOT appear
    expect(screen.queryByText('Confirm Completion')).not.toBeInTheDocument()
  })

  it('completes task when confirming modal', async () => {
    const mutateMock = jest.fn()
    ;(useMutation as jest.Mock).mockReturnValue({
        mutate: mutateMock
    })

    render(<MarketBoard marketId="m1" />)

    fireEvent.click(screen.getByTestId('trigger-drag-end'))

    // Fill summary
    fireEvent.change(screen.getByPlaceholderText('Type your summary here...'), {
        target: { value: 'Done summary' }
    })

    // Click Confirm
    fireEvent.click(screen.getByText('Confirm'))

    expect(mutateMock).toHaveBeenCalledWith({
        taskId: 'task-1',
        newStatus: 'DONE',
        completionSummary: 'Done summary'
    })
  })

  it('reverts move when cancelling modal', async () => {
    const mutateMock = jest.fn()
    ;(useMutation as jest.Mock).mockReturnValue({
        mutate: mutateMock
    })

    render(<MarketBoard marketId="m1" />)

    fireEvent.click(screen.getByTestId('trigger-drag-end'))

    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'))

    // Modal closed
    expect(screen.queryByText('Confirm Completion')).not.toBeInTheDocument()

    // No mutation
    expect(mutateMock).not.toHaveBeenCalled()
  })
})
