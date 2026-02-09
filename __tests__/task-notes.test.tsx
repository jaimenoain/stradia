import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskDetailSheet } from '@/components/dashboard/task-detail-sheet'
import { MarketBoardTask } from '@/types'
import { updateTaskExecutionNotes } from '@/app/app/(dashboard)/[marketId]/dashboard/actions'
import { useSearchParams } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: () => '/app/test-market/dashboard',
  useRouter: () => ({ replace: jest.fn() }),
}))

// Mock actions
jest.mock('@/app/app/(dashboard)/[marketId]/dashboard/actions', () => ({
  updateTaskExecutionNotes: jest.fn(),
}))

// Mock RichTextEditor
// eslint-disable-next-line react/display-name
jest.mock('@/components/ui/rich-text-editor', () => ({
  RichTextEditor: ({ value, onChange, onBlur }: any) => (
    <textarea
      data-testid="notes-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  ),
}))

const mockTasks: MarketBoardTask[] = [
  {
    id: 'task-1',
    status: 'TODO',
    is_ghost: false,
    title: 'Manual Task',
    description: 'Desc',
    task_type: 'A',
    origin_template_task_id: 'origin-1',
    weight: 0,
    is_optional: false,
    task_config: {},
    execution_notes: 'Initial notes',
  },
  {
    id: 'task-2',
    status: 'TODO',
    is_ghost: false,
    title: 'AI Task',
    description: 'Desc',
    task_type: 'B',
    origin_template_task_id: 'origin-2',
    weight: 1,
    is_optional: false,
    task_config: {},
    execution_notes: null,
  },
]

describe('Task Detail Sheet - Notes', () => {
  const mockUseSearchParams = useSearchParams as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Notes tab for Type A task', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('taskId=task-1'))
    render(<TaskDetailSheet tasks={mockTasks} marketId="test-market" />)

    // Check if Notes tab exists
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('does NOT render Notes tab for Type B task', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('taskId=task-2'))
    render(<TaskDetailSheet tasks={mockTasks} marketId="test-market" />)

    // Check if Notes tab exists (should not)
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })

  it('loads initial notes and saves on blur', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('taskId=task-1'))
    render(<TaskDetailSheet tasks={mockTasks} marketId="test-market" />)

    // Click Notes tab
    fireEvent.click(screen.getByText('Notes'))

    // Check editor content
    const editor = screen.getByTestId('notes-editor')
    expect(editor).toHaveValue('Initial notes')

    // Change content
    fireEvent.change(editor, { target: { value: 'Updated notes' } })
    expect(editor).toHaveValue('Updated notes')

    // Blur to trigger save
    fireEvent.blur(editor)

    await waitFor(() => {
      expect(updateTaskExecutionNotes).toHaveBeenCalledWith('test-market', 'task-1', 'Updated notes')
    })
  })
})
