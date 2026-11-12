import React, { useState, useRef } from 'react';
import { 
  BriefcaseBusiness, 
  Layers, 
  CheckCircle2,
  Check
} from 'lucide-react';
import { Application } from '../../../types';
import { parseCSVContentToApplications } from './onboardingImportUtils';
import { ImportSpreadsheetSection, StagedImport } from './ImportSpreadsheetSection';

export type WorkspaceSetupChoice = 'import' | 'sample' | 'clean';

export interface WorkspaceSetupStepProps {
  onContinue?: () => void;
  onLaunchCSVImport?: () => void;
  onImportCSV?: (
    apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => Promise<boolean | void>;
  onSeedDemoData?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  totalAppCount?: number;
}

export const WorkspaceSetupStep: React.FC<WorkspaceSetupStepProps> = ({
  onImportCSV,
  onSeedDemoData,
  onShowToast,
  totalAppCount = 0,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<WorkspaceSetupChoice>('sample');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedImport, setStagedImport] = useState<StagedImport | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isSeeded, setIsSeeded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveCount = importedCount !== null ? importedCount : totalAppCount > 0 ? totalAppCount : null;

  const processFile = (file: File) => {
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    if (!isCsv) {
      onShowToast?.('warning', 'Unsupported File', 'Please upload a valid .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      onShowToast?.('error', 'Read Error', 'Failed to read the file.');
    };
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const { apps, detectedColumns } = parseCSVContentToApplications(content);
        if (apps.length === 0) {
          onShowToast?.('warning', 'No Applications Found', 'Could not find valid rows with company or role.');
          return;
        }
        setSelectedChoice('import');
        setStagedImport({
          fileName: file.name,
          type: 'csv',
          apps,
          detectedColumns: detectedColumns.length > 0 ? detectedColumns : undefined,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not parse file.';
        onShowToast?.('error', 'Parse Error', msg);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!stagedImport || !onImportCSV) return;
    setIsProcessing(true);
    try {
      await onImportCSV(stagedImport.apps);
      setImportedCount(stagedImport.apps.length);
      onShowToast?.(
        'success',
        'Applications Imported',
        `Successfully loaded ${stagedImport.apps.length} applications into your pipeline.`
      );
      setStagedImport(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      onShowToast?.('error', 'Import Error', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleSeedDemo = () => {
    setSelectedChoice('sample');
    if (onSeedDemoData) {
      onSeedDemoData();
      setIsSeeded(true);
      onShowToast?.('success', 'Demo Roles Loaded', 'Added 3 sample applications to your pipeline.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="text-center space-y-1 max-w-md mx-auto">
        <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900 tracking-tight">
          Workspace Setup
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Choose how to initialize your applications pipeline.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />

      <div className="space-y-3 pt-1">
        {/* Choice 1: Import Spreadsheet (.CSV) */}
        <ImportSpreadsheetSection
          isSelected={selectedChoice === 'import'}
          onSelect={() => setSelectedChoice('import')}
          stagedImport={stagedImport}
          onClearStaged={() => setStagedImport(null)}
          onConfirmImport={handleConfirmImport}
          isProcessing={isProcessing}
          effectiveCount={effectiveCount}
          onProcessFile={processFile}
          fileInputRef={fileInputRef}
        />

        {/* Choice 2: Explore Sample Roles */}
        <div
          onClick={() => setSelectedChoice('sample')}
          className={`group p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
            selectedChoice === 'sample'
              ? 'bg-blue-50/40 border-blue-500 ring-1 ring-blue-500/30 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                <BriefcaseBusiness className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Explore Sample Roles
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Sample Data
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Seed 3 realistic roles to explore the Kanban board and notes.
                </p>
              </div>
            </div>

            {selectedChoice === 'sample' ? (
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Check className="w-3 h-3 text-white stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white group-hover:border-slate-400 transition-colors shrink-0" />
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
            {isSeeded ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2]" />
                <span>3 Demo Roles Loaded</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeedDemo();
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <BriefcaseBusiness className="w-3.5 h-3.5 stroke-[2]" />
                <span>Load 3 Sample Roles</span>
              </button>
            )}
            <span className="text-[11px] text-slate-400">Can be removed anytime</span>
          </div>
        </div>

        {/* Choice 3: Start with a Clean Slate */}
        <div
          onClick={() => setSelectedChoice('clean')}
          className={`group p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
            selectedChoice === 'clean'
              ? 'bg-blue-50/40 border-blue-500 ring-1 ring-blue-500/30 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                <Layers className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Start with a Clean Slate
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Empty Pipeline
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Begin with an empty pipeline ready for your personal applications.
                </p>
              </div>
            </div>

            {selectedChoice === 'clean' ? (
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Check className="w-3 h-3 text-white stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white group-hover:border-slate-400 transition-colors shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
