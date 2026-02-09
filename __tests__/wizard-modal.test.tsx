import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { WizardModal } from '@/components/dashboard/wizard-modal'

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => {
  return function MockEditor(props: any) {
    return <div data-testid="monaco-editor" data-value={props.value}>Mock Editor</div>
  }
})

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-spinner" />,
  XIcon: () => <div data-testid="close-icon" />,
}))

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('WizardModal', () => {
  const mockOnClose = jest.fn()
  const mockOnComplete = jest.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    taskConfig: {
      inputs: [
        { name: 'test_input', label: 'Test Input', type: 'text' as const, required: true },
      ],
    },
    taskType: 'C' as const,
    onComplete: mockOnComplete,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders step 1 (Input) initially', () => {
    render(<WizardModal {...defaultProps} />)
    expect(screen.getByText('Configure Task')).toBeInTheDocument()
    expect(screen.getByLabelText(/Test Input/i)).toBeInTheDocument()
  })

  it('transitions to step 2 (Loading) on submit', async () => {
    render(<WizardModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText(/Test Input/i), {
      target: { value: 'some value' },
    })

    fireEvent.click(screen.getByText('Generate'))

    expect(screen.getByText('Stradia AI is drafting...')).toBeInTheDocument()
    expect(screen.getByTestId('loader-spinner')).toBeInTheDocument()
  })

  it('transitions to step 3 (Review) after delay', async () => {
    render(<WizardModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText(/Test Input/i), {
      target: { value: 'some value' },
    })

    fireEvent.click(screen.getByText('Generate'))

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      expect(screen.getByText('Review & Approve')).toBeInTheDocument()
    })

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
  })

  it('calls onComplete with correct data on approval', async () => {
    render(<WizardModal {...defaultProps} />)

    // Step 1
    fireEvent.change(screen.getByLabelText(/Test Input/i), {
      target: { value: 'my-input-value' },
    })
    fireEvent.click(screen.getByText('Generate'))

    // Step 2 -> 3
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      expect(screen.getByText('Approve & Execute')).toBeInTheDocument()
    })

    // Step 3
    fireEvent.click(screen.getByText('Approve & Execute'))

    expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
      inputs: { test_input: 'my-input-value' },
      generatedCode: expect.stringContaining('// Generated code for Executive task'),
    }))
  })

  it('shows correct button label for Type B', async () => {
    render(<WizardModal {...defaultProps} taskType="B" />)

    fireEvent.change(screen.getByLabelText(/Test Input/i), {
      target: { value: 'val' },
    })
    fireEvent.click(screen.getByText('Generate'))

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    await waitFor(() => {
        expect(screen.getByText('Approve & Save')).toBeInTheDocument()
    })
  })

  it('handles empty config correctly', () => {
    render(<WizardModal {...defaultProps} taskConfig={{ inputs: [] }} />)
    expect(screen.getByText('No specific configuration is required for this task.')).toBeInTheDocument()
    expect(screen.getByText('Generate')).toBeInTheDocument()
  })
})
