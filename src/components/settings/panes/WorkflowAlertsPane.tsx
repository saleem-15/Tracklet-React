import React from 'react';
import { 
  Bell, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Calendar,
  Layers
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { useApplicationsContext } from '../../../context/ApplicationsContext';
import { useToastContext } from '../../../context/ToastContext';
import { SettingsCard } from '../SettingsCard';
import { SettingsRow } from '../SettingsRow';
import { SettingsSwitch } from '../SettingsSwitch';
import { SettingsStepInput } from '../SettingsStepInput';
import { getExpiringSoonTasks } from '../../../lib/expiryUtils';

const PRESET_HOURS = [12, 24, 48, 72, 168];

/**
 * WorkflowAlertsPane
 *
 * Pane 3 of the Settings Hub:
 * - Soon to Expire Task Notification Indicator
 * - Lookahead Threshold Presets & Stepped Precision Adjuster
 * - Application Staleness Threshold Policy
 * - Live Indicator Configuration Preview
 */
export const WorkflowAlertsPane: React.FC = () => {
  const { expirySettings, updateExpirySettings } = useSettings();
  const { applications } = useApplicationsContext();
  const { addToast } = useToastContext();

  const expiringTasks = getExpiringSoonTasks(applications, expirySettings.expiryThresholdHours);

  const handleToggle = (checked: boolean) => {
    updateExpirySettings({
      ...expirySettings,
      enabled: checked,
    });
    addToast(
      'info',
      checked ? 'Expiry Alerts Enabled' : 'Expiry Alerts Disabled',
      checked
        ? `Sidebar indicator will highlight tasks due within ${expirySettings.expiryThresholdHours} hours.`
        : 'Task expiry indicators are hidden from navigation.'
    );
  };

  const handleThresholdChange = (hours: number) => {
    if (hours < 1) hours = 1;
    if (hours > 720) hours = 720;
    updateExpirySettings({
      ...expirySettings,
      expiryThresholdHours: hours,
    });
    addToast(
      'success',
      'Threshold Updated',
      `Alert window set to ${hours} hours (${Math.round((hours / 24) * 10) / 10} days).`
    );
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Soon to Expire Notification Indicator ── */}
      <SettingsCard
        title="'Soon to Expire' Task Notification Indicator"
        icon={<Clock className="w-5 h-5 text-blue-600" />}
        badge={
          <span className="font-mono text-[11px] text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full font-semibold">
            Pipeline Signal
          </span>
        }
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-slate-600">
              {expirySettings.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <SettingsSwitch
              checked={expirySettings.enabled}
              onChange={handleToggle}
              label="Toggle soon to expire task alerts"
            />
          </div>
        }
      >
        <div className={`space-y-5 transition-opacity duration-200 ${expirySettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          {/* Quick Select Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-slate-700 uppercase tracking-wider font-bold">
              Expiry Alert Lookahead Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESET_HOURS.map((preset) => {
                const isActive = expirySettings.expiryThresholdHours === preset;
                const days = preset / 24;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleThresholdChange(preset)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-left border transition-colors cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className={`font-mono text-xs font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {preset >= 24 ? `${days}d` : `${preset}h`}
                    </span>
                    <span className={`text-[11px] ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {preset < 24 ? `${preset} hours` : `${days} ${days === 1 ? 'day' : 'days'}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stepped Precision Adjuster */}
          <SettingsRow
            title="Custom Threshold Lookahead"
            subtitle="Configure exact number of hours or days before task due dates trigger urgency badges."
            icon={<Clock className="w-4 h-4 text-slate-600" />}
            isDividerVisible
          >
            <SettingsStepInput
              valueHours={expirySettings.expiryThresholdHours}
              onChangeHours={handleThresholdChange}
              minHours={1}
              maxHours={720}
            />
          </SettingsRow>

          {/* Configuration Preview Feedback */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Active Window: <strong className="font-semibold text-slate-900">{expirySettings.expiryThresholdHours} Hours</strong> ({Math.round((expirySettings.expiryThresholdHours / 24) * 10) / 10} days)
              </span>
            </div>
            <span
              className={`font-mono text-xs px-2.5 py-0.5 rounded-lg border font-bold ${
                expiringTasks.length > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {expiringTasks.length} {expiringTasks.length === 1 ? 'Task' : 'Tasks'} Due Soon
            </span>
          </div>
        </div>
      </SettingsCard>

      {/* ── 2. Application Staleness Warning Policy ── */}
      <SettingsCard
        title="Application Staleness & Ghosting Rules"
        icon={<AlertCircle className="w-5 h-5 text-slate-600" />}
      >
        <SettingsRow
          title="Flag Stale Applications"
          subtitle="Display a warning badge when an application has had zero activity for 14 days."
          isDividerVisible
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
              14 Days Default
            </span>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Automated Ghosting Suggestion"
          subtitle="Suggest moving applications with 45+ days of inactivity into Archived / Ghosted."
        >
          <span className="font-mono text-xs text-slate-500">
            Active in Pipeline
          </span>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
};
