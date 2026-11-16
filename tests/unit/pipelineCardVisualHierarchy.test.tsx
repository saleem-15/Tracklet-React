import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PipelineCardShell } from '../../src/components/pipeline/PipelineCard';
import { Application } from '../../src/types';

describe('PipelineCard Visual Hierarchy & Typography Discipline', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders standardized compact salary notation with tabular-nums', async () => {
    const app: Application = {
      id: 'app-stripe',
      userId: 'user-1',
      company: 'Stripe',
      role: 'Staff Product Engineer',
      salary: '$215,000 / year',
      status: 'Offer',
      platform: 'Referral',
      dateApplied: '2026-07-10',
      stageUpdatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    const salaryEl = container.querySelector('.font-mono.tabular-nums');
    expect(salaryEl).not.toBeNull();
    expect(salaryEl?.textContent).toBe('$215k');
    expect(salaryEl?.className).toContain('text-xs');
    expect(salaryEl?.className).toContain('font-semibold');
    expect(salaryEl?.className).toContain('text-slate-700');
  });

  it('renders salary ranges using en-dash and compact notation', async () => {
    const app: Application = {
      id: 'app-linear',
      userId: 'user-1',
      company: 'Linear',
      role: 'Senior Frontend Engineer',
      salary: '$180,000 - $210,000',
      status: 'Interview',
      platform: 'Company Site',
      dateApplied: '2026-07-15',
      stageUpdatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    const salaryEl = container.querySelector('.font-mono.tabular-nums');
    expect(salaryEl?.textContent).toBe('$180k–$210k');
  });

  it('does NOT render a salary or fake range when no salary was provided by the user', async () => {
    const app: Application = {
      id: 'app-no-salary',
      userId: 'user-1',
      company: 'Acme Corp',
      role: 'Junior Frontend Developer',
      status: 'Applied',
      platform: 'LinkedIn',
      dateApplied: '2026-08-01',
      stageUpdatedAt: new Date().toISOString(),
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    // Must NOT contain tabular salary numbers or fake heuristics like $150k
    expect(container.querySelector('.font-mono.tabular-nums')).toBeNull();
    expect(container.textContent).not.toContain('150');
    expect(container.textContent).not.toContain('180');
    expect(container.textContent).not.toContain('$');
  });

  it('harmonizes company logo container to uniform 24px frame (w-6 h-6 rounded-md bg-slate-50)', async () => {
    const app: Application = {
      id: 'app-linear',
      userId: 'user-1',
      company: 'Linear',
      role: 'Senior Frontend Engineer',
      status: 'Interview',
      platform: 'Company Site',
      dateApplied: '2026-07-15',
      stageUpdatedAt: new Date().toISOString(),
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    const logoBox = container.querySelector('.w-6.h-6.rounded-md.bg-slate-50');
    expect(logoBox).not.toBeNull();
    expect(logoBox?.className).toContain('border-slate-200/70');
    expect(logoBox?.className).toContain('p-0.5');

    const titleEl = container.querySelector('span.text-sm.font-semibold.text-slate-900');
    expect(titleEl?.textContent).toBe('Linear');
  });

  it('enforces typography discipline for role title and location line with muted dot delimiter', async () => {
    const app: Application = {
      id: 'app-linear',
      userId: 'user-1',
      company: 'Linear',
      role: 'Senior Frontend Engineer',
      workLocation: 'Hybrid',
      location: 'San Francisco, CA',
      status: 'Interview',
      platform: 'Company Site',
      dateApplied: '2026-07-15',
      stageUpdatedAt: new Date().toISOString(),
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    // Role title
    const roleEl = container.querySelector('p.text-sm.font-medium.text-slate-800.line-clamp-1');
    expect(roleEl?.textContent).toBe('Senior Frontend Engineer');

    // Location line
    const metaEl = container.querySelector('p.font-sans.text-xs.text-slate-500');
    expect(metaEl).not.toBeNull();
    expect(metaEl?.textContent).toContain('Hybrid');
    expect(metaEl?.textContent).toContain('San Francisco, CA');

    // Muted separator
    const dot = metaEl?.querySelector('span.text-slate-300.mx-1');
    expect(dot?.textContent).toBe('·');
  });

  it('renders quiet task count indicator in footer without dumping raw task text on card face', async () => {
    const app: Application = {
      id: 'app-linear',
      userId: 'user-1',
      company: 'Linear',
      role: 'Senior Frontend Engineer',
      status: 'Interview',
      platform: 'Company Site',
      dateApplied: '2026-07-15',
      stageUpdatedAt: new Date().toISOString(),
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
      tasks: [
        {
          id: 't2',
          title: 'Prepare architecture deck for Thursday panel',
          completed: false,
          dueDate: '2026-07-28',
        },
      ],
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    // Does NOT render noisy full task string on card face
    expect(container.textContent).not.toContain('Prepare architecture deck');

    // Renders quiet, compact task count in footer
    const taskCountEl = container.querySelector('span[title="1 open task"]');
    expect(taskCountEl).not.toBeNull();
    expect(taskCountEl?.textContent).toBe('1');
  });

  it('omits passive ticking day counters (e.g. 5d, Today) to maintain canvas calm', async () => {
    const app: Application = {
      id: 'app-active',
      userId: 'user-1',
      company: 'Figma',
      role: 'Product Designer',
      status: 'Screening',
      platform: 'Greenhouse',
      dateApplied: '2026-07-20',
      stageUpdatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    expect(container.textContent).not.toContain('5d');
    expect(container.textContent).not.toContain('Today');
    expect(container.textContent).not.toContain('ago');
  });

  it('eliminates anxiety-inducing stale warning badges and maintains clean card border', async () => {
    const app: Application = {
      id: 'app-stale',
      userId: 'user-1',
      company: 'Ramp',
      role: 'Staff Product Engineer',
      status: 'Applied',
      platform: 'Otta',
      dateApplied: '2026-06-01',
      stageUpdatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    // No anxiety-inducing amber stale tags
    expect(container.textContent).not.toContain('stale');
    expect(container.querySelector('.bg-amber-500')).toBeNull();

    // Card border remains clean slate-200/80
    const cardEl = container.firstElementChild as HTMLElement;
    expect(cardEl.className).toContain('border-slate-200/80');
    expect(cardEl.className).not.toContain('border-rose-200');
    expect(cardEl.className).not.toContain('border-amber-200');
  });

  it('applies interactive hover polish and zero transition-all', async () => {
    const app: Application = {
      id: 'app-hover',
      userId: 'user-1',
      company: 'Vercel',
      role: 'Software Engineer',
      status: 'Applied',
      platform: 'Company Site',
      dateApplied: '2026-07-20',
      stageUpdatedAt: new Date().toISOString(),
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    const cardEl = container.firstElementChild as HTMLElement;
    expect(cardEl.className).toContain('hover:border-slate-300');
    expect(cardEl.className).toContain('hover:shadow-xs');
    expect(cardEl.className).toContain('transition-colors');
    expect(cardEl.className).toContain('duration-150');
    expect(cardEl.className).toContain('cursor-grab');
    expect(cardEl.className).not.toContain('transition-all');
  });

  it('maintains resting card visual look (clean slate border and white background) during drag without blue border or blue ring', async () => {
    const app: Application = {
      id: 'app-drag',
      userId: 'user-1',
      company: 'Linear',
      role: 'Staff Product Designer',
      status: 'Interview',
      platform: 'Referral',
      dateApplied: '2026-07-20',
      stageUpdatedAt: '2026-07-20T00:00:00.000Z',
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} isFloating={true} isDropping={false} />);
    });

    const cardEl = container.firstElementChild as HTMLElement;
    // Exactly matches resting card border and background
    expect(cardEl.className).toContain('bg-white');
    expect(cardEl.className).toContain('border-slate-200/80');
    expect(cardEl.className).not.toContain('border-blue-400');
    expect(cardEl.className).not.toContain('ring-blue-500');

    // Natural elevation shadow and subtle ring
    expect(cardEl.className).toContain('shadow-xl');
    expect(cardEl.className).toContain('ring-slate-900/5');

    // Renders context menu button placeholder so header layout does not shift
    const menuPlaceholder = container.querySelector('.w-6.h-6');
    expect(menuPlaceholder).not.toBeNull();
  });
});
