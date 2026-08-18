import React from 'react';
import { Globe, Calendar, Clock, CheckSquare } from 'lucide-react';

export interface ApplicationMetricsBarProps {
  platform?: string;
  dateApplied?: string;
  daysInStage: number;
  completedTasksCount: number;
  totalTasksCount: number;
}

export const ApplicationMetricsBar: React.FC<ApplicationMetricsBarProps> = ({
  platform,
  dateApplied,
  daysInStage,
  completedTasksCount,
  totalTasksCount,
}) => {
  const metrics = [
    { label: 'Platform', value: platform || '—', icon: <Globe className="w-3.5 h-3.5 text-slate-500" /> },
    { label: 'Applied', value: dateApplied || '—', icon: <Calendar className="w-3.5 h-3.5 text-slate-500" /> },
    { label: 'In Stage', value: `${daysInStage}d`, icon: <Clock className="w-3.5 h-3.5 text-slate-500" /> },
    {
      label: 'Tasks',
      value: totalTasksCount > 0 ? `${completedTasksCount}/${totalTasksCount}` : '—',
      icon: <CheckSquare className="w-3.5 h-3.5 text-slate-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-slate-50/80 rounded-xl border border-slate-200/80 px-3.5 py-3 flex items-center gap-3 shadow-2xs hover:border-slate-300 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            {m.icon}
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider block">
              {m.label}
            </span>
            <span className="font-bold text-slate-900 text-xs block font-mono truncate">{m.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
