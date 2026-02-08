import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/dashboard/empty-state'
import '@testing-library/jest-dom'

describe('EmptyState Component', () => {
  it('renders the empty state message and CTA button correctly', () => {
    const marketId = 'test-market-id'
    render(<EmptyState marketId={marketId} />)

    // Check for the main heading
    expect(screen.getByText('No strategies active')).toBeInTheDocument()

    // Check for the description
    expect(screen.getByText("You haven't started any strategies for this market yet.")).toBeInTheDocument()

    // Check for the CTA button text
    const link = screen.getByRole('link', { name: /No Tasks Active\. Check the Marketplace\./i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', `/app/${marketId}/marketplace`)
  })
})
