import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateMarketModal } from '@/components/markets/create-market-modal'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}))

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))

// Mock server action
jest.mock('@/app/app/(dashboard)/admin/markets/actions', () => ({
  createMarket: jest.fn(),
}))

describe('CreateMarketModal', () => {
  const mockInvalidateQueries = jest.fn()
  const mockMutate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks();

    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    (useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  })

  it('renders default trigger button', () => {
    render(<CreateMarketModal />)
    expect(screen.getByRole('button', { name: /Add Market/i })).toBeInTheDocument()
  })

  it('renders custom trigger button', () => {
    render(<CreateMarketModal trigger={<button>Custom Trigger</button>} />)
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
    expect(screen.queryByText('Add Market')).not.toBeInTheDocument()
  })

  it('opens modal on trigger click', () => {
    render(<CreateMarketModal />)
    const trigger = screen.getByRole('button', { name: /Add Market/i })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Create Market' })).toBeInTheDocument()
  })

  it('calls createMarket mutation on form submission', () => {
    render(<CreateMarketModal />)
    fireEvent.click(screen.getByRole('button', { name: /Add Market/i }))

    // Fill form
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test Market' } })
    fireEvent.change(screen.getByLabelText(/Region/i), { target: { value: 'US' } })
    fireEvent.change(screen.getByLabelText(/Currency/i), { target: { value: 'USD' } })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create Market' }))

    expect(mockMutate).toHaveBeenCalledWith(
        { name: 'Test Market', region_code: 'US', currency: 'USD' }
    )
  })

  it('redirects to board on success if redirectToBoard is true', async () => {
    // Setup mutation mock to call onSuccess
    (useMutation as jest.Mock).mockImplementation(({ onSuccess }) => ({
      mutate: (_variables: unknown) => {
        onSuccess({ id: 'new-market-id' })
      },
      isPending: false,
    }))

    render(<CreateMarketModal redirectToBoard={true} />)
    fireEvent.click(screen.getByRole('button', { name: /Add Market/i }))

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test Market' } })
    fireEvent.change(screen.getByLabelText(/Region/i), { target: { value: 'US' } })
    fireEvent.change(screen.getByLabelText(/Currency/i), { target: { value: 'USD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Market' }))

    await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['markets'] })
        expect(mockPush).toHaveBeenCalledWith('/app/new-market-id/board')
    })
  })

  it('does not redirect on success if redirectToBoard is false', async () => {
    // Setup mutation mock
    (useMutation as jest.Mock).mockImplementation(({ onSuccess }) => ({
      mutate: (_variables: unknown) => {
        onSuccess({ id: 'new-market-id' })
      },
      isPending: false,
    }))

    render(<CreateMarketModal redirectToBoard={false} />)
    fireEvent.click(screen.getByRole('button', { name: /Add Market/i }))

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test Market' } })
    fireEvent.change(screen.getByLabelText(/Region/i), { target: { value: 'US' } })
    fireEvent.change(screen.getByLabelText(/Currency/i), { target: { value: 'USD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Market' }))

    await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['markets'] })
        expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
