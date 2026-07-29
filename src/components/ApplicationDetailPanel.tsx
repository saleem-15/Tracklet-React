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
  UserPlus,
  Pencil,
  Globe,
  Sparkles
} from 'lucide-react';
import { Application, ApplicationStatus, StatusHistoryEntry, Contact, ApplicationTask, JobPlatform } from '../types';
import { StatusBadge } from './StatusBadge';
import { StageSelectorDropdown } from './StageSelectorDropdown';
import { CompanyLogo } from './CompanyLogo';
import { CustomSelectDropdown } from './CustomSelectDropdown';
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

const ALL_PLATFORMS: JobPlatform[] = [
  'LinkedIn',
  'Indeed',
  'Lever',
  'Greenhouse',
  'Otta',
  'Company Site',
  'Referral',
  'Wellfound',
  'Other',
];

const STATUS_ACTIVE_STYLES: Record<ApplicationStatus, string> = {
  Wishlist: 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20 shadow-xs',
  Applied: 'bg-slate-700 text-white border-slate-700 shadow-xs',
  Screening: 'bg-amber-600 text-white border-amber-600 shadow-amber-500/20 shadow-xs',
  Interview: 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20 shadow-xs',
  Offer: 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20 shadow-xs',
  Rejected: 'bg-rose-600 text-white border-rose-600 shadow-rose-500/20 shadow-xs',
  Archived: 'bg-slate-500 text-white border-slate-500 shadow-xs',
};

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

