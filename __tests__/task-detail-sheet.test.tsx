import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskDetailSheet } from '@/components/dashboard/task-detail-sheet'
import { updateTaskExecutionNotes } from '@/app/app/(dashboard)/[marketId]/board/actions'
import * as navigation from 'next/navigation'

// Mock server actions
jest.mock('@/app/app/(dashboard)/[marketId]/board/actions', () => ({
  updateTaskExecutionNotes: jest.fn(),
  getTaskExecutionHistory: jest.fn(),
}))

// Mock HistoryList
jest.mock('@/components/dashboard/history-list', () => ({
  HistoryList: () => <div data-testid="history-list">History Content</div>
}))

// Mock DriftViewer
jest.mock('@/components/dashboard/drift-viewer', () => ({
  DriftViewer: () => <div data-testid="drift-viewer">Drift Viewer Content</div>
}))

// Mock RichTextEditor
jest.mock('@/components/ui/rich-text-editor', () => ({
  RichTextEditor: ({ value, onChange, onBlur, disabled }: any) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
    />
  ),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

const mockTaskA = {
  id: 'task-1',
  status: 'TODO',
  is_ghost: false,
  title: 'Task A',
  description: 'Desc A',
  task_type: 'A',
  origin_template_task_id: 'template-1',
  weight: 1,
  is_optional: false,
  task_config: {},
  execution_notes: 'Initial notes',
} as any

const mockTaskB = {
  ...mockTaskA,
  id: 'task-2',
  title: 'Task B',
  task_type: 'B',
  execution_notes: null,
} as any

describe('TaskDetailSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(navigation.usePathname as jest.Mock).mockReturnValue('/app/market-1/board')
    ;(navigation.useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() })
    ;(navigation.useParams as jest.Mock).mockReturnValue({ marketId: 'market-1' })
  })

  it('renders Notes tab for Type A task', () => {
    ;(navigation.useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'taskId' ? 'task-1' : null),
      toString: () => 'taskId=task-1',
    })

    render(<TaskDetailSheet tasks={[mockTaskA]} />)

    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('does NOT render Notes tab for Type B task', () => {
    ;(navigation.useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'taskId' ? 'task-2' : null),
      toString: () => 'taskId=task-2',
    })

    render(<TaskDetailSheet tasks={[mockTaskA, mockTaskB]} />)

    expect(screen.getByText('Task B')).toBeInTheDocument()
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })

  it('renders History tab for Type B task', () => {
    ;(navigation.useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => (key === 'taskId' ? 'task-2' : null),
        toString: () => 'taskId=task-2',
    })

    render(<TaskDetailSheet tasks={[mockTaskA, mockTaskB]} />)

    expect(screen.getByText('History')).toBeInTheDocument()

    // Click History tab
    fireEvent.click(screen.getByText('History'))

    expect(screen.getByTestId('history-list')).toBeInTheDocument()
  })

  it('updates execution notes on blur', async () => {
    ;(navigation.useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'taskId' ? 'task-1' : null),
      toString: () => 'taskId=task-1',
    })

    render(<TaskDetailSheet tasks={[mockTaskA]} />)

    // Click Notes tab
    fireEvent.click(screen.getByText('Notes'))

    const editor = screen.getByTestId('rich-text-editor')
    expect(editor).toHaveValue('Initial notes')

    // Type new notes
    fireEvent.change(editor, { target: { value: 'Updated notes' } })
    expect(editor).toHaveValue('Updated notes')

    // Blur
    fireEvent.blur(editor)

    expect(updateTaskExecutionNotes).toHaveBeenCalledWith('market-1', 'task-1', 'Updated notes')
  })

  it('disables editor for Ghost tasks', () => {
    const ghostTask = { ...mockTaskA, id: 'temp_123', is_ghost: true, execution_notes: null }
    ;(navigation.useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'taskId' ? 'temp_123' : null),
      toString: () => 'taskId=temp_123',
    })

    render(<TaskDetailSheet tasks={[ghostTask]} />)

    fireEvent.click(screen.getByText('Notes'))

    const editor = screen.getByTestId('rich-text-editor')
    expect(editor).toBeDisabled()
    expect(screen.getByText(/Accept this task/)).toBeInTheDocument()
  })
})
