import React, { useState } from 'react';
import { 
  Compass, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Database 
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { useExtensionContext } from '../context/ExtensionContext';
import { EmptyStateActionGrid } from './EmptyStateActionGrid';

export interface OnboardingEmptyStateProps {
  onOpenAddModal: () => void;
  onSeedDemoData: () => void;
  applicationsCount?: number;
  contactsCount?: number;
}

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({
  onOpenAddModal,
  onSeedDemoData,
  applicationsCount = 0,
  contactsCount,
}) => {
  const { openOnboardingModal, openImportModal, openExtensionModal } = useNavigation();
  const extensionState = useExtensionContext();

  // Retrieve local contacts if not explicitly passed as prop
  const [localContactsCount] = useState<number>(() => {
    if (typeof contactsCount === 'number') return contactsCount;
    try {
      const raw = localStorage.getItem('tracklet_contacts_index');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch {
      // Fallback gracefully
    }
    return 0;
  });

  const effectiveContacts = contactsCount ?? localContactsCount;
  const isExtensionConnected = extensionState.status === 'connected';

  // Live checklist completion conditions
  const isPopulated = applicationsCount > 0;
  const isConnected = isExtensionConnected;
  const hasFirstJobOrContact = applicationsCount > 0 || effectiveContacts > 0;

  const completedCount = 
    (isPopulated ? 1 : 0) + 
    (isConnected ? 1 : 0) + 
    (hasFirstJobOrContact ? 1 : 0);

  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in-50 zoom-in-95 duration-200">
      {/* Title & Launchpad Subheading */}
      <div className="space-y-1.5 mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-2xs mb-1">
          <Compass className="w-3.5 h-3.5 stroke-[2]" />
          <span>Setup Launchpad</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">
          Welcome to your job search command center
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Complete the checklist below or pick a quick start action to activate your pipeline.
        </p>
      </div>

      {/* Linear-Inspired Checklist Card */}
      <div className="w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs text-left mb-6">
        {/* Checklist Header & Progress Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 font-heading">
              Setup Progress
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({completedCount} of 3 complete)
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-blue-600">
            {progressPercent}%
          </span>
        </div>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 mb-4">
          <div 
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {/* Item 1: Populate applications */}
          <div className={`p-3 rounded-xl border transition-all duration-150 flex items-start justify-between gap-3 ${
            isPopulated 
              ? 'bg-emerald-50/40 border-emerald-200/80' 
              : 'bg-slate-50/60 border-slate-200/70 hover:border-slate-300'
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 shrink-0">
                {isPopulated ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 stroke-[1.8]" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className={`text-xs font-bold block ${isPopulated ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                  1. Populate applications
                </span>
                <p className="text-[11px] text-slate-500">
                  Import a spreadsheet or load sample roles.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              {!isPopulated ? (
                <button
                  type="button"
                  onClick={onSeedDemoData}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Load Demo Data
                </button>
              ) : (
                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold">
                  Done
                </span>
              )}
            </div>
          </div>

          {/* Item 2: Connect extension */}
          <div className={`p-3 rounded-xl border transition-all duration-150 flex items-start justify-between gap-3 ${
            isConnected 
              ? 'bg-emerald-50/40 border-emerald-200/80' 
              : 'bg-slate-50/60 border-slate-200/70 hover:border-slate-300'
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 shrink-0">
                {isConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 stroke-[1.8]" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className={`text-xs font-bold block ${isConnected ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                  2. Connect extension
                </span>
                <p className="text-[11px] text-slate-500">
                  Save job postings directly from LinkedIn and job boards.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              {isConnected ? (
                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold">
                  Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={openExtensionModal}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Get Extension
                </button>
              )}
            </div>
          </div>

          {/* Item 3: Add first contact */}
          <div className={`p-3 rounded-xl border transition-all duration-150 flex items-start justify-between gap-3 ${
            hasFirstJobOrContact 
              ? 'bg-emerald-50/40 border-emerald-200/80' 
              : 'bg-slate-50/60 border-slate-200/70 hover:border-slate-300'
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 shrink-0">
                {hasFirstJobOrContact ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 stroke-[1.8]" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className={`text-xs font-bold block ${hasFirstJobOrContact ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                  3. Add first contact
                </span>
                <p className="text-[11px] text-slate-500">
                  Log your first role or hiring manager contact.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              {!hasFirstJobOrContact ? (
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Add First Job
                </button>
              ) : (
                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold">
                  Done
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <EmptyStateActionGrid
        onOpenTour={() => openOnboardingModal(1)}
        onOpenAddModal={onOpenAddModal}
        onOpenImportModal={openImportModal}
        onSeedDemoData={onSeedDemoData}
      />

      {/* Re-open Welcome Tour link */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => openOnboardingModal(1)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          <span>Re-open Welcome Tour</span>
          <ArrowRight className="w-3 h-3 stroke-[2]" />
        </button>
      </div>

      {/* Reassurance Footer */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Database className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2]" />
        <span>100% Data Portability Guarantee. Export your full workspace as CSV at any time in Settings.</span>
      </div>
    </div>
  );
};
