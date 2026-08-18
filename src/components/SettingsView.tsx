import React, { useState } from 'react';
import { 
  Settings, 
  Clock, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Briefcase, 
  Sliders, 
  Calendar, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { Application, ExpiryNotificationSettings } from '../types';
import { getExpiringSoonTasks } from '../lib/expiryUtils';
import { ImportCSVModal } from './ImportCSVModal';
import { AccountSettingsCard } from './AccountSettingsCard';
import { UI_TOKENS } from '../theme/tokens';

interface SettingsViewProps {
  settings: ExpiryNotificationSettings;
  onUpdateSettings: (newSettings: ExpiryNotificationSettings) => void;
  applications: Application[];
  onSelectApplication?: (appId: string) => void;
  onExportCSV?: () => void;
  onImportCSV?: (
    apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => Promise<void>;
  onSeedDemoData?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  onAccountDeleted?: () => void;
}

const PRESET_HOURS = [12, 24, 48, 72, 96];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  applications,
  onSelectApplication,
  onExportCSV,
  onImportCSV,
  onSeedDemoData,
  onShowToast,
  onAccountDeleted,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const expiringTasks = getExpiringSoonTasks(applications, settings.expiryThresholdHours);

  const handleToggle = () => {
    onUpdateSettings({
      ...settings,
      enabled: !settings.enabled,
    });
  };

  const handleThresholdChange = (hours: number) => {
    if (hours < 1) hours = 1;
    if (hours > 720) hours = 720; // max 30 days
    onUpdateSettings({
      ...settings,
      expiryThresholdHours: hours,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>Application Settings</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Configure notification indicators, task expiry thresholds, and system preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
            Preference Config
          </span>
        </div>
      </div>

      {/* Account Profile & Security Section */}
      <AccountSettingsCard onShowToast={onShowToast} onAccountDeleted={onAccountDeleted} />

      {/* Main Setting Box: Soon to Expire Alerts */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  'Soon to Expire' Task Notification Indicator
                </h2>
                <span className="font-mono text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-semibold">
                  Sidebar Alert
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-sans">
                Shows a prominent indicator badge in the sidebar when applications have follow-up tasks, recruiter emails, or take-home assignments due within your configured timeframe.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <span className="text-xs font-mono font-medium text-slate-600">
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                settings.enabled ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Time Threshold Configuration */}
        <div className={`space-y-6 transition-all duration-200 ${settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-mono text-slate-800 uppercase tracking-wider font-bold flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Expiry Alert Window</span>
                </label>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Tasks with due dates within this time frame trigger the sidebar 'Soon to Expire' notification.
                </p>
              </div>

              {/* Dynamic Badge */}
              <div className="inline-flex items-center gap-1.5 font-mono text-xs text-amber-900 bg-amber-100/80 border border-amber-300/80 px-3 py-1 rounded-xl font-bold self-start sm:self-auto shadow-2xs">
                <span>{settings.expiryThresholdHours} Hours</span>
                <span className="text-amber-700/80 font-normal">
                  ({Math.round((settings.expiryThresholdHours / 24) * 10) / 10} {settings.expiryThresholdHours >= 48 ? 'days' : 'day'})
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Quick Select Presets:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESET_HOURS.map((preset) => {
                  const isActive = settings.expiryThresholdHours === preset;
                  const days = preset / 24;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleThresholdChange(preset)}
                      className={`px-3 py-2 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                      }`}
                    >
                      <span className={`font-mono text-xs font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {preset}h
                      </span>
                      <span className={`text-[11px] ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                        {days < 1 ? `${preset} hours` : `${days} ${days === 1 ? 'day' : 'days'}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine-tuning Range Slider & Number Stepper */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Custom Threshold Range Slider</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Range: 1h - 168h (1 week)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Range Slider */}
                <div className="flex-1 w-full space-y-1">
                  <input
                    type="range"
                    min={1}
                    max={168}
                    step={1}
                    value={Math.min(settings.expiryThresholdHours, 168)}
                    onChange={(e) => handleThresholdChange(parseInt(e.target.value) || 24)}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>1 hour</span>
                    <span>24h (1d)</span>
                    <span>48h (2d)</span>
                    <span>72h (3d)</span>
                    <span>168h (7d)</span>
                  </div>
                </div>

                {/* Direct Stepper Input */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleThresholdChange(Math.max(1, settings.expiryThresholdHours - 6))}
                    className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-transform"
                    title="Decrease by 6h"
                  >
                    -6
                  </button>
                  <div className="flex items-center px-2">
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={settings.expiryThresholdHours}
                      onChange={(e) => handleThresholdChange(parseInt(e.target.value) || 24)}
                      className="w-14 bg-transparent text-slate-900 font-mono text-xs font-bold text-center focus:outline-none"
                    />
                    <span className="text-[11px] font-mono text-slate-500 font-medium">h</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleThresholdChange(settings.expiryThresholdHours + 6)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-transform"
                    title="Increase by 6h"
                  >
                    +6
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live System Preview / Active Expiring Tasks */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Live Indicator Preview</span>
              </div>
              <span className={`font-mono text-xs px-2.5 py-0.5 rounded-lg border font-bold ${
                expiringTasks.length > 0 
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {expiringTasks.length} {expiringTasks.length === 1 ? 'Task' : 'Tasks'} Currently Due Soon
              </span>
            </div>

            {expiringTasks.length > 0 ? (
              <div className="space-y-2 pt-1">
                {expiringTasks.map((item) => (
                  <div
                    key={`${item.application.id}-${item.task.id}`}
                    className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {item.application.company}
                        </span>
                        <span className="text-slate-400 text-xs font-normal">•</span>
                        <span className="text-slate-600 text-xs truncate">
                          {item.application.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-medium text-xs text-slate-800 truncate">
                          {item.task.title}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                        item.hoursLeft < 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                          : 'bg-amber-50 text-amber-800 border-amber-200/80'
                      }`}>
                        {item.formattedTimeLeft}
                      </span>
                      {onSelectApplication && (
                        <button
                          type="button"
                          onClick={() => onSelectApplication(item.application.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-100/80 rounded-lg transition-colors cursor-pointer"
                          title="Open Application Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No tasks currently match the {settings.expiryThresholdHours}-hour threshold across your active applications.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Settings: Data Management, CSV Import & Export */}
      <div className={`p-6 space-y-4 ${UI_TOKENS.card}`}>
        <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
          Data & System Operations
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-between p-3.5 rounded-[10px] border border-blue-200/90 bg-gradient-to-br from-blue-50/80 via-indigo-50/30 to-blue-50/50 hover:bg-blue-100/60 hover:border-blue-300 text-blue-950 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-blue-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-xs text-slate-900">Import Applications CSV</span>
                <span className="text-[11px] text-slate-500">Bulk upload applications file</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="flex items-center justify-between p-3.5 rounded-[10px] border border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300 text-slate-800 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <span className="block font-bold text-xs text-slate-900">Export Applications CSV</span>
                  <span className="text-[11px] text-slate-500">Download all data as tabular CSV</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </button>
          )}

          {onSeedDemoData && (
            <button
              type="button"
              onClick={onSeedDemoData}
              className="flex items-center justify-between p-3.5 rounded-[10px] border border-slate-200 bg-slate-50 hover:bg-amber-100/60 hover:border-amber-300 text-amber-950 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-amber-600 group-hover:rotate-180 transition-transform duration-500" />
                <div className="text-left">
                  <span className="block font-bold text-xs text-slate-900">Reload Sample Demo Data</span>
                  <span className="text-[11px] text-slate-500">Reset to 20+ realistic job entries</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
            </button>
          )}
        </div>
      </div>

      {/* CSV Import Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (newApps) => {
          if (onImportCSV) {
            await onImportCSV(newApps);
          }
        }}
      />
    </div>
  );
};