function getInitials(name: string): string {
  if (!name.trim()) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  // Edit Application Info state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editCompany, setEditCompany] = useState(app.company || '');
  const [editRole, setEditRole] = useState(app.role || '');
  const [editPlatform, setEditPlatform] = useState<JobPlatform>(app.platform || 'LinkedIn');
  const [editDateApplied, setEditDateApplied] = useState(app.dateApplied || '');
  const [editJobLink, setEditJobLink] = useState(app.jobLink || '');
  const [editCompanyDomain, setEditCompanyDomain] = useState(app.companyDomain || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  useEffect(() => {
    setNotes(app.notes || '');
    setJobLink(app.jobLink || '');
    setContactEmail(app.contactEmail || '');
    setHasUnsavedNotes(false);

    // Sync Edit Form fields
    setEditCompany(app.company || '');
    setEditRole(app.role || '');
    setEditPlatform(app.platform || 'LinkedIn');
    setEditDateApplied(app.dateApplied || '');
    setEditJobLink(app.jobLink || '');
    setEditCompanyDomain(app.companyDomain || '');
  }, [app.id, app.notes, app.jobLink, app.contactEmail, app.company, app.role, app.platform, app.dateApplied, app.companyDomain]);

  const handleSaveInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editCompany.trim() || !editRole.trim()) return;

    setIsSavingInfo(true);
    try {
      await onUpdateApp(app.id, {
        company: editCompany.trim(),
        role: editRole.trim(),
        platform: editPlatform,
        dateApplied: editDateApplied,
        jobLink: editJobLink.trim() || undefined,
        companyDomain: editCompanyDomain.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      setIsEditingInfo(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (err) {
      console.error('Failed to save application info:', err);
    } finally {
      setIsSavingInfo(false);
    }
  };

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

  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  const isDirty = hasUnsavedNotes || isEditingInfo || cName.trim() !== '' || cEmail.trim() !== '';

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUnsavedPrompt) {
          setShowUnsavedPrompt(false);
        } else {
          handleRequestClose();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showUnsavedPrompt, isDirty]);

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

  const completedTasksCount = app.tasks ? app.tasks.filter((t) => t.completed).length : 0;
  const totalTasksCount = app.tasks ? app.tasks.length : 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={handleRequestClose}
    >
      {/* Unsaved Changes Guard Dialog */}
      {showUnsavedPrompt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">Discard unsaved changes?</h3>
              <p className="text-xs text-slate-500">
                You have unsaved edits in notes or form fields. Are you sure you want to exit without saving?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUnsavedPrompt(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedPrompt(false);
                  onClose();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className="w-full max-w-5xl max-h-[92vh] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 shrink-0">
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
                <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 tracking-tight truncate">
                  {app.company}
                </h2>
                {app.jobLink && (
                  <a
                    href={app.jobLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1 shrink-0"
                    title="Open Job Posting in new tab"
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

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                isEditingInfo
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Edit company, role, platform & date"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEditingInfo ? 'Cancel Editing' : 'Edit Info'}</span>
            </button>
            <StatusBadge status={app.status} size="md" />
            <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl hover:bg-rose-100/60 text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
              title="Delete application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRequestClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/80"
              title="Close dialog (Esc)"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs space-y-6">
          {/* Edit Info Form Banner */}
          {isEditingInfo && (
            <div className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/50 border border-blue-200/90 rounded-2xl p-4 space-y-4 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-blue-100/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">
                    Edit Application Details
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Update metadata & links</span>
              </div>

              <form onSubmit={handleSaveInfo} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1">
                      Company Name *
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        placeholder="e.g. Google"
                        className="w-full bg-white text-slate-900 font-semibold pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1">
                      Job Title / Role *
                    </label>
                    <div className="relative">
                      <Briefcase className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full bg-white text-slate-900 font-semibold pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1">
                      Job Platform
                    </label>
                    <CustomSelectDropdown<JobPlatform>
                      value={editPlatform}
                      onChange={(val) => setEditPlatform(val)}
                      options={ALL_PLATFORMS.map((p) => ({ label: p, value: p }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1">
                      Date Applied
                    </label>
                    <input
                      type="date"
                      value={editDateApplied}
                      onChange={(e) => setEditDateApplied(e.target.value)}
                      className="w-full bg-white text-slate-900 font-mono px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1">
                      Company Domain (for Logo)
                    </label>
                    <input
                      type="text"
                      value={editCompanyDomain}
                      onChange={(e) => setEditCompanyDomain(e.target.value)}
                      placeholder="e.g. google.com"
                      className="w-full bg-white text-slate-900 font-mono px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-600 mb-1">
                    Job Posting Link
                  </label>
                  <input
                    type="url"
                    value={editJobLink}
                    onChange={(e) => setEditJobLink(e.target.value)}
                    placeholder="https://company.com/jobs/..."
                    className="w-full bg-white text-slate-900 font-mono px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-200/60 font-medium text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingInfo || !editCompany.trim() || !editRole.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl font-bold text-xs cursor-pointer shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingInfo ? 'Saving...' : 'Save Info'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider block">Platform</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block font-mono">{app.platform}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-2xs">
                <Globe className="w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider block">Date Applied</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block font-mono">{app.dateApplied}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-2xs">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider block">Time in Stage</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block font-mono">
                  {daysInStage} {daysInStage === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-2xs">
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider block">Task Progress</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block font-mono">
                  {totalTasksCount > 0 ? `${completedTasksCount}/${totalTasksCount} Done` : 'No tasks'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-2xs">
                <CheckSquare className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Main 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (Stage Pipeline, Tasks & Checklist, Notes) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Stage Advancement & Stepper */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Stage Advancement
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{daysInStage} {daysInStage === 1 ? 'day' : 'days'} in stage</span>
                  </span>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-4 shadow-2xs">
                  {/* Visual Linear Pipeline Stepper (5 Active Stages) */}
                  <div className="relative pt-1 pb-1">
                    <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 rounded-full z-0" />
                    <div className="relative z-10 flex justify-between items-center px-1">
                      {(['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer'] as ApplicationStatus[]).map((stg, idx) => {
                        const activeStages: ApplicationStatus[] = ['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer'];
                        const currentIndex = activeStages.indexOf(app.status as ApplicationStatus);
                        const isCurrent = app.status === stg;
                        const isCompleted = currentIndex > idx && currentIndex !== -1;

                        return (
                          <button
                            key={stg}
                            type="button"
                            onClick={() => handleStatusChange(stg)}
                            className="group flex flex-col items-center cursor-pointer focus:outline-none"
                            title={`Move to ${stg}`}
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

                  {/* Terminal Outcome Quick Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-mono text-slate-500 font-medium uppercase tracking-wider">
                      Terminal Outcomes:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange('Rejected')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          app.status === 'Rejected'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-rose-500/20'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200/80'
                        }`}
                      >
                        {app.status === 'Rejected' && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
                        <span>Mark Rejected</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange('Archived')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          app.status === 'Archived'
                            ? 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/90'
                        }`}
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Tasks & Checklist Section (Stitch Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tasks ({totalTasksCount})</span>
                  </label>
                  {totalTasksCount > 0 && (
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold border border-blue-200/60 shadow-2xs">
                      {completedTasksCount}/{totalTasksCount} Done
                    </span>
                  )}
                </div>

                <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                  <div className="p-3.5 space-y-2.5">
                    {app.tasks && app.tasks.length > 0 ? (
                      app.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-3 group">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task.id)}
                              aria-label={`Toggle task ${task.title}`}
                              className={`w-5 h-5 rounded border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                                task.completed
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                                  : 'bg-white border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'
                              }`}
                            >
                              {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                            <span
                              className={`text-xs font-semibold truncate ${
                                task.completed
                                  ? 'text-slate-400 line-through opacity-70'
                                  : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 shadow-2xs">
                                <Clock className="w-3 h-3 text-blue-500" />
                                <span>Due {task.dueDate}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 font-mono text-[11px] text-center py-2">
                        No pending tasks yet.
                      </div>
                    )}
                  </div>

                  {/* Add Task Input / Button */}
                  <form onSubmit={handleAddTask} className="border-t border-slate-200/80 bg-slate-100/40 p-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="+ Add Task (e.g. Follow up with recruiter)"
                      className="flex-1 bg-white text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans text-xs transition-all shadow-2xs"
                    />
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-28 bg-white text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-[11px] cursor-pointer shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Notes Textarea & Scratchpad (Flat Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Notes & Interview Scratchpad</span>
                  </label>
                  {hasUnsavedNotes ? (
                    <span className="font-mono text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                      Unsaved (Press ⌘+Enter)
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
                  className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs leading-relaxed resize-y shadow-2xs transition-all"
                />
              </div>

            </div>

            {/* Right Column (Job Link, Primary Email, Contacts, Status History) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Job Link Box (Flat Style) */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider font-bold">
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
                    className="flex-1 bg-slate-50/80 text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs h-9"
                  />
                  {app.jobLink && (
                    <a
                      href={app.jobLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white text-blue-600 hover:text-blue-700 border border-slate-200 transition-colors shrink-0 shadow-2xs h-9 w-9 flex items-center justify-center"
                      title="Open job link in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Primary Contact Email Bar (Flat Style) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Primary Contact Email</span>
                  </label>
                  {contactEmail && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(contactEmail)}
                        className="flex items-center gap-1 text-[10px] font-mono text-slate-600 hover:text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer shadow-2xs"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>{copiedEmail ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => handleUpdateContactEmail(e.target.value)}
                  placeholder="e.g. recruiter@company.com"
                  className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs h-9"
                />
              </div>

              {/* Emails Section (Stitch Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Emails ({app.emails ? app.emails.length : (app.contactEmail ? 1 : 0)})</span>
                  </label>
                  {app.contactEmail && (
                    <a
                      href={`mailto:${app.contactEmail}`}
                      className="flex items-center gap-1 text-[10px] font-mono bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200/60 shadow-2xs transition-colors"
                    >
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span>Compose Mail</span>
                    </a>
                  )}
                </div>

                <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 divide-y divide-slate-200/60 overflow-hidden shadow-2xs">
                  {app.emails && app.emails.length > 0 ? (
                    app.emails.map((email) => (
                      <div key={email.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-100/50 cursor-pointer transition-colors group">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {email.subject}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                            From: {email.sender}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 font-semibold shrink-0">
                          {email.date}
                        </span>
                      </div>
                    ))
                  ) : app.contactEmail ? (
                    <div className="p-3 flex items-center justify-between gap-3 hover:bg-slate-100/50 cursor-pointer transition-colors group">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          Application Correspondence
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                          From: {app.contactEmail}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-semibold shrink-0">
                        {app.dateApplied || 'Active'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-400 font-mono text-[11px] text-center py-3 bg-white">
                      No emails logged yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts & Recruiters Section (Stitch Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Contacts ({app.contacts ? app.contacts.length : 0})</span>
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

                <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 divide-y divide-slate-200/60 overflow-hidden shadow-2xs">
                  {app.contacts && app.contacts.length > 0 ? (
                    app.contacts.map((contact, idx) => {
                      const avatarColors = [
                        'bg-blue-100 text-blue-700 border-blue-200',
                        'bg-amber-100 text-amber-700 border-amber-200',
                        'bg-emerald-100 text-emerald-700 border-emerald-200',
                        'bg-indigo-100 text-indigo-700 border-indigo-200',
                      ];
                      const avatarColor = avatarColors[idx % avatarColors.length];

                      return (
                        <div key={contact.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-100/40 transition-colors group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full border font-bold font-mono text-xs flex items-center justify-center shrink-0 shadow-2xs ${avatarColor}`}>
                              {getInitials(contact.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{contact.name}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">{contact.role || 'Recruiter / Contact'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={`Email ${contact.email}`}
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {contact.linkedIn && (
                              <a
                                href={contact.linkedIn}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Open LinkedIn Profile"
                              >
                                <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(contact.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Remove contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : !showAddContact ? (
                    <div className="text-slate-400 font-mono text-[11px] text-center py-3 bg-white">
                      No contacts saved yet.
                    </div>
                  ) : null}
                </div>

                {/* Add Contact Form Expandable */}
                {showAddContact && (
                  <form onSubmit={handleAddContact} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150 shadow-2xs">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                        placeholder="Name *"
                        className="bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                      <input
                        type="text"
                        value={cRole}
                        onChange={(e) => setCRole(e.target.value)}
                        placeholder="Role (e.g. Recruiter)"
                        className="bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        value={cEmail}
                        onChange={(e) => setCEmail(e.target.value)}
                        placeholder="Email address"
                        className="bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                      />
                      <input
                        type="tel"
                        value={cPhone}
                        onChange={(e) => setCPhone(e.target.value)}
                        placeholder="Phone number"
                        className="bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                      />
                    </div>
                    <input
                      type="url"
                      value={cLinkedIn}
                      onChange={(e) => setCLinkedIn(e.target.value)}
                      placeholder="LinkedIn Profile URL"
                      className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                    />
                    <input
                      type="text"
                      value={cNotes}
                      onChange={(e) => setCNotes(e.target.value)}
                      placeholder="Notes"
                      className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddContact(false)}
                        className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-xs cursor-pointer"
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

              {/* Status Change History (Flat Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    <span>Status Change History</span>
                  </label>
                  <span className="font-mono text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {historyEntries.length} {historyEntries.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 max-h-[220px] overflow-y-auto pr-1.5 shadow-2xs">
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
                          <div className="absolute -left-3.5 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white shrink-0" />
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

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between shrink-0">
          <button
            onClick={() => handleStatusChange('Archived')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all font-medium shadow-2xs cursor-pointer text-xs"
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all text-xs shadow-xs cursor-pointer ${
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
