/**
 * SettingsSkeleton
 *
 * Deterministic skeleton matching SettingsView.tsx and SettingsHubView.tsx (0 CLS):
 * - Page heading ("Settings") in Outfit bold
 * - Flat horizontal sub-navigation tabs (with active Account underline)
 * - Candidate Identity & Credentials card (avatar, name, email, security action buttons)
 * - Workspace Data Portability & Backups card (backup & CSV rows)
 * - Danger Zone warning container (Delete Account button)
 */
export function SettingsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8 select-none">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* ── Page Heading ── */}
        <div className="pb-1">
          <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
        </div>

        {/* ── Horizontal Sub-Navigation Tab Bar ── */}
        <nav
          aria-label="Settings section navigation"
          className="flex items-center gap-6 overflow-x-auto scrollbar-none border-b border-slate-200/80"
        >
          <div className="min-h-[44px] pb-3 pt-1 text-sm tracking-tight border-b-2 -mb-px text-blue-600 font-semibold border-blue-600">
            Account
          </div>
        </nav>

        {/* ── Active Detail Pane on Flat White Canvas ── */}
        <div className="w-full pt-2 space-y-6 animate-pulse motion-reduce:animate-none">
          {/* 1. Candidate Identity & Credentials */}
          <div className="border-b border-slate-200/80 pb-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-200/60 border border-slate-200/80 shrink-0" />
              <div className="space-y-2 min-w-0">
                <div className="w-36 sm:w-44 h-5 bg-slate-200/70 rounded" />
                <div className="w-48 sm:w-56 h-3.5 bg-slate-200/40 rounded font-mono" />
              </div>
            </div>

            {/* Security Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="h-9 w-32 bg-slate-100 rounded-xl border border-slate-200/70" />
              <div className="h-9 w-24 bg-slate-100 rounded-xl border border-slate-200/70" />
            </div>
          </div>

          {/* 2. Workspace Data Portability & Backups */}
          <div className="border-b border-slate-200/80 pb-6 space-y-4">
            <div className="w-48 h-5 bg-slate-200/70 rounded font-heading font-bold" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace Backup
            </div>
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50/60 border border-slate-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-200/60 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="w-32 h-3.5 bg-slate-200/60 rounded" />
                    <div className="w-48 h-2.5 bg-slate-200/40 rounded" />
                  </div>
                  <div className="w-4 h-4 rounded bg-slate-200/40 shrink-0" />
                </div>
              ))}
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">
              Spreadsheet Export &amp; Import
            </div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50/60 border border-slate-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-200/60 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="w-36 h-3.5 bg-slate-200/60 rounded" />
                    <div className="w-52 h-2.5 bg-slate-200/40 rounded" />
                  </div>
                  <div className="w-4 h-4 rounded bg-slate-200/40 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Danger Zone */}
          <div className="space-y-2 pt-2">
            <h3 className="font-heading font-bold text-base sm:text-lg text-rose-950 tracking-tight">
              Danger Zone
            </h3>
            <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900">Delete Account &amp; Wipe Cloud Data</h4>
                <div className="w-64 sm:w-80 h-3 bg-rose-100/80 rounded" />
              </div>
              <div className="h-9 px-3.5 bg-rose-600/70 rounded-xl text-white text-xs font-semibold flex items-center justify-center shrink-0">
                Delete Account
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
