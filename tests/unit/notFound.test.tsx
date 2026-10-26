import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NotFoundView } from '../../src/components/NotFoundView';
import { NotFoundPage } from '../../src/components/NotFoundPage';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  window.history.pushState(null, '', '/');
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

describe('NotFoundView component (In-Workspace Oversized 404)', () => {
  it('renders oversized 404 numeral, heading, and single Back to home CTA without clutter', () => {
    act(() => {
      root!.render(<NotFoundView />);
    });

    expect(host?.textContent).toContain('404');
    expect(host?.textContent).toContain('This page took a wrong turn');
    expect(host?.textContent).toContain("The page you're looking for doesn't exist or may have been moved.");
    expect(host?.textContent).toContain('Back to home');

    // Confirms "Go back" button and clutter are completely removed
    expect(host?.textContent).not.toContain('Go back');
    expect(host?.textContent).not.toContain('Requested:');
    expect(host?.textContent).not.toContain('All Applications');
    expect(host?.textContent).not.toContain('Active Pipeline');
  });

  it('triggers onNavigateHome callback when Back to home button is clicked', () => {
    const handleNavigateHome = vi.fn();
    act(() => {
      root!.render(<NotFoundView onNavigateHome={handleNavigateHome} />);
    });

    const homeButton = Array.from(host?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('Back to home')
    );
    expect(homeButton).toBeDefined();

    act(() => {
      homeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenMobileSidebar when mobile header menu button is clicked', () => {
    const handleOpenMobile = vi.fn();
    act(() => {
      root!.render(<NotFoundView onOpenMobileSidebar={handleOpenMobile} />);
    });

    const menuBtn = host?.querySelector('button[aria-label="Open navigation menu"]');
    expect(menuBtn).toBeDefined();

    act(() => {
      menuBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleOpenMobile).toHaveBeenCalledTimes(1);
  });
});

describe('NotFoundPage component (Public Standalone Oversized 404)', () => {
  it('updates document.title and renders single Back to home CTA with landing page link', () => {
    act(() => {
      root!.render(<NotFoundPage landingUrl="https://usetracklet.com" />);
    });

    expect(document.title).toBe('404 — Page Not Found | Tracklet');
    expect(host?.textContent).toContain('404');
    expect(host?.textContent).toContain('This page took a wrong turn');
    expect(host?.textContent).toContain('Back to home');
    expect(host?.textContent).not.toContain('Go back');
    expect(host?.textContent).toContain('Privacy Policy');
    expect(host?.textContent).toContain('Terms of Service');

    const homeLinks = Array.from(host?.querySelectorAll('a') ?? []) as HTMLAnchorElement[];
    const ctaLink = homeLinks.find((a) => a.textContent?.includes('Back to home'));
    expect(ctaLink?.getAttribute('href')).toBe('https://usetracklet.com');
  });

  it('triggers onNavigateHome callback when Back to home link is clicked', () => {
    const handleNavigateHome = vi.fn();
    act(() => {
      root!.render(<NotFoundPage onNavigateHome={handleNavigateHome} />);
    });

    const homeLinks = Array.from(host?.querySelectorAll('a') ?? []) as HTMLAnchorElement[];
    const ctaLink = homeLinks.find((a) => a.textContent?.includes('Back to home'));
    expect(ctaLink).toBeDefined();

    act(() => {
      ctaLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(handleNavigateHome).toHaveBeenCalledTimes(1);
  });
});
