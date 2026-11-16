import { describe, it, expect } from 'vitest';
import { nextSortState, DEFAULT_SORT_STATE } from '../../src/lib/tableUtils';
import type { SortState } from '../../src/types';

describe('nextSortState (table header sort state machine)', () => {
  it('starts desc-first for time-like and magnitude fields', () => {
    for (const field of ['dateApplied', 'daysInStage', 'lastActivity', 'salary'] as const) {
      // Start from a different column so the click is a field change
      expect(nextSortState({ field: 'company', order: 'asc' }, field)).toEqual({ field, order: 'desc' });
    }
  });

  it('starts asc for text fields', () => {
    for (const field of ['company', 'role', 'platform', 'status'] as const) {
      expect(nextSortState({ field: 'salary', order: 'desc' }, field)).toEqual({ field, order: 'asc' });
    }
  });

  it('cycles desc -> asc -> default reset for desc-first fields', () => {
    const desc: SortState = { field: 'salary', order: 'desc' };
    expect(nextSortState(desc, 'salary')).toEqual({ field: 'salary', order: 'asc' });
    expect(nextSortState({ field: 'salary', order: 'asc' }, 'salary')).toEqual(DEFAULT_SORT_STATE);
  });

  it('cycles asc -> desc -> default reset for text fields', () => {
    const asc: SortState = { field: 'company', order: 'asc' };
    expect(nextSortState(asc, 'company')).toEqual({ field: 'company', order: 'desc' });
    expect(nextSortState({ field: 'company', order: 'desc' }, 'company')).toEqual(DEFAULT_SORT_STATE);
  });

  it('keeps cycling the default column (Applied) without a dead reset state', () => {
    expect(nextSortState(DEFAULT_SORT_STATE, 'dateApplied')).toEqual({ field: 'dateApplied', order: 'asc' });
    expect(nextSortState({ field: 'dateApplied', order: 'asc' }, 'dateApplied')).toEqual(DEFAULT_SORT_STATE);
  });

  it('reset returns exactly the default state (Applied, newest first)', () => {
    const result = nextSortState({ field: 'company', order: 'desc' }, 'company');
    expect(result).toEqual({ field: 'dateApplied', order: 'desc' });
  });
});
