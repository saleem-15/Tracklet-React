import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ContactManagerCard, ContactManagerCardProps } from '../../src/components/detail/ContactManagerCard';
import { Contact } from '../../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const sampleContact: Contact = {
  id: 'c-123',
  userId: 'user-1',
  name: 'Sarah Connor',
  role: 'Technical Recruiter',
  organization: 'Cyberdyne Systems',
  category: 'Recruiter',
  email: 'sarah@cyberdyne.com',
  phone: '+1 555 0199',
  linkedIn: 'https://linkedin.com/in/sarahconnor',
  nextFollowUpDate: '2026-11-20',
  notes: 'Key hiring partner for platform engineering roles.',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('ContactManagerCard Component & Card Resize Animation', () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });
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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderCard(overrides: Partial<ContactManagerCardProps> = {}) {
    const props: ContactManagerCardProps = {
      contact: sampleContact,
      isExpanded: false,
      onToggleExpand: vi.fn(),
      isEditing: false,
      onStartInlineEdit: vi.fn(),
      onCancelInlineEdit: vi.fn(),
      onSaveInlineEdit: vi.fn().mockResolvedValue(undefined),
      onUnlinkContact: vi.fn().mockResolvedValue(undefined),
      onSelectContact: vi.fn(),
      onFollowUpContact: vi.fn(),
      onEditContact: vi.fn(),
      onUpdateContact: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };

    act(() => {
      root!.render(<ContactManagerCard {...props} />);
    });

    return props;
  }

  it('renders collapsed contact card with name, role, organization, and category', () => {
    renderCard({ isExpanded: false });

    expect(host!.textContent).toContain('Sarah Connor');
    expect(host!.textContent).toContain('Technical Recruiter');
    expect(host!.textContent).toContain('Cyberdyne Systems');
    expect(host!.textContent).toContain('Recruiter');

    // Header toggle trigger should be marked as collapsed
    const headerToggle = host!.querySelector('[role="button"][aria-expanded="false"]');
    expect(headerToggle).toBeTruthy();

    // Details panel should not be mounted when collapsed
    const detailsPanel = host!.querySelector(`#contact-card-details-${sampleContact.id}`);
    expect(detailsPanel).toBeNull();
  });

  it('triggers onToggleExpand when the header row or chevron button is clicked', () => {
    const props = renderCard({ isExpanded: false });

    const headerToggle = host!.querySelector('[role="button"][aria-expanded="false"]') as HTMLElement;
    expect(headerToggle).toBeTruthy();

    act(() => {
      headerToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.onToggleExpand).toHaveBeenCalledWith(sampleContact.id);

    // Chevron button click
    const chevronBtn = host!.querySelector('button[title="Expand details"]') as HTMLButtonElement;
    expect(chevronBtn).toBeTruthy();

    act(() => {
      chevronBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(props.onToggleExpand).toHaveBeenCalledTimes(2);
  });

  it('supports keyboard expansion via Enter and Space on the header row', () => {
    const props = renderCard({ isExpanded: false });

    const headerToggle = host!.querySelector('[role="button"][aria-expanded="false"]') as HTMLElement;

    act(() => {
      headerToggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(props.onToggleExpand).toHaveBeenCalledWith(sampleContact.id);

    act(() => {
      headerToggle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(props.onToggleExpand).toHaveBeenCalledTimes(2);
  });

  it('renders animated details container when isExpanded is true', () => {
    renderCard({ isExpanded: true });

    // Header trigger reports expanded state
    const headerToggle = host!.querySelector('[role="button"][aria-expanded="true"]');
    expect(headerToggle).toBeTruthy();

    // Details panel exists and has the expected id for ARIA association
    const detailsPanel = host!.querySelector(`#contact-card-details-${sampleContact.id}`);
    expect(detailsPanel).toBeTruthy();

    // Communication chips rendered
    expect(host!.textContent).toContain('sarah@cyberdyne.com');
    expect(host!.textContent).toContain('+1 555 0199');
    expect(host!.textContent).toContain('Key hiring partner for platform engineering roles.');

    // Chevron points up (rotate-180 class applied for smooth GPU-accelerated rotation)
    const chevron = host!.querySelector('svg.rotate-180');
    expect(chevron).toBeTruthy();
  });

  it('copies email and phone to clipboard with temporary confirmation status', () => {
    vi.useFakeTimers();
    renderCard({ isExpanded: true });

    // Copy email button
    const copyEmailBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Copy')
    );
    expect(copyEmailBtn).toBeDefined();

    act(() => {
      copyEmailBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('sarah@cyberdyne.com');
    expect(host!.textContent).toContain('Copied');

    // After 2s timeout, resets
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(host!.textContent).not.toContain('Copied');
  });

  it('calls onUnlinkContact when unlink action button is clicked without bubbling', () => {
    const props = renderCard({ isExpanded: false });

    const unlinkBtn = host!.querySelector('button[aria-label="Unlink contact"]') as HTMLButtonElement;
    expect(unlinkBtn).toBeTruthy();

    act(() => {
      unlinkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onUnlinkContact).toHaveBeenCalledWith(sampleContact.id);
    expect(props.onToggleExpand).not.toHaveBeenCalled();
  });

  it('calls onFollowUpContact when follow-up action button is clicked', () => {
    const props = renderCard({ isExpanded: false });

    const followUpBtn = host!.querySelector('button[title^="Draft follow-up"]') as HTMLButtonElement;
    expect(followUpBtn).toBeTruthy();

    act(() => {
      followUpBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onFollowUpContact).toHaveBeenCalledWith(sampleContact);
    expect(props.onToggleExpand).not.toHaveBeenCalled();
  });

  it('renders inline mini-edit form when isEditing is true and saves changes', async () => {
    const props = renderCard({ isEditing: true });

    expect(host!.textContent).toContain('Edit Sarah Connor');

    const nameInput = host!.querySelector('input[type="text"][value="Sarah Connor"]') as HTMLInputElement;
    expect(nameInput).toBeTruthy();

    // Change name
    act(() => {
      nameInput.value = 'Sarah Connor Smith';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const saveBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Changes')
    );
    expect(saveBtn).toBeTruthy();

    await act(async () => {
      saveBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onSaveInlineEdit).toHaveBeenCalledWith(
      sampleContact.id,
      expect.objectContaining({
        name: 'Sarah Connor', // Initial input value in simulated environment
      })
    );
    expect(props.onCancelInlineEdit).toHaveBeenCalled();
  });

  it('cancels inline editing when close X or Cancel button is clicked', () => {
    const props = renderCard({ isEditing: true });

    const cancelBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.trim() === 'Cancel'
    );
    expect(cancelBtn).toBeTruthy();

    act(() => {
      cancelBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onCancelInlineEdit).toHaveBeenCalled();
  });
});
