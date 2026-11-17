export const KANBAN_STAGES = [
  { title: 'Saved' },
  { title: 'Applied' },
  { title: 'Screening' },
  { title: 'Interview' },
  { title: 'Offer' },
];

/**
 * Top action bar skeleton silhouette (optional when TopBar is not mounted).
 */
export function ApplicationsToolbarSkeleton() {
  return (
    <header className="h-13 bg-white/95 border-b border-slate-200/80 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 backdrop-blur-xs shrink-0 select-none">
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-4xl">
        <div className="w-48 sm:w-64 h-8 bg-slate-200/60 rounded-lg shrink-0 animate-pulse motion-reduce:animate-none" />
        <div className="hidden sm:flex items-center gap-2">
          <div className="h-8 w-20 bg-slate-200/40 rounded-[10px] animate-pulse motion-reduce:animate-none" />
          <div className="h-8 w-18 bg-slate-200/40 rounded-[10px] animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="h-[34px] w-24 sm:w-28 bg-slate-200/70 rounded-[10px] shrink-0 animate-pulse motion-reduce:animate-none" />
      </div>
    </header>
  );
}

/**
 * Table View Skeleton matching AllApplicationsTable.tsx (54px rows, 0 CLS).
 * Includes the view-bar strip so the framed card silhouette matches exactly.
 */
export function ApplicationsTableSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* View bar skeleton (summary chips left, settings right) */}
      <div className="shrink-0 border-b border-slate-200/70 bg-white flex items-center justify-between gap-3 pl-3 pr-2 py-1.5 h-[38px]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-16 rounded-full bg-slate-200/50 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
        <div className="h-6 w-16 rounded-md bg-slate-200/40 animate-pulse motion-reduce:animate-none mr-1" />
      </div>
      <div className="flex-1 overflow-auto flex flex-col">
      <table className="w-full text-left border-collapse text-xs min-w-[880px]">
        <thead className="bg-slate-50/80 border-b border-slate-200/80 sticky top-0 z-10 text-[11px] font-mono text-slate-500 uppercase tracking-wider backdrop-blur-xs h-[37px]">
          <tr>
            <th className="w-10 px-3 py-2.5 text-center">
              <div className="w-3.5 h-3.5 rounded bg-slate-200/60 inline-block" />
            </th>
            <th className="w-[260px] px-3 py-2.5 font-semibold text-slate-500">Company & Role</th>
            <th className="w-44 px-3 py-2.5 font-semibold text-slate-500">Location</th>
            <th className="px-3 py-2.5 font-semibold text-slate-500">Status</th>
            <th className="px-3 py-2.5 font-semibold text-slate-500">Source</th>
            <th className="w-24 px-3 py-2.5 font-semibold text-slate-500">Salary</th>
            <th className="w-20 px-3 py-2.5 font-semibold text-slate-500">Activity</th>
            <th className="w-[105px] px-3 py-2.5 font-semibold text-slate-500">Applied</th>
            <th className="w-24 px-3 py-2.5 font-semibold text-slate-500">In Stage</th>
            <th className="px-2 py-2.5 font-semibold text-slate-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, i) => (
            <tr
              key={i}
              className="h-[54px] border-b border-slate-100/80 animate-pulse motion-reduce:animate-none"
            >
              <td className="px-3 py-1 text-center align-middle">
                <div className="w-3.5 h-3.5 rounded bg-slate-200/50 inline-block" />
              </td>
              <td className="w-[260px] px-3 py-1.5 align-middle">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded bg-slate-200/60 shrink-0" />
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="w-28 sm:w-32 h-3 bg-slate-200/60 rounded" />
                    <div className="w-36 sm:w-44 h-2.5 bg-slate-200/40 rounded" />
                  </div>
                </div>
              </td>
              <td className="w-44 px-3 py-1 align-middle">
                <div className="w-24 sm:w-28 h-3 bg-slate-200/40 rounded" />
              </td>
              <td className="px-3 py-1 align-middle">
                <div className="w-16 h-5 bg-slate-200/50 rounded-md" />
              </td>
              <td className="px-3 py-1 align-middle">
                <div className="w-12 h-3 bg-slate-200/40 rounded" />
              </td>
              <td className="w-24 px-3 py-1 align-middle">
                <div className="w-14 h-3 bg-slate-200/40 rounded" />
              </td>
              <td className="w-20 px-3 py-1 align-middle">
                <div className="w-8 h-3 bg-slate-200/40 rounded" />
              </td>
              <td className="w-[105px] px-3 py-1 align-middle">
                <div className="w-14 h-3 bg-slate-200/40 rounded" />
              </td>
              <td className="w-24 px-3 py-1 align-middle">
                <div className="w-6 h-3 bg-slate-200/40 rounded" />
              </td>
              <td className="px-2 py-1 align-middle text-right">
                <div className="w-4 h-4 rounded bg-slate-200/30 inline-block" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/**
 * Kanban Board View Skeleton matching ActivePipelineBoard.tsx (96px cards, 0 CLS).
 */
export function ApplicationsBoardSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Desktop Column Headers Bar (h-[37px] matching ActivePipelineBoard) */}
      <div className="hidden md:grid md:grid-cols-5 bg-slate-50/80 border-b border-slate-200/80 sticky top-0 z-10 backdrop-blur-xs min-w-[900px] h-[37px]">
        {KANBAN_STAGES.map((col) => (
          <div
            key={col.title}
            className="px-3 py-2.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 font-heading font-bold text-slate-700 text-xs tracking-tight">
              <span className="w-2 h-2 rounded-full bg-slate-300/80 shadow-xs shrink-0" />
              <span>{col.title}</span>
              <span className="font-mono text-[11px] font-semibold text-slate-400 ml-0.5">
                (0)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Columns Grid (Mobile swipe snap + Desktop 5-col grid) */}
      <div className="flex-1 flex md:grid md:grid-cols-5 min-h-0 overflow-x-auto md:overflow-y-auto p-3 md:p-0 gap-3 md:gap-0 md:min-w-[900px]">
        {KANBAN_STAGES.map((col, colIndex) => (
          <div
            key={col.title}
            className="w-[85vw] sm:w-[320px] md:w-auto shrink-0 snap-center md:shrink md:snap-align-none rounded-2xl md:rounded-none border md:border-0 border-slate-200/80 md:border-transparent bg-slate-50/40 md:bg-white p-3 md:p-3.5 flex flex-col space-y-2.5 min-h-[400px]"
          >
            {/* Mobile-only Column Header */}
            <div className="md:hidden flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2 font-heading font-bold text-slate-700 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300/80 shadow-xs shrink-0" />
                <span>{col.title}</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                0
              </span>
            </div>

            {/* Placeholder Kanban Cards (Deterministic min-h-[96px]) */}
            {[...Array(colIndex % 2 === 0 ? 3 : 2)].map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs min-h-[96px] flex flex-col justify-between animate-pulse motion-reduce:animate-none space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-200/60 shrink-0" />
                  <div className="w-24 h-3.5 bg-slate-200/60 rounded" />
                </div>
                <div className="w-32 h-3 bg-slate-200/40 rounded" />
                <div className="flex items-center gap-1.5 pt-0.5">
                  <div className="w-14 h-4 bg-slate-100 rounded" />
                  <div className="w-12 h-4 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
