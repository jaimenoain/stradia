import { render, screen, fireEvent } from '@testing-library/react'
import { SmartCard } from '@/components/dashboard/smart-card'
import { MarketBoardTask } from '@/types'
import '@testing-library/jest-dom'

const mockTask: MarketBoardTask = {
  id: 'task-1',
  status: 'TODO',
  is_ghost: false,
  title: 'Test Task',
  description: '<p>Test Description</p>',
  task_type: 'A',
  origin_template_task_id: 'origin-1',
  weight: 0,
  is_optional: false,
  task_config: {}
}

const mockGhostTask: MarketBoardTask = {
  ...mockTask,
  id: 'temp_ghost-1',
  status: 'GHOST',
  is_ghost: true,
  is_optional: true
}

describe('SmartCard Component', () => {
  it('renders real task correctly', () => {
    render(<SmartCard task={mockTask} />)
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    // Should NOT show accept/reject buttons
    expect(screen.queryByTitle('Accept Task')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Reject Task')).not.toBeInTheDocument()
  })

  it('renders ghost task correctly with actions', () => {
    const onAccept = jest.fn()
    const onReject = jest.fn()
    render(<SmartCard task={mockGhostTask} onAccept={onAccept} onReject={onReject} />)

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByTitle('Accept Task')).toBeInTheDocument()
    expect(screen.getByTitle('Reject Task')).toBeInTheDocument()

    // Test interactions
    fireEvent.click(screen.getByTitle('Accept Task'))
    expect(onAccept).toHaveBeenCalledWith(mockGhostTask)

    fireEvent.click(screen.getByTitle('Reject Task'))
    expect(onReject).toHaveBeenCalledWith(mockGhostTask)
  })
})
