/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MarketBoard } from '@/components/dashboard/market-board'
import { updateTaskStatus } from '@/app/app/(dashboard)/[marketId]/board/actions'

// Mock dependencies
jest.mock('@/app/app/(dashboard)/[marketId]/board/actions', () => ({
  updateTaskStatus: jest.fn(),
  acceptTask: jest.fn(),
  rejectTask: jest.fn(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/app/test-market/board',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ marketId: 'test-market' }),
}))

// Mock DndContext to capture onDragEnd
jest.mock('@dnd-kit/core', () => {
  const original = jest.requireActual('@dnd-kit/core')
  return {
    ...original,
    DndContext: ({ onDragEnd, children }: any) => {
      return (
        <div data-testid="dnd-context">
          <button
            data-testid="trigger-drag-end"
            onClick={() =>
              onDragEnd({
                active: { id: 'task-1' },
                over: { id: 'DONE' },
              })
            }
          >
            Trigger Drag End
          </button>
          {children}
        </div>
      )
    },
    useDroppable: () => ({
      setNodeRef: jest.fn(),
    }),
    useSensor: jest.fn(),
    useSensors: jest.fn(),
    DragOverlay: ({ children }: any) => <div>{children}</div>,
    closestCorners: jest.fn(),
    PointerSensor: jest.fn(),
    KeyboardSensor: jest.fn(),
  }
})

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: jest.fn(),
  sortableKeyboardCoordinates: jest.fn(),
}))

// Mock useQuery
jest.mock('@tanstack/react-query', () => {
  const original = jest.requireActual('@tanstack/react-query')
  return {
    ...original,
    useQuery: jest.fn(),
    useMutation: (options: any) => ({
      mutate: (variables: any) => options.mutationFn(variables),
    }),
    useQueryClient: () => ({
      cancelQueries: jest.fn(),
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
    }),
  }
})

import * as ReactQuery from '@tanstack/react-query'

describe('MarketBoard Completion Logic', () => {
  const mockTasks = [
    {
      id: 'task-1',
      title: 'Task A',
      status: 'TODO',
      task_type: 'A',
      is_ghost: false,
      origin_template_task_id: 'tmpl-1',
      description: 'Test Description',
      weight: 1,
      is_optional: false,
      task_config: {},
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(ReactQuery.useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    })
  })

  it('opens completion modal when moving Type A task to DONE', async () => {
    render(<MarketBoard marketId="test-market" />)

    // Trigger drag end
    fireEvent.click(screen.getByTestId('trigger-drag-end'))

    // Check if modal opens
    expect(screen.getByText('Confirm Completion')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your summary here...')).toBeInTheDocument()
  })

  it('calls updateTaskStatus with summary on confirm', async () => {
    render(<MarketBoard marketId="test-market" />)

    // Trigger drag end
    fireEvent.click(screen.getByTestId('trigger-drag-end'))

    // Fill summary
    fireEvent.change(screen.getByPlaceholderText('Type your summary here...'), {
      target: { value: 'Finished the work' },
    })

    // Click Confirm
    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(updateTaskStatus).toHaveBeenCalledWith(
        'test-market',
        'task-1',
        'DONE',
        'Finished the work'
      )
    })
  })

  it('does not call updateTaskStatus on cancel', async () => {
    render(<MarketBoard marketId="test-market" />)

    // Trigger drag end
    fireEvent.click(screen.getByTestId('trigger-drag-end'))

    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'))

    await waitFor(() => {
        expect(screen.queryByText('Confirm Completion')).not.toBeInTheDocument()
    })

    expect(updateTaskStatus).not.toHaveBeenCalled()
  })
})
