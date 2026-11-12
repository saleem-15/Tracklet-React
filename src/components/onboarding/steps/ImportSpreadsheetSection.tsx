import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  Upload, 
  Loader2, 
  Check,
  Download
} from 'lucide-react';
import { Application } from '../../../types';
import { downloadSampleCSVTemplate } from '../../../lib/importCsv';
import { UI_TOKENS } from '../../../theme/tokens';

export interface StagedImport {
  fileName: string;
  type: 'csv';
  apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[];
  detectedColumns?: string[];
}

export interface ImportSpreadsheetSectionProps {
  isSelected: boolean;
  onSelect: () => void;
  stagedImport: StagedImport | null;
  onClearStaged: () => void;
  onConfirmImport: () => void;
  isProcessing: boolean;
  effectiveCount: number | null;
  onProcessFile: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ImportSpreadsheetSection: React.FC<ImportSpreadsheetSectionProps> = ({
  isSelected,
  onSelect,
  stagedImport,
  onClearStaged,
  onConfirmImport,
  isProcessing,
  effectiveCount,
  onProcessFile,
  fileInputRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onProcessFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      onClick={onSelect}
      className={`group p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-blue-50/40 border-blue-500 ring-1 ring-blue-500/30 shadow-xs'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
            <FileSpreadsheet className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Import Spreadsheet (.CSV)
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Migration
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Migrate any existing job-tracking spreadsheet in seconds.
            </p>
          </div>
        </div>

        {isSelected ? (
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Check className="w-3 h-3 text-white stroke-[2.5]" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white group-hover:border-slate-400 transition-colors shrink-0" />
        )}
      </div>

      {/* Staged Confirmation, Success Receipt, or Dropzone */}
      {stagedImport ? (
        <div className="mt-2.5 bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0 stroke-[2]" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {stagedImport.fileName}
                </span>
                <span className="text-[11px] text-blue-700 font-medium">
                  {stagedImport.apps.length} applications ready to import
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearStaged();
              }}
              className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer shrink-0"
            >
              Cancel
            </button>
          </div>

          {stagedImport.detectedColumns && stagedImport.detectedColumns.length > 0 && (
            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 overflow-hidden truncate">
              <span className="font-semibold text-slate-600">Columns:</span>
              <span>
                {stagedImport.detectedColumns.slice(0, 4).join(', ')}
                {stagedImport.detectedColumns.length > 4 ? ` +${stagedImport.detectedColumns.length - 4} more` : ''}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirmImport();
            }}
            disabled={isProcessing}
            className={`${UI_TOKENS.btnPrimary} w-full text-xs py-1.5 h-8 justify-center shadow-2xs`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Import {stagedImport.apps.length} Applications</span>
              </>
            )}
          </button>
        </div>
      ) : effectiveCount !== null && effectiveCount > 0 ? (
        <div className="mt-2.5 bg-emerald-50/90 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2]" />
            <span>{effectiveCount} Applications Loaded</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-medium cursor-pointer"
          >
            Upload another
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            fileInputRef.current?.click();
          }}
          className={`mt-2 border-2 border-dashed rounded-lg p-3 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70'
              : 'border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-semibold mb-0.5">
            <Upload className="w-3.5 h-3.5 text-blue-600 stroke-[2]" />
            <span>Drop a CSV file here, or click to browse</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-3 h-3 text-emerald-600 stroke-[2]" /> .CSV
            </span>
            <span>/</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadSampleCSVTemplate();
              }}
              className="text-blue-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
            >
              <Download className="w-2.5 h-2.5" />
              <span>Sample template</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
