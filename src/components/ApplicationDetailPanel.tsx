import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Building2, 
  Briefcase, 
  Calendar, 
  Clock, 
  Save, 
  Trash2, 
  Archive, 
  Check,
  FileText,
  History,
  ArrowRight,
  Mail,
  Phone,
  Linkedin,
  CheckSquare,
  Square,
  Plus,
  Users,
  Copy,
  UserPlus
} from 'lucide-react';
import { Application, ApplicationStatus, StatusHistoryEntry, Contact, ApplicationTask } from '../types';
import { StatusBadge } from './StatusBadge';
import { StageSelectorDropdown } from './StageSelectorDropdown';
import { CompanyLogo } from './CompanyLogo';
import { calculateDaysInStage } from '../lib/sampleData';
import { fetchStatusHistory } from '../lib/historyService';

interface ApplicationDetailPanelProps {
  app: Application | null;
  onClose: () => void;
  onUpdateApp: (id: string, updates: Partial<Application>) => Promise<void>;
  onDeleteApp: (id: string) => Promise<void>;
}

const ALL_STATUSES: ApplicationStatus[] = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export const ApplicationDetailPanel: React.FC<ApplicationDetailPanelProps> = ({
  app,
  onClose,
  onUpdateApp,
  onDeleteApp,
}) => {
  if (!app) return null;

  const [notes, setNotes] = useState(app.notes || '');
  const [jobLink, setJobLink] = useState(app.jobLink || '');
  const [contactEmail, setContactEmail] = useState(app.contactEmail || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Tasks state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Contacts state
  const [showAddContact, setShowAddContact] = useState(false);
  const [cName, setCName] = useState('');
  const [cRole, setCRole] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cLinkedIn, setCLinkedIn] = useState('');
  const [cNotes, setCNotes] = useState('');

  const [historyEntries, setHistoryEntries] = useState<StatusHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    setNotes(app.notes || '');
    setJobLink(app.jobLink || '');
    setContactEmail(app.contactEmail || '');
    setHasUnsavedNotes(false);
  }, [app.id, app.notes, app.jobLink, app.contactEmail]);

  // Task Handlers
  const handleToggleTask = async (taskId: string) => {
    const currentTasks = app.tasks || [];
    const updatedTasks = currentTasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    await onUpdateApp(app.id, { tasks: updatedTasks, updatedAt: new Date().toISOString() });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: ApplicationTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
      dueDate: newTaskDueDate || undefined,
    };
    const updatedTasks = [...(app.tasks || []), newTask];
    await onUpdateApp(app.id, { tasks: updatedTasks, updatedAt: new Date().toISOString() });
    setNewTaskTitle('');
    setNewTaskDueDate('');
  };

  const handleDeleteTask = async (taskId: string) => {
    const currentTasks = app.tasks || [];
    const updatedTasks = currentTasks.filter((t) => t.id !== taskId);
    await onUpdateApp(app.id, { tasks: updatedTasks, updatedAt: new Date().toISOString() });
  };

  // Contact Handlers
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;
    const newContact: Contact = {
      id: `c-${Date.now()}`,
      name: cName.trim(),
      role: cRole.trim() || undefined,
      email: cEmail.trim() || undefined,
      phone: cPhone.trim() || undefined,
      linkedIn: cLinkedIn.trim() || undefined,
      notes: cNotes.trim() || undefined,
    };
    const updatedContacts = [...(app.contacts || []), newContact];
    
    // Auto populate main contact email if empty
    const updates: Partial<Application> = {
      contacts: updatedContacts,
      updatedAt: new Date().toISOString(),
    };
    if (!app.contactEmail && cEmail.trim()) {
      updates.contactEmail = cEmail.trim();
    }

    await onUpdateApp(app.id, updates);

    // Reset contact form
    setCName('');
    setCRole('');
    setCEmail('');
    setCPhone('');
    setCLinkedIn('');
    setCNotes('');
    setShowAddContact(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    const currentContacts = app.contacts || [];
    const updatedContacts = currentContacts.filter((c) => c.id !== contactId);
    await onUpdateApp(app.id, { contacts: updatedContacts, updatedAt: new Date().toISOString() });
  };

  const handleUpdateContactEmail = async (emailVal: string) => {
    setContactEmail(emailVal);
    await onUpdateApp(app.id, { contactEmail: emailVal.trim() || undefined, updatedAt: new Date().toISOString() });
  };

  const handleCopyEmail = (emailStr: string) => {
    navigator.clipboard.writeText(emailStr);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  useEffect(() => {
    let isMounted = true;
    if (app?.id) {
      setIsLoadingHistory(true);
      fetchStatusHistory(app.id)
        .then((entries) => {
          if (isMounted) {
            setHistoryEntries(entries);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingHistory(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [app.id, app.status]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onClose]);

  const daysInStage = calculateDaysInStage(app.stageUpdatedAt);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (newStatus === app.status) return;
    const now = new Date().toISOString();
    await onUpdateApp(app.id, {
      status: newStatus,
      stageUpdatedAt: now,
      updatedAt: now,
    });
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    setHasUnsavedNotes(val !== (app.notes || ''));
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const now = new Date().toISOString();
    await onUpdateApp(app.id, {
      notes: notes.trim(),
      jobLink: jobLink.trim(),
      updatedAt: now,
    });
    setIsSavingNotes(false);
    setHasUnsavedNotes(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleDelete = async () => {
    if (confirm(`Delete application for ${app.company} - ${app.role}?`)) {
      await onDeleteApp(app.id);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl max-h-[90vh] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <CompanyLogo
              company={app.company}
              jobLink={app.jobLink}
              logoUrl={app.logoUrl}
              companyDomain={app.companyDomain}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                  {app.company}
                </h2>
                {app.jobLink && (
                  <a
                    href={app.jobLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                    title="Open Job Posting"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                {app.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <StatusBadge status={app.status} size="md" />
            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Delete application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/80"
              title="Close dialog (Esc)"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (Stage Advancement, Tasks, Notes) */}
            <div className="lg:col-span-7 space-y-6">

          {/* Quick Stage Advancement / Selector */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-800 uppercase tracking-wider font-bold">
                  Stage Advancement
                </span>
                <StageSelectorDropdown
                  currentStatus={app.status}
                  onSelectStatus={handleStatusChange}
                  size="sm"
                />
              </div>
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{daysInStage} {daysInStage === 1 ? 'day' : 'days'} in stage</span>
              </span>
            </div>

            {/* Visual Linear Pipeline Stepper */}
            <div className="relative pt-1 pb-2">
              <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 rounded-full z-0" />
              <div className="relative z-10 flex justify-between items-center px-1">
                {(['Applied', 'Screening', 'Interview', 'Offer'] as ApplicationStatus[]).map((stg, idx) => {
                  const stagesOrder: ApplicationStatus[] = ['Applied', 'Screening', 'Interview', 'Offer'];
                  const currentIndex = stagesOrder.indexOf(app.status as ApplicationStatus);
                  const isCurrent = app.status === stg;
                  const isCompleted = currentIndex > idx;

                  return (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => handleStatusChange(stg)}
                      className="group flex flex-col items-center cursor-pointer focus:outline-none"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold transition-all shadow-xs ${
                          isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 scale-110'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white border-2 border-slate-300 text-slate-500 group-hover:border-blue-400 group-hover:text-blue-600'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <span
                        className={`mt-1.5 text-[10px] font-medium font-mono ${
                          isCurrent
                            ? 'text-blue-600 font-bold'
                            : isCompleted
                            ? 'text-emerald-700'
                            : 'text-slate-500 group-hover:text-slate-800'
                        }`}
                      >
                        {stg}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Select Preset Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
              {ALL_STATUSES.map((s) => {
                const isActive = app.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200/90'
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
                    <span className="truncate">{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

            </div>

            {/* Right Column (Metadata, Job Link, Primary Contact, Contacts, History) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block mb-1 uppercase tracking-wider text-[10px] font-medium">
                    Platform
                  </span>
                  <span className="text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 inline-block font-semibold shadow-2xs">
                    {app.platform}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1 uppercase tracking-wider text-[10px] font-medium">
                    Date Applied
                  </span>
                  <span className="text-slate-900 flex items-center gap-1.5 pt-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {app.dateApplied}
                  </span>
                </div>
              </div>

              {/* Status Change History */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Status Change History</span>
                  </label>
                  <span className="font-mono text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {historyEntries.length} {historyEntries.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4">
                  {isLoadingHistory ? (
                    <div className="text-slate-400 font-mono text-[11px] text-center py-2">
                      Loading history logs...
                    </div>
                  ) : historyEntries.length === 0 ? (
                    <div className="flex items-start gap-3 py-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                          <span>Applied / Created with</span>
                          <StatusBadge status={app.status} size="sm" />
                        </div>
                        <p className="text-slate-400 font-mono text-[10px] mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatTimestamp(app.createdAt || app.stageUpdatedAt)}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-3 space-y-3.5 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {historyEntries.map((entry, idx) => (
                        <div key={entry.id || idx} className="relative flex items-start gap-3">
                          <div className="absolute -left-3.5 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-slate-50 shrink-0" />
                          <div className="flex-1 min-w-0 pl-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {entry.fromStatus ? (
                                <div className="flex items-center gap-1.5">
                                  <StatusBadge status={entry.fromStatus} size="sm" />
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  <StatusBadge status={entry.toStatus} size="sm" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] text-slate-500 font-medium">Set status to:</span>
                                  <StatusBadge status={entry.toStatus} size="sm" />
                                </div>
                              )}
                            </div>
                            <p className="text-slate-400 font-mono text-[10px] mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formatTimestamp(entry.timestamp)}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

          {/* Primary Contact Email Bar */}
          <div className="space-y-1.5 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Primary Contact Email</span>
              </label>
              {contactEmail && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(contactEmail)}
                    className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>{copiedEmail ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-1 text-[10px] font-mono bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 py-0.5 rounded shadow-2xs cursor-pointer"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Send Email</span>
                  </a>
                </div>
              )}
            </div>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => handleUpdateContactEmail(e.target.value)}
              placeholder="e.g. recruiter@company.com"
              className="w-full bg-white text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs transition-all shadow-2xs"
            />
          </div>

          {/* Actionable Tasks & Checklist Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Tasks & Follow-ups</span>
              </label>
              {app.tasks && app.tasks.length > 0 ? (
                <span className="font-mono text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {app.tasks.filter((t) => t.completed).length}/{app.tasks.length} Completed
                </span>
              ) : null}
            </div>

            {/* Task Progress Bar */}
            {app.tasks && app.tasks.length > 0 ? (
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (app.tasks.filter((t) => t.completed).length / app.tasks.length) * 100
                    )}%`,
                  }}
                />
              </div>
            ) : null}

            {/* Task List */}
            <div className="space-y-1.5">
              {app.tasks && app.tasks.length > 0 ? (
                app.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-slate-50/60 border-slate-200/60 text-slate-400 line-through'
                        : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${
                          task.completed ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'
                        }`}
                      >
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4 fill-blue-50" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <span className="font-medium text-xs truncate">{task.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.dueDate && (
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{task.dueDate}</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 font-mono text-[11px] text-center py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No pending tasks yet. Add a follow-up or preparation task below.
                </div>
              )}
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add new task (e.g. Prepare system design slides)"
                className="flex-1 bg-slate-50 text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
              />
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="bg-slate-50 text-slate-700 px-2 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-[11px] cursor-pointer shadow-2xs w-28"
              />
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-semibold transition-all shadow-2xs cursor-pointer shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Contacts & Recruiters Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Contacts & Recruiters</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddContact(!showAddContact)}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-blue-200/60"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
              </button>
            </div>

            {/* Contacts List */}
            {app.contacts && app.contacts.length > 0 ? (
              <div className="space-y-2.5">
                {app.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{contact.name}</span>
                          {contact.role && (
                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 font-medium">
                              {contact.role}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Remove contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] flex-wrap text-slate-600 pt-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 hover:text-blue-600 font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs"
                        >
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{contact.email}</span>
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 hover:text-blue-600 font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{contact.phone}</span>
                        </a>
                      )}
                      {contact.linkedIn && (
                        <a
                          href={contact.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-blue-600 font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs"
                        >
                          <Linkedin className="w-3 h-3 text-blue-500" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                    </div>

                    {contact.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-white/80 p-2 rounded-lg border border-slate-100">
                        "{contact.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : !showAddContact ? (
                <div className="text-slate-400 font-mono text-[11px] text-center py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No contacts saved for this application.
                </div>
              ) : null}

            {/* Add Contact Form Expandable */}
            {showAddContact && (
              <form onSubmit={handleAddContact} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="Name *"
                    className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                  <input
                    type="text"
                    value={cRole}
                    onChange={(e) => setCRole(e.target.value)}
                    placeholder="Role (e.g. Tech Recruiter)"
                    className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    placeholder="Email address"
                    className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                  />
                  <input
                    type="tel"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    placeholder="Phone number"
                    className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                  />
                </div>
                <input
                  type="url"
                  value={cLinkedIn}
                  onChange={(e) => setCLinkedIn(e.target.value)}
                  placeholder="LinkedIn Profile URL (https://...)"
                  className="w-full bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                />
                <input
                  type="text"
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  placeholder="Notes (e.g. Responds fast on Slack/Email)"
                  className="w-full bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddContact(false)}
                    className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200/60 font-medium text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!cName.trim()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg font-semibold text-xs cursor-pointer shadow-2xs"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Job Link */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium">
              Job Listing Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={jobLink}
                onChange={(e) => {
                  setJobLink(e.target.value);
                  setHasUnsavedNotes(true);
                }}
                placeholder="https://company.com/careers/job-id"
                className="flex-1 bg-slate-50 text-slate-900 placeholder-slate-400 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs"
              />
              {app.jobLink && (
                <a
                  href={app.jobLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white text-blue-600 hover:text-blue-700 border border-slate-200 transition-colors shrink-0 shadow-2xs"
                  title="Open link in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Notes Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Notes & Scratchpad</span>
              </label>
              {hasUnsavedNotes ? (
                <span className="font-mono text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                  Unsaved (Press ⌘+Enter to save)
                </span>
              ) : (
                <span className="font-mono text-[10px] text-slate-400">
                  ⌘+Enter to save
                </span>
              )}
            </div>

            <textarea
              rows={6}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (hasUnsavedNotes) handleSaveNotes();
                }
              }}
              placeholder="Add interview feedback, contact names, salary details, prep links..."
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs leading-relaxed resize-y shadow-2xs transition-all"
            />
          </div>
        </div>
      </div>
    </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            onClick={() => handleStatusChange('Archived')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all font-medium shadow-2xs cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>Archive</span>
          </button>

          <div className="flex items-center gap-2">
            {showSavedToast && (
              <span className="text-emerald-600 font-mono text-[11px] flex items-center gap-1 mr-2 font-semibold">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}

            <button
              onClick={handleSaveNotes}
              disabled={!hasUnsavedNotes || isSavingNotes}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all shadow-xs cursor-pointer ${
                hasUnsavedNotes
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingNotes ? 'Saving...' : 'Save Notes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
