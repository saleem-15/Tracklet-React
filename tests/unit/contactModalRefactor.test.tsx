import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ContactModal } from '../../src/components/contacts/ContactModal';
import { Application, Contact } from '../../src/types';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

describe('ContactModal Refactored Lifecycle & Entry Points', () => {
  const sampleApps: Application[] = [
    {
      id: 'app-google-1',
      userId: 'user-1',
      company: 'Google',
      role: 'Senior Frontend Engineer',
      status: 'Interview',
      dateApplied: '2026-10-01',
      platform: 'LinkedIn',
      stageUpdatedAt: '2026-10-01',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
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
      contacts: [],
      applications: sampleApps,
      onClose: vi.fn(),
      onSave: vi.fn().mockResolvedValue(undefined),
      onSelectContact: vi.fn(),
    };

    act(() => {
      root!.render(<ContactModal {...defaultProps} {...props} />);
    });
  }

  it('Entry Point A (Contacts Directory): initializes as standalone contact with default category and empty organization', () => {
    renderModal();

    const nameInput = host!.querySelector('input[placeholder="Jane Doe"]') as HTMLInputElement;
    const companyInput = host!.querySelector('input[placeholder="e.g. Google"]') as HTMLInputElement;

    expect(nameInput.value).toBe('');
    expect(companyInput.value).toBe('');
    expect(host!.textContent).toContain('New Contact');
  });

  it('Entry Point B (Job Drawer): pre-binds active application, pre-fills company name, and sets category to Recruiter', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    renderModal({ initialApplicationId: 'app-google-1', onSave: mockSave });

    const companyInput = host!.querySelector('input[placeholder="e.g. Google"]') as HTMLInputElement;
    expect(companyInput.value).toBe('Google');

    // Fill contact name and submit
    const nameInput = host!.querySelector('input[placeholder="Jane Doe"]') as HTMLInputElement;
    const form = host!.querySelector('form') as HTMLFormElement;

    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set;
      nativeSetter!.call(nameInput, 'Sundar Pichai');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sundar Pichai',
        category: 'Recruiter',
        organization: 'Google',
        applicationIds: ['app-google-1'],
      })
    );
  });

  it('normalizes LinkedIn URL by auto-prepending https://', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSave: mockSave });

    const nameInput = host!.querySelector('input[placeholder="Jane Doe"]') as HTMLInputElement;
    const linkedInInput = host!.querySelector('input[placeholder="linkedin.com/in/username"]') as HTMLInputElement;
    const form = host!.querySelector('form') as HTMLFormElement;

    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set;
      nativeSetter!.call(nameInput, 'Alex Morgan');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter!.call(linkedInInput, 'linkedin.com/in/alex-morgan');
      linkedInInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alex Morgan',
        linkedIn: 'https://linkedin.com/in/alex-morgan',
      })
    );
  });

  it('validates email format and displays error message for invalid email', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSave: mockSave });

    const nameInput = host!.querySelector('input[placeholder="Jane Doe"]') as HTMLInputElement;
    const emailInput = host!.querySelector('input[placeholder="jane@company.com"]') as HTMLInputElement;
    const form = host!.querySelector('form') as HTMLFormElement;

    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set;
      nativeSetter!.call(nameInput, 'Invalid Contact');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter!.call(emailInput, 'not-an-email');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockSave).not.toHaveBeenCalled();
    expect(host!.textContent).toContain('Please enter a valid email address');
  });

  it('closes modal when CloseIconButton is clicked', () => {
    const mockClose = vi.fn();
    renderModal({ onClose: mockClose });

    const closeBtn = host!.querySelector('button[aria-label="Close (Esc)"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    act(() => {
      closeBtn.click();
    });

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('focuses the name input field automatically when opened, not the header close button', async () => {
    vi.useFakeTimers();
    renderModal();

    const nameInput = host!.querySelector('input[placeholder="Jane Doe"]') as HTMLInputElement;
    const closeBtn = host!.querySelector('button[aria-label="Close (Esc)"]') as HTMLButtonElement;

    // Advance 50ms modal autofocus timer
    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(document.activeElement).toBe(nameInput);
    expect(document.activeElement).not.toBe(closeBtn);
    vi.useRealTimers();
  });
});
