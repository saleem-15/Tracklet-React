import { 
  Users, 
  UserPlus, 
  Search, 
  LayoutGrid, 
  List, 
  Clock 
} from 'lucide-react';
import { CONTACT_CATEGORIES } from '../../../lib/constants';

interface ContactsHeaderSkeletonProps {
  layout: 'grid' | 'table';
}

/**
 * Contacts Header Skeleton matching ContactsView.tsx.
 */
export function ContactsHeaderSkeleton({ layout }: ContactsHeaderSkeletonProps) {
  return (
    <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 shrink-0 space-y-3 select-none">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-none font-heading">
            Contacts
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View Layout Toggle */}
          <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200/80 text-slate-500">
            <div
              className={`p-1.5 rounded-lg ${
                layout === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div
              className={`p-1.5 rounded-lg ${
                layout === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-400'
              }`}
            >
              <List className="w-4 h-4" />
            </div>
          </div>

          {/* Add Contact Button Silhouette */}
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 min-h-[36px] opacity-90">
            <UserPlus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span className="hidden sm:inline">Add Contact</span>
            <span className="sm:hidden">Add</span>
          </div>
        </div>
      </div>

      {/* Filter Controls: Search & Category Chips */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Search Box Silhouette */}
        <div className="relative flex-1 max-w-md">
          <div className="w-full bg-slate-50/80 text-slate-400 pl-8 pr-7 py-1.5 h-[34px] rounded-xl border border-slate-200 text-xs flex items-center">
            <span className="text-slate-400/80 truncate">Search by name, role, organization, or email...</span>
          </div>
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Category & Follow-Up Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-blue-600 text-white border-blue-600 shadow-2xs whitespace-nowrap">
            All (0)
          </div>
          {CONTACT_CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white text-slate-600 border-slate-200 whitespace-nowrap"
            >
              {cat}
            </div>
          ))}

          <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5" />

          {/* Needs Follow-up Filter Chip Silhouette */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border bg-white text-slate-700 border-slate-200 font-medium whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Needs Follow-up</span>
            <span className="font-mono text-[11px] text-slate-400">(0)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Contacts Grid Skeleton matching ContactCardGrid.tsx (responsive 1/2/3/4 cols, min-h-[170px]).
 */
export function ContactsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="relative flex flex-col justify-between rounded-2xl bg-white border border-slate-200/85 shadow-2xs p-4.5 min-h-[170px] animate-pulse motion-reduce:animate-none"
        >
          <div>
            {/* Top Row: Avatar + Name/Category + More Menu */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-200/60 border border-slate-200/70 shrink-0" />
                <div className="min-w-0 space-y-1.5">
                  <div className="w-24 sm:w-28 h-4 bg-slate-200/70 rounded" />
                  <div className="w-16 h-3.5 bg-slate-200/50 rounded-md" />
                </div>
              </div>
              <div className="w-6 h-6 rounded-lg bg-slate-200/40 shrink-0" />
            </div>

            {/* Role & Org */}
            <div className="space-y-1.5 my-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-slate-200/40 shrink-0" />
                <div className="w-28 h-3 bg-slate-200/50 rounded" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-slate-200/40 shrink-0" />
                <div className="w-20 h-3 bg-slate-200/50 rounded" />
              </div>
            </div>
          </div>

          {/* Bottom: Linked App & Quick Actions */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="w-20 h-4 bg-slate-200/50 rounded-md" />
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-6 h-6 rounded-lg bg-slate-200/40" />
              <div className="w-6 h-6 rounded-lg bg-slate-200/40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Contacts Table Skeleton matching ContactTable.tsx.
 */
export function ContactsTableSkeleton() {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold select-none">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Role &amp; Org</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Follow-up</th>
              <th className="py-3 px-4">Linked Applications</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="animate-pulse motion-reduce:animate-none">
                {/* Name + Avatar */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200/60 border border-slate-200/70 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <div className="w-28 sm:w-36 h-3.5 bg-slate-200/70 rounded" />
                      <div className="w-36 sm:w-44 h-3 bg-slate-200/40 rounded" />
                    </div>
                  </div>
                </td>

                {/* Role & Org */}
                <td className="py-3 px-4">
                  <div className="min-w-0 space-y-1">
                    <div className="w-24 sm:w-32 h-3.5 bg-slate-200/60 rounded" />
                    <div className="w-20 sm:w-28 h-3 bg-slate-200/40 rounded" />
                  </div>
                </td>

                {/* Category */}
                <td className="py-3 px-4">
                  <div className="w-16 h-5 rounded-md bg-slate-200/50" />
                </td>

                {/* Follow-up */}
                <td className="py-3 px-4">
                  <div className="w-20 h-4 rounded bg-slate-200/40" />
                </td>

                {/* Linked Applications */}
                <td className="py-3 px-4">
                  <div className="w-24 h-5 rounded-md bg-slate-200/50" />
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <div className="w-6 h-6 rounded-lg bg-slate-200/40" />
                    <div className="w-6 h-6 rounded-lg bg-slate-200/40" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
