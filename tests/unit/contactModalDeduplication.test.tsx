import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ContactModal } from '../../src/components/contacts/ContactModal';
import { Contact } from '../../src/types';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

describe('ContactModal Deduplication & Guard (Issue #57)', () => {
  const existingContacts: Contact[] = [
    {
      id: 'contact-existing-1',
      userId: 'user-1',
      name: 'Elena Rostova',
      email: 'elena@cyberdyne.com',
      organization: 'Cyberdyne',
      role: 'Lead Recruiter',
      category: 'Recruiter',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
  });

  function renderModal(props: Partial<React.ComponentProps<typeof ContactModal>> = {}) {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) host.remove();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    const defaultProps = {
      isOpen: true,
      contacts: existingContacts,
      applications: [],
      onClose: vi.fn(),
      onSave: vi.fn().mockResolvedValue(undefined),
      onSelectContact: vi.fn(),
    };

    act(() => {
      root!.render(<ContactModal {...defaultProps} {...props} />);
    });
  }

  it('displays duplicate warning and prevents immediate submission when identical contact is entered', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    renderModal({ onSave: mockSave, onClose: mockClose });

    // Fill the form with duplicate contact details
    const nameInput = host!.querySelector('input[placeholder="Jane Doe"]') as HTMLInputElement;
    const emailInput = host!.querySelector('input[placeholder="jane@company.com"]') as HTMLInputElement;
    const form = host!.querySelector('form') as HTMLFormElement;

    expect(nameInput).not.toBeNull();
    expect(emailInput).not.toBeNull();
    expect(form).not.toBeNull();

    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set;
      nativeInputValueSetter!.call(nameInput, 'Elena Rostova');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeInputValueSetter!.call(emailInput, 'elena@cyberdyne.com');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Attempt to submit
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // onSave and onClose must NOT have been called yet
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();

    // Duplicate warning banner must be visible in modal
    const warningText = host!.textContent;
    expect(warningText).toContain('A matching contact already exists');
    expect(warningText).toContain('Elena Rostova');
    expect(warningText).toContain('elena@cyberdyne.com');
    expect(warningText).toContain('View Existing Contact');
    expect(warningText).toContain('Create duplicate anyway');
  });

  it('navigates to existing contact when "View Existing Contact" button is clicked', async () => {
    const mockSelectContact = vi.fn();
    const mockClose = vi.fn();

    renderModal({ onSelectContact: mockSelectContact, onClose: mockClose });

    const nameInput = host!.querySelector('input[placeholder="Jane Doe"]') as HTMLInputElement;
    const emailInput = host!.querySelector('input[placeholder="jane@company.com"]') as HTMLInputElement;
    const form = host!.querySelector('form') as HTMLFormElement;

    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set;
      nativeSetter!.call(nameInput, 'Elena Rostova');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter!.call(emailInput, 'elena@cyberdyne.com');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Find and click "View Existing Contact"
    const viewButton = Array.from(host!.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('View Existing Contact')
    );
    expect(viewButton).toBeDefined();

    act(() => {
      viewButton!.click();
    });

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockSelectContact).toHaveBeenCalledWith('contact-existing-1');
  });

  it('allows user to force create duplicate if they click "Create duplicate anyway"', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    renderModal({ onSave: mockSave, onClose: mockClose });

    const nameInput = host!.querySelector('input[placeholder="Jane Doe"]') as HTMLInputElement;
    const emailInput = host!.querySelector('input[placeholder="jane@company.com"]') as HTMLInputElement;
    const form = host!.querySelector('form') as HTMLFormElement;

    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set;
      nativeSetter!.call(nameInput, 'Elena Rostova');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter!.call(emailInput, 'elena@cyberdyne.com');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Find and click "Create duplicate anyway"
    const forceButton = Array.from(host!.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Create duplicate anyway')
    );
    expect(forceButton).toBeDefined();

    act(() => {
      forceButton!.click();
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Elena Rostova',
        email: 'elena@cyberdyne.com',
      })
    );
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
