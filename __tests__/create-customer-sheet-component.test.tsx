import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateCustomerSheet } from '@/app/(admin)/customers/create-customer-sheet';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock server action
vi.mock('@/app/actions/admin-actions', () => ({
  createCustomer: vi.fn(),
}));

describe('CreateCustomerSheet', () => {
  it('renders the trigger button', () => {
    render(
      <CreateCustomerSheet>
        <button>Open Sheet</button>
      </CreateCustomerSheet>
    );
    expect(screen.getByText('Open Sheet')).toBeDefined();
  });

  it('opens the sheet when trigger is clicked', async () => {
    render(
      <CreateCustomerSheet>
        <button>Open Sheet</button>
      </CreateCustomerSheet>
    );
    fireEvent.click(screen.getByText('Open Sheet'));
    await waitFor(() => {
      expect(screen.getByText('Create a new organization.')).toBeDefined();
    });
  });

  it('auto-generates slug from company name', async () => {
    render(
      <CreateCustomerSheet>
        <button>Open Sheet</button>
      </CreateCustomerSheet>
    );
    fireEvent.click(screen.getByText('Open Sheet'));

    const nameInput = screen.getByLabelText('Company Name') as HTMLInputElement;
    const slugInput = screen.getByLabelText('Domain / Slug') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'My Company Name' } });

    await waitFor(() => {
         expect(slugInput.value).toBe('my-company-name');
    });
  });

  it('does not auto-generate slug if manually edited', async () => {
    render(
      <CreateCustomerSheet>
        <button>Open Sheet</button>
      </CreateCustomerSheet>
    );
    fireEvent.click(screen.getByText('Open Sheet'));

    const nameInput = screen.getByLabelText('Company Name') as HTMLInputElement;
    const slugInput = screen.getByLabelText('Domain / Slug') as HTMLInputElement;

    fireEvent.change(slugInput, { target: { value: 'custom-slug' } });
    fireEvent.change(nameInput, { target: { value: 'My Company Name' } });

    await waitFor(() => {
        expect(slugInput.value).toBe('custom-slug');
    });
  });
});
