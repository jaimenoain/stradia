import { render, screen, fireEvent, act } from '@testing-library/react'
import { MarketBoard } from '@/components/dashboard/market-board'
import { MarketBoardTask } from '@/types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'

const mockPush = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/app/test-market/dashboard',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ marketId: 'test-market' }),
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
}))

// Mock DnD Kit
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: jest.fn(({ children }) => <div data-testid="dnd-context">{children}</div>),
  useDroppable: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  closestCorners: jest.fn(),
  DragOverlay: jest.fn(({ children }) => <div data-testid="drag-overlay">{children}</div>),
}))

jest.mock('@dnd-kit/sortable', () => ({
  ...jest.requireActual('@dnd-kit/sortable'),
  useSortable: jest.fn(),
  SortableContext: jest.fn(({ children }) => <div data-testid="sortable-context">{children}</div>),
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: {},
}))

jest.mock('@/components/dashboard/wizard-modal', () => ({
  WizardModal: jest.fn(({ isOpen }) => (
    isOpen ? <div data-testid="wizard-modal">Wizard Modal Content</div> : null
  )),
}))

jest.mock('@/components/dashboard/completion-modal', () => ({
  CompletionModal: jest.fn(({ isOpen, onConfirm }) => (
    isOpen ? (
      <div data-testid="completion-modal">
        <button onClick={() => onConfirm('Test Summary')}>Confirm Completion</button>
      </div>
    ) : null
  )),
}))

// Helper to mock useQuery response
const mockUseQuery = (data: MarketBoardTask[]) => {
  (useQuery as jest.Mock).mockReturnValue({
    data,
    isLoading: false,
    error: null,
  })
}

// Helper to mock useMutation
const mockMutate = jest.fn()
const mockUseMutation = () => {
  (useMutation as jest.Mock).mockReturnValue({
    mutate: mockMutate,
  })
}

const mockTasks: MarketBoardTask[] = [
  {
    id: 'task-A',
    status: 'TODO',
    is_ghost: false,
    title: 'Type A Task',
    description: null,
    task_type: 'A',
    origin_template_task_id: 'origin-A',
    weight: 0,
    is_optional: false,
    task_config: {},
  },
  {
    id: 'task-B',
    status: 'TODO',
    is_ghost: false,
    title: 'Type B Task',
    description: null,
    task_type: 'B',
    origin_template_task_id: 'origin-B',
    weight: 1,
    is_optional: false,
    task_config: {},
  },
  {
    id: 'task-C',
    status: 'TODO',
    is_ghost: false,
    title: 'Type C Task',
    description: null,
    task_type: 'C',
    origin_template_task_id: 'origin-C',
    weight: 2,
    is_optional: false,
    task_config: {},
  },
  {
    id: 'temp_ghost',
    status: 'GHOST',
    is_ghost: true,
    title: 'Ghost Task',
    description: null,
    task_type: 'A',
    origin_template_task_id: 'origin-ghost',
    weight: 3,
    is_optional: true,
    task_config: {},
  },
  {
    id: 'drifted-1',
    status: 'DRIFTED',
    is_ghost: false,
    title: 'Drifted Task',
    description: null,
    task_type: 'A',
    origin_template_task_id: 'origin-drifted',
    weight: 4,
    is_optional: false,
    task_config: {},
  }
]

