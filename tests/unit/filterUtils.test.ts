import { describe, it, expect } from 'vitest';
import { filterAndSortApplications } from '../../src/lib/filterUtils';
import { Application, FilterState, SortState } from '../../src/types';

const MOCK_APPS: Application[] = [
  {
    id: 'app-1',
    userId: 'user-1',
    company: 'Linear',
    role: 'Frontend Engineer',
    platform: 'LinkedIn',
    dateApplied: '2026-08-10',
    status: 'Interview',
    notes: 'React and Tailwind experience needed',
    stageUpdatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-10T10:00:00.000Z',
  },
  {
    id: 'app-2',
    userId: 'user-1',
    company: 'Stripe',
    role: 'Backend Engineer',
    platform: 'Company Site',
    dateApplied: '2026-08-01',
    status: 'Rejected',
    notes: 'Position closed',
    stageUpdatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'app-3',
    userId: 'user-1',
    company: 'Vercel',
    role: 'Full Stack Engineer',
    platform: 'Referral',
    dateApplied: '2026-08-18',
    status: 'Offer',
    notes: 'Great team interview',
    stageUpdatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
  },
];

const DEFAULT_FILTER: FilterState = {
  search: '',
  platform: 'All',
  status: 'All',
  dateRange: 'all',
};

const DEFAULT_SORT: SortState = {
  field: 'dateApplied',
  order: 'desc',
};

describe('filterUtils', () => {
  it('returns all applications when no filters are active', () => {
    const result = filterAndSortApplications(MOCK_APPS, DEFAULT_FILTER, DEFAULT_SORT);
    expect(result).toHaveLength(3);
    expect(result[0].company).toBe('Vercel'); // newest first
  });

  it('filters by search term across company, role, and notes', () => {
    const filterByRole: FilterState = { ...DEFAULT_FILTER, search: 'Frontend' };
    expect(filterAndSortApplications(MOCK_APPS, filterByRole, DEFAULT_SORT)).toHaveLength(1);

    const filterByNotes: FilterState = { ...DEFAULT_FILTER, search: 'Tailwind' };
    expect(filterAndSortApplications(MOCK_APPS, filterByNotes, DEFAULT_SORT)[0].company).toBe('Linear');
  });

  it('filters by specific platform', () => {
    const filterByPlatform: FilterState = { ...DEFAULT_FILTER, platform: 'LinkedIn' };
    const result = filterAndSortApplications(MOCK_APPS, filterByPlatform, DEFAULT_SORT);
    expect(result).toHaveLength(1);
    expect(result[0].company).toBe('Linear');
  });

  it('filters by active statuses (excluding Rejected & Archived)', () => {
    const filterActive: FilterState = { ...DEFAULT_FILTER, status: 'Active' };
    const result = filterAndSortApplications(MOCK_APPS, filterActive, DEFAULT_SORT);
    expect(result).toHaveLength(2);
    expect(result.some((a) => a.company === 'Stripe')).toBe(false);
  });

  it('sorts alphabetically by company ascending and descending', () => {
    const sortAsc: SortState = { field: 'company', order: 'asc' };
    const resultAsc = filterAndSortApplications(MOCK_APPS, DEFAULT_FILTER, sortAsc);
    expect(resultAsc.map((a) => a.company)).toEqual(['Linear', 'Stripe', 'Vercel']);

    const sortDesc: SortState = { field: 'company', order: 'desc' };
    const resultDesc = filterAndSortApplications(MOCK_APPS, DEFAULT_FILTER, sortDesc);
    expect(resultDesc.map((a) => a.company)).toEqual(['Vercel', 'Stripe', 'Linear']);
  });
});
