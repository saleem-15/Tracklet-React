import { Application, FilterState, SortState } from '../types';
import { calculateDaysInStage } from './dateUtils';

/**
 * Pure functions for filtering and sorting applications.
 */
export function filterAndSortApplications(
  applications: Application[],
  filter: FilterState,
  sort: SortState
): Application[] {
  return applications
    .filter((app) => {
      // Search filter
      if (filter.search.trim()) {
        const q = filter.search.toLowerCase();
        const matchCompany = app.company.toLowerCase().includes(q);
        const matchRole = app.role.toLowerCase().includes(q);
        const matchNotes = app.notes ? app.notes.toLowerCase().includes(q) : false;
        if (!matchCompany && !matchRole && !matchNotes) return false;
      }

      // Platform filter
      if (filter.platform !== 'All' && app.platform !== filter.platform) {
        return false;
      }

      // Status filter
      if (filter.status === 'Active') {
        if (app.status === 'Rejected' || app.status === 'Archived') return false;
      } else if (filter.status !== 'All' && app.status !== filter.status) {
        return false;
      }

      // Date range filter
      if (filter.dateRange !== 'all') {
        const appDate = new Date(app.dateApplied);
        const now = new Date();
        const daysAgo = (now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24);

        if (filter.dateRange === '7days' && daysAgo > 7) return false;
        if (filter.dateRange === '30days' && daysAgo > 30) return false;
        if (filter.dateRange === '60days' && daysAgo > 60) return false;

        // Weekly filters
        if (filter.dateRange === 'this_week') {
          const startOfWeek = new Date(now);
          const day = now.getDay();
          const diffToMon = day === 0 ? -6 : 1 - day; // Monday as start of week
          startOfWeek.setDate(now.getDate() + diffToMon);
          startOfWeek.setHours(0, 0, 0, 0);
          if (appDate < startOfWeek) return false;
        }

        if (filter.dateRange === 'last_week') {
          const startOfThisWeek = new Date(now);
          const day = now.getDay();
          const diffToMon = day === 0 ? -6 : 1 - day;
          startOfThisWeek.setDate(now.getDate() + diffToMon);
          startOfThisWeek.setHours(0, 0, 0, 0);

          const startOfLastWeek = new Date(startOfThisWeek);
          startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

          if (appDate < startOfLastWeek || appDate >= startOfThisWeek) return false;
        }

        // Monthly filters
        if (filter.dateRange === 'this_month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (appDate < startOfMonth) return false;
        }

        if (filter.dateRange === 'last_month') {
          const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (appDate < startOfLastMonth || appDate >= startOfThisMonth) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let valA: any = a[sort.field as keyof Application] || '';
      let valB: any = b[sort.field as keyof Application] || '';

      if (sort.field === 'daysInStage') {
        valA = calculateDaysInStage(a.stageUpdatedAt);
        valB = calculateDaysInStage(b.stageUpdatedAt);
      }

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB);
        return sort.order === 'asc' ? comp : -comp;
      }

      if (valA < valB) return sort.order === 'asc' ? -1 : 1;
      if (valA > valB) return sort.order === 'asc' ? 1 : -1;
      return 0;
    });
}
