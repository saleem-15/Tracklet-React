import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EmailLogCard, EmailLogCardProps } from '../../src/components/detail/EmailLogCard';
import { EmailLog } from '../../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const sampleEmail: EmailLog = {
  id: 'email-1',
  direction: 'inbound',
  sender: 'jane@stripe.com',
  recipient: 'user@example.com',
  subject: 'Invitation to Technical Screen - Senior Software Engineer',
  date: '2026-11-10',
  timestamp: '2026-11-10T14:30:00Z',
  snippet: 'Hi there, we were very impressed by your background and would love to invite you to a 45-minute technical screen.',
  body: `Hi there,

We were very impressed by your background and would love to invite you to a 45-minute technical screen with our engineering team.

Please let us know your availability over the next few business days:
- Wednesday 2pm - 5pm ET
- Thursday 10am - 1pm ET
- Friday 1pm - 4pm ET

Looking forward to speaking soon!

Best regards,
Jane Doe`,
};

describe('EmailLogCard Component & Card Resize Animation', () => {
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

  function renderCard(overrides: Partial<EmailLogCardProps> = {}) {
    const props: EmailLogCardProps = {
      email: sampleEmail,
      contacts: [],
      companyName: 'Stripe',
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onNavigateToApplication: vi.fn(),
      ...overrides,
    };

    act(() => {
      root!.render(<EmailLogCard {...props} />);
    });

    return props;
  }

  it('renders collapsed email card with clamped preview and "Read full email" button', () => {
    renderCard();

    expect(host!.textContent).toContain('Invitation to Technical Screen');
    expect(host!.textContent).toContain('jane@stripe.com');

    // Trigger button should report collapsed state
    const toggleBtn = host!.querySelector('button[aria-expanded="false"]') as HTMLButtonElement;
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.textContent).toContain('Read full email');

    // In collapsed state, container is clipped with overflow: hidden
    const bodyContainer = host!.querySelector(`#email-body-expanded-${sampleEmail.id}`) as HTMLElement;
    expect(bodyContainer).toBeTruthy();
    expect(bodyContainer.style.overflow).toBe('hidden');
  });

  it('smoothly expands details drawer with ARIA attributes and 180deg chevron rotation on click', () => {
    renderCard();

    const toggleBtn = host!.querySelector('button[aria-expanded="false"]') as HTMLButtonElement;
    expect(toggleBtn).toBeTruthy();

    act(() => {
      toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Button label and state flip
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleBtn.textContent).toContain('Show less');

    // Animated container is rendered and linked via aria-controls
    const expandedBody = host!.querySelector(`#email-body-expanded-${sampleEmail.id}`) as HTMLElement;
    expect(expandedBody).toBeTruthy();
    expect(expandedBody.style.overflow).toBe('hidden');
    expect(expandedBody.textContent).toContain('Please let us know your availability');

    // Chevron rotated 180 degrees
    const chevron = host!.querySelector('svg.rotate-180');
    expect(chevron).toBeTruthy();
  });

  it('collapses back cleanly on second click', () => {
    renderCard();

    const toggleBtn = host!.querySelector('button[aria-expanded="false"]') as HTMLButtonElement;

    // Expand
    act(() => {
      toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    // Collapse
    act(() => {
      toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(toggleBtn.textContent).toContain('Read full email');
  });

  it('renders ⋯ action menu and handles text copy to clipboard', async () => {
    renderCard();

    const moreBtn = host!.querySelector('button[aria-label="More actions for this email"]') as HTMLButtonElement;
    expect(moreBtn).toBeTruthy();

    // Open menu
    act(() => {
      moreBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const copyBtn = Array.from(host!.querySelectorAll('button[role="menuitem"]')).find((b) =>
      b.textContent?.includes('Copy text')
    );
    expect(copyBtn).toBeTruthy();

    await act(async () => {
      copyBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
