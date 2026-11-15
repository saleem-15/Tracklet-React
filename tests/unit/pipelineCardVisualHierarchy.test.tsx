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

  it('formats task chip compactly preventing awkward cutoffs: Prepare architecture deck (Thu)', async () => {
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

    const taskChip = container.querySelector('.bg-slate-50.border-slate-200\\/60');
    expect(taskChip).not.toBeNull();
    expect(taskChip?.className).toContain('text-slate-600');
    expect(taskChip?.className).toContain('px-2');
    expect(taskChip?.className).toContain('py-1');
    expect(taskChip?.textContent).toBe('Prepare architecture deck (Thu)');
  });

  it('drops redundant "ago" suffix for active applications (e.g. 5d, Today)', async () => {
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

    expect(container.textContent).toContain('5d');
    expect(container.textContent).not.toContain('5d ago');
  });

  it('signals staleness directly on the timestamp (>14 days) and maintains clean card border', async () => {
    const app: Application = {
      id: 'app-stale',
      userId: 'user-1',
      company: 'Ramp',
      role: 'Staff Product Engineer',
      status: 'Applied',
      platform: 'Otta',
      dateApplied: '2026-06-01',
      stageUpdatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 18d stale
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };

    await act(async () => {
      root.render(<PipelineCardShell app={app} />);
    });

    // Timestamp shows amber indicator dot and status text
    const staleTag = container.querySelector('span.text-amber-600.font-mono');
    expect(staleTag).not.toBeNull();
    expect(staleTag?.textContent).toContain('18d stale');
    const amberDot = staleTag?.querySelector('.bg-amber-500');
    expect(amberDot).not.toBeNull();

    // Card border must be clean slate-200/80, NOT ambiguous pink/rose border
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
});