describe('MarketBoard Logic Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMutation();

    (useDroppable as jest.Mock).mockReturnValue({
      setNodeRef: jest.fn(),
      isOver: false,
    });
    (useSortable as jest.Mock).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    });

    // Default QueryClient mock
    (useQueryClient as jest.Mock).mockReturnValue({
        cancelQueries: jest.fn(),
        getQueryData: jest.fn(),
        setQueryData: jest.fn(),
        invalidateQueries: jest.fn(),
    })
  })

  it('renders tasks correctly', () => {
    mockUseQuery(mockTasks)
    render(<MarketBoard marketId="test-market" />)

    expect(screen.getByText('Type A Task')).toBeInTheDocument()
    expect(screen.getByText('Type B Task')).toBeInTheDocument()
    expect(screen.getByText('Ghost Task')).toBeInTheDocument()
    expect(screen.getByText('Drifted Task')).toBeInTheDocument()
  })

  it('Type A Validation: Allows dragging Type A task to DONE', () => {
    mockUseQuery(mockTasks)
    const { getByText, getByTestId } = render(<MarketBoard marketId="test-market" />)

    // Simulate DragEnd
    const dndContextMock = (DndContext as unknown as jest.Mock)
    const onDragEnd = dndContextMock.mock.calls[dndContextMock.mock.calls.length - 1][0].onDragEnd

    // Trigger drop of Type A to DONE
    act(() => {
      onDragEnd({
          active: { id: 'task-A' },
          over: { id: 'DONE' }
      })
    })

    // Expect mutation NOT to be called immediately (modal opens)
    expect(mockMutate).not.toHaveBeenCalled()

    // Check modal is open
    expect(getByTestId('completion-modal')).toBeInTheDocument()

    // Confirm
    fireEvent.click(getByText('Confirm Completion'))

    // Expect mutation to be called now
    expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 'task-A', newStatus: 'DONE', completionSummary: 'Test Summary' })
    )
  })

  it('Type B Constraint: Prevents dragging Type B task to DONE', () => {
    mockUseQuery(mockTasks)
    render(<MarketBoard marketId="test-market" />)

    const dndContextMock = (DndContext as unknown as jest.Mock)
    const onDragEnd = dndContextMock.mock.calls[dndContextMock.mock.calls.length - 1][0].onDragEnd

    // Trigger drop of Type B to DONE
    onDragEnd({
        active: { id: 'task-B' },
        over: { id: 'DONE' }
    })

    // Expect mutation NOT to be called (logic prevents it)
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('Type C Constraint: Prevents dragging Type C task to DONE', () => {
    mockUseQuery(mockTasks)
    render(<MarketBoard marketId="test-market" />)

    const dndContextMock = (DndContext as unknown as jest.Mock)
    const onDragEnd = dndContextMock.mock.calls[dndContextMock.mock.calls.length - 1][0].onDragEnd

    // Trigger drop of Type C to DONE
    onDragEnd({
        active: { id: 'task-C' },
        over: { id: 'DONE' }
    })

    // Expect mutation NOT to be called
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('Ghost Card Locking: Ghost cards are disabled for dragging', () => {
    mockUseQuery(mockTasks)
    render(<MarketBoard marketId="test-market" />)

    // Check if useSortable was called with disabled: true for the ghost task
    // The implementation passes disabled prop based on isGhost
    // We can spy on useSortable calls

    const useSortableMock = (useSortable as jest.Mock)
    // Find the call for the ghost task
    const ghostCall = useSortableMock.mock.calls.find(call => call[0].id === 'temp_ghost')

    expect(ghostCall).toBeTruthy()
    expect(ghostCall[0].disabled).toBe(true)
  })

  it('Drifted Column Lock: Items in Drifted column are disabled', () => {
    mockUseQuery(mockTasks)
    render(<MarketBoard marketId="test-market" />)

    const useSortableMock = (useSortable as jest.Mock)
    // Find the call for the drifted task
    const driftedCall = useSortableMock.mock.calls.find(call => call[0].id === 'drifted-1')

    expect(driftedCall).toBeTruthy()
    expect(driftedCall[0].disabled).toBe(true) // Should be disabled because DRIFTED column disables dragging
  })

  it('Drifted Column Lock: Drifted column is disabled for drops', () => {
    mockUseQuery(mockTasks)
    render(<MarketBoard marketId="test-market" />)

    const useDroppableMock = (useDroppable as jest.Mock)
    // Find call for DRIFTED column
    const driftedColumnCall = useDroppableMock.mock.calls.find(call => call[0].id === 'DRIFTED')

    expect(driftedColumnCall).toBeTruthy()
    expect(driftedColumnCall[0].disabled).toBe(true)
  })

  it('Opening Wizard: Clicking Type B task opens WizardModal', () => {
    mockUseQuery(mockTasks)
    const { getByText, getByTestId } = render(<MarketBoard marketId="test-market" />)

    const taskB = getByText('Type B Task')
    fireEvent.click(taskB)

    expect(getByTestId('wizard-modal')).toBeInTheDocument()

    // Check navigation was NOT triggered
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('Legacy Navigation: Clicking Type A task triggers navigation', () => {
    mockUseQuery(mockTasks)
    const { getByText, queryByTestId } = render(<MarketBoard marketId="test-market" />)

    const taskA = getByText('Type A Task')
    fireEvent.click(taskA)

    expect(queryByTestId('wizard-modal')).not.toBeInTheDocument()

    // Check navigation WAS triggered
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('taskId=task-A'), expect.anything())
  })
})
