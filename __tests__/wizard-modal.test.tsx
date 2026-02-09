import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { WizardModal } from '@/components/dashboard/wizard-modal'

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => {
  return function MockEditor(props: any) {
    return (
      <div
        data-testid="monaco-editor"
        data-value={props.value}
        data-readonly={props.options?.readOnly ? 'true' : 'false'}
      >
        Mock Editor
      </div>
    )
  }
})

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-spinner" />,
  XIcon: () => <div data-testid="close-icon" />,
}))

// Mock Sonner and Confetti
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('canvas-confetti', () => jest.fn())

// Mock Supabase Client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'
const mockCreateClient = createClient as jest.Mock
const mockInvoke = jest.fn()

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
    taskId: 'task-123',
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

  it('renders step 1 (Input) initially with dynamic inputs', () => {
    render(<WizardModal {...defaultProps} />)
    expect(screen.getByText('Configure Task')).toBeInTheDocument()
    expect(screen.getByLabelText(/Test Input/i)).toBeInTheDocument()
  })

  it('transitions to step 2 (Loading) on submit and shows specific loading UI', async () => {
    render(<WizardModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText(/Test Input/i), {
      target: { value: 'some value' },
    })

    fireEvent.click(screen.getByText('Generate'))

    expect(screen.getByText('Stradia AI is drafting...')).toBeInTheDocument()
    expect(screen.getByTestId('loader-spinner')).toBeInTheDocument()
  })

  it('transitions to step 3 (Review) and editor is Read-Only', async () => {
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

    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect(editor).toHaveAttribute('data-readonly', 'true')
  })

  it('calls onComplete with correct data on approval', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null })
    mockCreateClient.mockReturnValue({
      functions: {
        invoke: mockInvoke,
      },
    })
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

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
        inputs: { test_input: 'my-input-value' },
        generatedCode: expect.stringContaining('"test_input": "my-input-value"'),
      }))
    })
  })

  it('shows "Approve & Save" for Type B tasks', async () => {
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

  it('handles undefined taskConfig gracefully', () => {
    // Suppress console.error if needed, or rely on optional chaining fix
    render(<WizardModal {...defaultProps} taskConfig={undefined as any} />)
    expect(screen.getByText('No specific configuration is required for this task.')).toBeInTheDocument()
    expect(screen.getByText('Generate')).toBeInTheDocument()
  })
})
