import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Link2, Plus } from 'lucide-react';
import { Application } from '../types';
import { STAGE_CONFIG_MAP } from '../lib/constants';

export interface ApplicationSearchPickerProps {
  applications: Application[];
  selectedAppIds: string[];
  onToggleApp: (appId: string) => void;
  placeholder?: string;
  className?: string;
}

export const ApplicationSearchPicker: React.FC<ApplicationSearchPickerProps> = ({
  applications,
  selectedAppIds,
  onToggleApp,
  placeholder = 'Search jobs to link (e.g. Google, Frontend)...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve currently selected applications
  const selectedApps = useMemo(() => {
    return selectedAppIds
      .map((id) => applications.find((a) => a.id === id))
      .filter((app): app is Application => Boolean(app));
  }, [applications, selectedAppIds]);

  // Filter unlinked applications by search query
  const unlinkedApps = useMemo(() => {
    return applications.filter((app) => !selectedAppIds.includes(app.id));
  }, [applications, selectedAppIds]);

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unlinkedApps.slice(0, 8);
    return unlinkedApps
      .filter((app) => {
        const companyMatch = app.company.toLowerCase().includes(q);
        const roleMatch = app.role.toLowerCase().includes(q);
        const platformMatch = app.platform?.toLowerCase().includes(q);
        const statusMatch = app.status.toLowerCase().includes(q);
        return companyMatch || roleMatch || platformMatch || statusMatch;
      })
      .slice(0, 8);
  }, [unlinkedApps, query]);

  return (
    <div className={`space-y-2 ${className}`} ref={containerRef}>
      {/* Selected Applications Tags */}
      {selectedApps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedApps.map((app) => {
            const stageConfig = STAGE_CONFIG_MAP[app.status] || STAGE_CONFIG_MAP.Applied;
            return (
              <span
                key={app.id}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs bg-blue-50/90 border border-blue-200/90 text-blue-900 font-medium animate-in fade-in zoom-in-95 duration-150"
              >
                <span className="font-semibold truncate max-w-[140px]">{app.company}</span>
                <span className="text-[11px] text-blue-700/80 truncate max-w-[120px]">· {app.role}</span>
                <span
                  className={`inline-flex items-center px-1 py-0.2 rounded text-[9px] font-semibold border ${stageConfig.bg} ${stageConfig.text} ${stageConfig.border}`}
                >
                  {stageConfig.label}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleApp(app.id)}
                  title={`Unlink ${app.company}`}
                  className="p-0.5 hover:bg-blue-200/80 rounded-md text-blue-600 hover:text-blue-900 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search Input with Popover Dropdown */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-8 h-[38px] rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-medium transition-all"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Search Results Dropdown */}
        {isOpen && unlinkedApps.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100 max-h-56 overflow-y-auto z-40 animate-in fade-in zoom-in-95 duration-150">
            {filteredApps.length > 0 ? (
              filteredApps.map((app) => {
                const stageConfig = STAGE_CONFIG_MAP[app.status] || STAGE_CONFIG_MAP.Applied;
                return (
                  <button
                    type="button"
                    key={app.id}
                    onClick={() => {
                      onToggleApp(app.id);
                      setQuery('');
                      setIsOpen(false);
                    }}
                    className="w-full p-2.5 flex items-center justify-between gap-2 hover:bg-blue-50/70 text-left transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {app.company}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border ${stageConfig.bg} ${stageConfig.text} ${stageConfig.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dot}`} />
                          <span>{stageConfig.label}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {app.role} {app.platform ? `· ${app.platform}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 shrink-0 group-hover:translate-x-0.5 transition-all">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Link</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 font-mono">
                No matching applications found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
