import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskDetailSheet } from '@/components/dashboard/task-detail-sheet'
import * as navigation from 'next/navigation'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

jest.mock('@/components/dashboard/history-list', () => ({
  HistoryList: () => <div data-testid="history-list">History Content</div>
}))

jest.mock('@/components/ui/rich-text-editor', () => ({
  RichTextEditor: () => <div data-testid="rich-text-editor" />
}))

jest.mock('@/components/dashboard/drift-viewer', () => ({
  DriftViewer: ({ isOpen, onClose }: any) => isOpen ? (
    <div data-testid="drift-viewer">
      Drift Viewer Modal
      <button onClick={onClose}>Close</button>
    </div>
  ) : null
}))

// Mock server actions
jest.mock('@/app/app/(dashboard)/[marketId]/board/actions', () => ({
  updateTaskExecutionNotes: jest.fn(),
  getTaskExecutionHistory: jest.fn(),
}))

const mockDriftedTask = {
  id: 'task-drifted',
  status: 'DRIFTED',
  title: 'Drifted Task',
  task_type: 'C',
  task_config: {},
} as any

const mockNormalTask = {
  id: 'task-normal',
  status: 'DONE',
  title: 'Normal Task',
  task_type: 'C',
} as any

describe('Drift Alert Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(navigation.usePathname as jest.Mock).mockReturnValue('/app/market-1/board')
    ;(navigation.useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() })
    ;(navigation.useParams as jest.Mock).mockReturnValue({ marketId: 'market-1' })
  })

  it('renders Drift Alert when task status is DRIFTED', () => {
    ;(navigation.useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'taskId' ? 'task-drifted' : null),
      toString: () => 'taskId=task-drifted',
    })

    render(<TaskDetailSheet tasks={[mockDriftedTask]} />)

    expect(screen.getByText('Drift Alert: External changes detected')).toBeInTheDocument()
    expect(screen.getByText('Review Changes')).toBeInTheDocument()
  })

  it('does NOT render Drift Alert when task status is NOT DRIFTED', () => {
    ;(navigation.useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'taskId' ? 'task-normal' : null),
      toString: () => 'taskId=task-normal',
    })

    render(<TaskDetailSheet tasks={[mockNormalTask]} />)

    expect(screen.queryByText('Drift Alert: External changes detected')).not.toBeInTheDocument()
    expect(screen.queryByText('Review Changes')).not.toBeInTheDocument()
  })

  it('opens DriftViewer when "Review Changes" is clicked', () => {
    ;(navigation.useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'taskId' ? 'task-drifted' : null),
      toString: () => 'taskId=task-drifted',
    })

    render(<TaskDetailSheet tasks={[mockDriftedTask]} />)

    fireEvent.click(screen.getByText('Review Changes'))

    expect(screen.getByTestId('drift-viewer')).toBeInTheDocument()
  })
})
