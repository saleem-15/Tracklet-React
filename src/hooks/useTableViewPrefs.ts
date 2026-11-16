import { useCallback, useState } from 'react';
import type { TableViewPrefs } from '../types';
import { loadTableViewPrefs, saveTableViewPrefs } from '../lib/tableUtils';

/**
 * useTableViewPrefs
 *
 * Persists the table lens view preferences (grouping, optional
 * columns) to localStorage so returning users keep their preferred layout.
 */
export function useTableViewPrefs(): {
  prefs: TableViewPrefs;
  updatePrefs: (updates: Partial<TableViewPrefs>) => void;
} {
  const [prefs, setPrefs] = useState<TableViewPrefs>(() => loadTableViewPrefs());

  const updatePrefs = useCallback((updates: Partial<TableViewPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      saveTableViewPrefs(next);
      return next;
    });
  }, []);

  return { prefs, updatePrefs };
}
