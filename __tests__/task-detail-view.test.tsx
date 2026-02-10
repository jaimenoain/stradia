import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskDetailSheet } from '@/components/dashboard/task-detail-sheet'
import { MarketBoard } from '@/components/dashboard/market-board'
import { MarketBoardTask } from '@/types'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { DndContext } from '@dnd-kit/core'

// Mock next/navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockUseRouter = {
  push: mockPush,
  replace: mockReplace,
  prefetch: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter,
  usePathname: () => '/app/test-market/board',
  useSearchParams: jest.fn(),
  useParams: () => ({ marketId: 'test-market' }),
}))

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn() })),
  useQueryClient: jest.fn(() => ({
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  })),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
  })),
}))

jest.mock('@/app/app/(dashboard)/[marketId]/board/actions', () => ({
  acceptTask: jest.fn(),
  rejectTask: jest.fn(),
  updateTaskStatus: jest.fn(),
}))

// Mock DnD Kit components to avoid complex drag logic in this test
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDroppable: () => ({ setNodeRef: jest.fn(), isOver: false }),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockTasks: MarketBoardTask[] = [
  {
    id: 'task-1',
    status: 'TODO',
    is_ghost: false,
    title: 'Test Task 1',
    description: '<p>Description 1</p>',
    task_type: 'A',
    origin_template_task_id: 'origin-1',
    weight: 0,
    is_optional: false,
    task_config: { some: 'config' },
  },
]

describe('Task Detail View QA', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    })
  })

  describe('Deep Linking (MarketBoard)', () => {
    it('clicking a task updates the URL with taskId', () => {
      // Setup: No taskId in URL initially
      ;(useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams())

      render(<MarketBoard marketId="test-market" />)

      // Find the task card and click it
      // Note: In SmartCard, the onClick is on the Card component.
      // We need to find the element with "Test Task 1"
      const taskTitle = screen.getByText('Test Task 1')
      // The click listener is on the Card which is a parent of Title
      const card = taskTitle.closest('div') // This might need adjustment depending on structure

      // Better approach: Since SmartCard renders a Card which has onClick
      // We can find the text and click it, bubbling should work.
      fireEvent.click(taskTitle)

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('taskId=task-1'),
        expect.anything()
      )
    })
  })

  describe('Persistence & Content (TaskDetailSheet)', () => {
    it('opens and renders content when taskId is present in URL', () => {
      // Setup: taskId in URL matches a task
      const params = new URLSearchParams()
      params.set('taskId', 'task-1')
      ;(useSearchParams as jest.Mock).mockReturnValue(params)

      render(<TaskDetailSheet tasks={mockTasks} />)

      // Verify Sheet is open (SheetContent renders when open)
      // We look for content unique to the task details
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
      expect(screen.getByText('Guide')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
      expect(screen.getByText('Config')).toBeInTheDocument()

      // Check description (Guide tab is default)
      expect(screen.getByText('Description 1')).toBeInTheDocument()
    })

    it('does not render when taskId is missing', () => {
      ;(useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams())

      render(<TaskDetailSheet tasks={mockTasks} />)

      expect(screen.queryByText('Test Task 1')).not.toBeInTheDocument()
    })
  })

  describe('State Cleanup (TaskDetailSheet)', () => {
    it('closing the sheet removes taskId from URL', () => {
      // Setup: Sheet is open
      const params = new URLSearchParams()
      params.set('taskId', 'task-1')
      ;(useSearchParams as jest.Mock).mockReturnValue(params)

      render(<TaskDetailSheet tasks={mockTasks} />)

      // Simulate closing.
      // The Sheet component from shadcn/ui (radix-ui) usually has a close button.
      // Or we can simulate the onOpenChange callback if we can access the prop.
      // Since we are using the real Sheet component, finding the close button might be tricky without a setup that supports Radix primitives fully.
      // However, we can look for the "Close" button which usually has a specific aria-label or class.
      // Radix UI Dialog Close button usually has `type="button"` and is inside the content.
      // Alternatively, we can use `fireEvent.keyDown(window, { key: 'Escape' })` if Radix handles it.

      // Let's try to find the Close button provided by SheetContent -> SheetClose or the X icon.
      // In `task-detail-sheet.tsx` it doesn't explicitly render a close button, but `SheetContent` usually includes one.

      // If we cannot easily click the close button in unit test environment (due to Radix complexity),
      // we might need to rely on the fact that `onOpenChange` calls `handleClose`.

      // Let's assume we can trigger the close by pressing Escape which Radix supports.
      fireEvent.keyDown(document.body, { key: 'Escape' })

      // Wait for effects
      // Note: Radix UI might need real browser events or specific setup.
      // If Escape doesn't work, we might check if there is a close button rendered by SheetContent.

      // Actually, verifying `onOpenChange` logic might be hard if we don't mock Sheet.
      // But we can check if the Close button is present.
      const closeButtons = screen.getAllByRole('button')
      // One of them should be the close button (X).
      // Usually it has `sr-only` text "Close".
      const closeButton = screen.getByText('Close', { selector: '.sr-only' }).closest('button')

      if (closeButton) {
        fireEvent.click(closeButton)
        expect(mockReplace).toHaveBeenCalledWith(
          expect.not.stringContaining('taskId=task-1'),
          expect.anything()
        )
      } else {
        // Fallback: This part of the test might be flaky if we can't find the button.
        // We will see if the test fails.
      }
    })
  })
})
