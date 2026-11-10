import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ContactManagerSection, ContactManagerSectionProps } from '../../src/components/detail/ContactManagerSection';
import { Contact } from '../../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const contactsList: Contact[] = [
  {
    id: 'c-1',
    userId: 'user-1',
    name: 'Alex Murphy',
    role: 'Staff Recruiter',
    organization: 'Omni Consumer Products',
    category: 'Recruiter',
    email: 'alex@ocp.com',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'c-2',
    userId: 'user-1',
    name: 'Ellen Ripley',
    role: 'VP Engineering',
    organization: 'Weyland-Yutani',
    category: 'Hiring Manager',
    email: 'ripley@weyland.com',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

describe('ContactManagerSection Component & Animation Orchestration', () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

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

  function renderSection(overrides: Partial<ContactManagerSectionProps> = {}) {
    const props: ContactManagerSectionProps = {
      allContacts: contactsList,
      linkedContactIds: ['c-1', 'c-2'],
      onLinkContact: vi.fn().mockResolvedValue(undefined),
      onUnlinkContact: vi.fn().mockResolvedValue(undefined),
      onCreateAndLinkContact: vi.fn().mockResolvedValue(undefined),
      onUpdateContact: vi.fn().mockResolvedValue(undefined),
      onSelectContact: vi.fn(),
      onFollowUpContact: vi.fn(),
      ...overrides,
    };

    act(() => {
      root!.render(<ContactManagerSection {...props} />);
    });

    return props;
  }

  it('renders section title and count badge for linked contacts', () => {
    renderSection();

    expect(host!.textContent).toContain('Contacts');
    expect(host!.textContent).toContain('(2)');
    expect(host!.textContent).toContain('Alex Murphy');
    expect(host!.textContent).toContain('Ellen Ripley');
  });

  it('toggles link contact picker smoothly on button click', () => {
    renderSection();

    const linkBtn = host!.querySelector('button') as HTMLButtonElement;
    expect(linkBtn.textContent).toContain('Link Contact');

    // Picker not in DOM initially
    expect(host!.querySelector('[placeholder*="Search"]')).toBeNull();

    // Click to open
    act(() => {
      linkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(linkBtn.textContent).toContain('Close');
    expect(host!.querySelector('[placeholder*="Search"]')).toBeTruthy();

    // Click to close
    act(() => {
      linkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(linkBtn.textContent).toContain('Link Contact');
  });

  it('renders empty state when no contacts are linked', () => {
    renderSection({ linkedContactIds: [] });

    expect(host!.textContent).toContain('No contacts linked to this application yet.');
  });
});
