import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MarketBoard } from '@/components/dashboard/market-board'
import { MarketBoardTask } from '@/types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createLocalTask } from '@/app/app/(dashboard)/[marketId]/dashboard/actions'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/app/test-market/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
  })),
}))

jest.mock('@/app/app/(dashboard)/[marketId]/dashboard/actions', () => ({
  acceptTask: jest.fn(),
  rejectTask: jest.fn(),
  updateTaskStatus: jest.fn(),
  createLocalTask: jest.fn(),
}))

// Mock DnD Kit components
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: jest.fn(({ children }) => <div data-testid="dnd-context">{children}</div>),
  useDroppable: jest.fn(() => ({
    setNodeRef: jest.fn(),
    isOver: false,
  })),
  useSensor: jest.fn(),
  useSensors: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  closestCorners: jest.fn(),
  DragOverlay: jest.fn(({ children }) => <div data-testid="drag-overlay">{children}</div>),
}))

jest.mock('@dnd-kit/sortable', () => ({
  ...jest.requireActual('@dnd-kit/sortable'),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}))

const mockTasks: MarketBoardTask[] = [
  {
    id: 'local-task-1',
    status: 'TODO',
    is_ghost: false,
    title: 'My Local Task',
    description: null,
    task_type: 'A',
    origin_template_task_id: null, // Local Task
    weight: 0,
    is_optional: false,
    task_config: {},
  }
]

describe('Local Task Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue({
        cancelQueries: jest.fn(),
        getQueryData: jest.fn(),
        setQueryData: jest.fn(),
        invalidateQueries: jest.fn(),
    });
    // Default mock for useMutation
    (useMutation as jest.Mock).mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
    });
  })

  it('Visual Verification: Renders "Local" badge for local tasks', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    })

    render(<MarketBoard marketId="test-market" />)

    expect(screen.getByText('My Local Task')).toBeInTheDocument()
    const badges = screen.getAllByText('Local')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('Creation Flow: Can create a new local task via UI', async () => {
    // Provide some tasks so EmptyState is skipped and Kanban columns are rendered
    (useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    })

    // Mock mutation to immediately call the mutationFn
    const mutateMock = jest.fn()
    ;(useMutation as jest.Mock).mockImplementation(({ mutationFn }) => ({
        mutate: (variables: any) => {
            mutationFn(variables).catch((e: any) => console.error(e))
            mutateMock(variables)
        },
        isPending: false
    }))

    ;(createLocalTask as jest.Mock).mockResolvedValue({ id: 'new-task' })

    render(<MarketBoard marketId="test-market" />)

    // 1. Open Dialog
    const createButton = screen.getByRole('button', { name: 'Create Task' })
    fireEvent.click(createButton)

    // 2. Fill Form
    const titleInput = screen.getByPlaceholderText('Enter task title...')
    fireEvent.change(titleInput, { target: { value: 'New QA Task' } })

    // 3. Submit
    // Find the submit button inside the dialog
    const submitBtn = screen.getByText('Create Task', { selector: 'button' })
    fireEvent.click(submitBtn)

    // 4. Verify Action Call
    expect(createLocalTask).toHaveBeenCalledWith('test-market', 'New QA Task')

    // 5. Verify Mutation
    expect(mutateMock).toHaveBeenCalledWith('New QA Task')
  })
})
