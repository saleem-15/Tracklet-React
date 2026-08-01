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
  Check,
  FileText,
  History,
  ArrowRight,
  Mail,
  Phone,
  Linkedin,
  CheckSquare,
  Plus,
  Users,
  Copy,
  UserPlus,
  Pencil,
  Globe,
  Sparkles,
  Link,
  AtSign,
} from 'lucide-react';
import { Application, ApplicationStatus, StatusHistoryEntry, Contact, ApplicationTask, JobPlatform } from '../types';
import { StatusBadge } from './StatusBadge';
import { StageSelectorDropdown } from './StageSelectorDropdown';
import { CompanyLogo } from './CompanyLogo';
import { CustomSelectDropdown } from './CustomSelectDropdown';
import { calculateDaysInStage, formatTimestamp } from '../lib/dateUtils';
import { JOB_PLATFORMS } from '../lib/constants';
import { fetchStatusHistory } from '../lib/historyService';
import { TaskItem } from './TaskItem';

interface ApplicationDetailPanelProps {
  app: Application | null;
  onClose: () => void;
  onUpdateApp: (id: string, updates: Partial<Application>) => Promise<void>;
  onDeleteApp: (id: string) => Promise<void>;
}

function getInitials(name: string): string {
  if (!name.trim()) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const ApplicationDetailPanel: React.FC<ApplicationDetailPanelProps> = ({ app, onClose, onUpdateApp, onDeleteApp }) => {
  const [notes, setNotes] = useState(app?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Clipboard states
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Tasks
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Contacts
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [cName, setCName] = useState('');
  const [cRole, setCRole] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cLinkedIn, setCLinkedIn] = useState('');
  const [cNotes, setCNotes] = useState('');

  // Email log
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailSender, setEmailSender] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailDate, setEmailDate] = useState('');
  const [emailSnippet, setEmailSnippet] = useState('');

  // History
  const [historyEntries, setHistoryEntries] = useState<StatusHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Edit Info form — covers company, role, platform, date, job link, domain, contact email
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editCompany, setEditCompany] = useState(app?.company || '');
  const [editRole, setEditRole] = useState(app?.role || '');
  const [editPlatform, setEditPlatform] = useState<JobPlatform>(app?.platform || 'LinkedIn');
  const [editDateApplied, setEditDateApplied] = useState(app?.dateApplied || '');
  const [editJobLink, setEditJobLink] = useState(app?.jobLink || '');
  const [editCompanyDomain, setEditCompanyDomain] = useState(app.companyDomain || '');
  const [editContactEmail, setEditContactEmail] = useState(app.contactEmail || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  useEffect(() => {
    setNotes(app.notes || '');
    setHasUnsavedNotes(false);
    setEmailSender(app.contactEmail || '');
    setEmailRecipient('');
    setEditCompany(app.company || '');
    setEditRole(app.role || '');
    setEditPlatform(app.platform || 'LinkedIn');
    setEditDateApplied(app.dateApplied || '');
    setEditJobLink(app.jobLink || '');
    setEditCompanyDomain(app.companyDomain || '');
    setEditContactEmail(app.contactEmail || '');
  }, [app.id, app.notes, app.contactEmail, app.company, app.role, app.platform, app.dateApplied, app.companyDomain, app.jobLink]);

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
        contactEmail: editContactEmail.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      setIsEditingInfo(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (err) {
      console.error('Failed to save info:', err);
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Tasks
  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = (app.tasks || []).map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t);
    await onUpdateApp(app.id, { tasks: updatedTasks, updatedAt: new Date().toISOString() });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: ApplicationTask = { id: `task-${Date.now()}`, title: newTaskTitle.trim(), completed: false, dueDate: newTaskDueDate || undefined };
    await onUpdateApp(app.id, { tasks: [...(app.tasks || []), newTask], updatedAt: new Date().toISOString() });
    setNewTaskTitle('');
    setNewTaskDueDate('');
  };

  const handleDeleteTask = async (taskId: string) => {
    await onUpdateApp(app.id, { tasks: (app.tasks || []).filter((t) => t.id !== taskId), updatedAt: new Date().toISOString() });
  };

  // Contacts
  const handleStartEditContact = (contact: Contact) => {
    setEditingContactId(contact.id);
    setCName(contact.name || ''); setCRole(contact.role || ''); setCEmail(contact.email || '');
    setCPhone(contact.phone || ''); setCLinkedIn(contact.linkedIn || ''); setCNotes(contact.notes || '');
    setShowAddContact(false);
  };

  const handleCancelContactForm = () => {
    setShowAddContact(false);
    setEditingContactId(null);
    setCName(''); setCRole(''); setCEmail(''); setCPhone(''); setCLinkedIn(''); setCNotes('');
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;
    let updatedContacts: Contact[];
    if (editingContactId) {
      updatedContacts = (app.contacts || []).map((c) =>
        c.id === editingContactId
          ? { ...c, name: cName.trim(), role: cRole.trim() || undefined, email: cEmail.trim() || undefined, phone: cPhone.trim() || undefined, linkedIn: cLinkedIn.trim() || undefined, notes: cNotes.trim() || undefined }
          : c
      );
    } else {
      const newContact: Contact = { id: `c-${Date.now()}`, name: cName.trim(), role: cRole.trim() || undefined, email: cEmail.trim() || undefined, phone: cPhone.trim() || undefined, linkedIn: cLinkedIn.trim() || undefined, notes: cNotes.trim() || undefined };
      updatedContacts = [...(app.contacts || []), newContact];
    }
    const updates: Partial<Application> = { contacts: updatedContacts, updatedAt: new Date().toISOString() };
    if (!app.contactEmail && cEmail.trim()) updates.contactEmail = cEmail.trim();
    await onUpdateApp(app.id, updates);
    handleCancelContactForm();
  };

  const handleDeleteContact = async (contactId: string) => {
    await onUpdateApp(app.id, { contacts: (app.contacts || []).filter((c) => c.id !== contactId), updatedAt: new Date().toISOString() });
  };

  // Email log
  const handleAddEmailLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailSender.trim()) return;
    const newEmailLog = { id: `email-${Date.now()}`, subject: emailSubject.trim(), sender: emailSender.trim(), recipient: emailRecipient.trim() || undefined, date: emailDate || new Date().toISOString().split('T')[0], snippet: emailSnippet.trim() || undefined };
    await onUpdateApp(app.id, { emails: [...(app.emails || []), newEmailLog], updatedAt: new Date().toISOString() });
    setEmailSubject(''); setEmailSender(app.contactEmail || ''); setEmailRecipient(''); setEmailDate(''); setEmailSnippet('');
    setShowAddEmail(false);
  };

  // Clipboard
  const handleCopyEmail = () => {
    if (app.contactEmail) { navigator.clipboard.writeText(app.contactEmail); setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
  };
  const handleCopyLink = () => {
    if (app.jobLink) { navigator.clipboard.writeText(app.jobLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
  };
  const handleCopyPhone = (phoneStr: string, contactId: string) => {
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhoneId(contactId);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // History
  useEffect(() => {
    let isMounted = true;
    if (app?.id) {
      setIsLoadingHistory(true);
      fetchStatusHistory(app.id)
        .then((entries) => { if (isMounted) setHistoryEntries(entries); })
        .finally(() => { if (isMounted) setIsLoadingHistory(false); });
    }
    return () => { isMounted = false; };
  }, [app.id, app.status]);

  // Unsaved changes guard
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const isDirty = hasUnsavedNotes || isEditingInfo || cName.trim() !== '' || showAddContact;

  const handleRequestClose = () => {
    if (isDirty) setShowUnsavedPrompt(true);
    else onClose();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (showUnsavedPrompt) setShowUnsavedPrompt(false); else handleRequestClose(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showUnsavedPrompt, isDirty]);

  if (!app) return null;

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (newStatus === app.status) return;
    const now = new Date().toISOString();
    await onUpdateApp(app.id, { status: newStatus, stageUpdatedAt: now, updatedAt: now });
  };

  const handleNotesChange = (val: string) => { setNotes(val); setHasUnsavedNotes(val !== (app.notes || '')); };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await onUpdateApp(app.id, { notes: notes.trim(), updatedAt: new Date().toISOString() });
    setIsSavingNotes(false);
    setHasUnsavedNotes(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleDelete = async () => {
    if (confirm(`Delete application for ${app.company} – ${app.role}?`)) { await onDeleteApp(app.id); onClose(); }
  };

  const daysInStage = calculateDaysInStage(app.stageUpdatedAt);
  const completedTasksCount = app.tasks ? app.tasks.filter((t) => t.completed).length : 0;
  const totalTasksCount = app.tasks ? app.tasks.length : 0;

  const avatarColors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-rose-100 text-rose-700 border-rose-200',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={handleRequestClose}
    >
      {/* Unsaved Changes Guard */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 animate-in fade-in duration-150" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">Discard unsaved changes?</h3>
              <p className="text-xs text-slate-500">You have unsaved edits. Exit without saving?</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowUnsavedPrompt(false)} className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors">Keep Editing</button>
              <button type="button" onClick={() => { setShowUnsavedPrompt(false); onClose(); }} className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer transition-colors">Discard &amp; Exit</button>
            </div>
          </div>
        </div>
      )}

      <div
        className="w-full max-w-5xl max-h-[92vh] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shrink-0 gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <CompanyLogo company={app.company} jobLink={app.jobLink} logoUrl={app.logoUrl} companyDomain={app.companyDomain} size="lg" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate leading-tight">{app.company}</h2>
              <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{app.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setIsEditingInfo(!isEditingInfo); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${isEditingInfo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEditingInfo ? 'Cancel' : 'Edit Info'}</span>
            </button>
            <StageSelectorDropdown currentStatus={app.status} onStatusChange={handleStatusChange} size="md" />
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <button onClick={handleRequestClose} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/80" title="Close (Esc)">
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* Edit Info form — slides in when active */}
          {isEditingInfo && (
            <form onSubmit={handleSaveInfo} className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 border border-blue-200/80 rounded-2xl p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100/80">
                <div className="flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold text-slate-900 text-xs tracking-tight">Edit Application Details</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Metadata &amp; links</span>
              </div>

              {/* Row 1: Company + Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Company *</label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input type="text" required value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="e.g. Google" className="w-full bg-white text-slate-900 font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Role *</label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input type="text" required value={editRole} onChange={(e) => setEditRole(e.target.value)} placeholder="e.g. Senior Software Engineer" className="w-full bg-white text-slate-900 font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all" />
                  </div>
                </div>
              </div>

              {/* Row 2: Platform + Date + Domain */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Platform</label>
                  <CustomSelectDropdown<JobPlatform> value={editPlatform} onChange={(val) => setEditPlatform(val)} options={JOB_PLATFORMS.map((p) => ({ label: p, value: p }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Date Applied</label>
                  <input type="date" value={editDateApplied} onChange={(e) => setEditDateApplied(e.target.value)} className="w-full bg-white text-slate-900 font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs cursor-pointer transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Company Domain</label>
                  <input type="text" value={editCompanyDomain} onChange={(e) => setEditCompanyDomain(e.target.value)} placeholder="e.g. google.com" className="w-full bg-white text-slate-900 font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all" />
                </div>
              </div>

              {/* Row 3: Job Link + Contact Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Job Posting URL</label>
                  <div className="relative">
                    <Link className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input type="url" value={editJobLink} onChange={(e) => setEditJobLink(e.target.value)} placeholder="https://company.com/jobs/..." className="w-full bg-white text-slate-900 font-mono pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Primary Contact Email</label>
                  <div className="relative">
                    <AtSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} placeholder="recruiter@company.com" className="w-full bg-white text-slate-900 font-mono pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsEditingInfo(false)} className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs cursor-pointer transition-colors">Cancel</button>
                <button type="submit" disabled={isSavingInfo || !editCompany.trim() || !editRole.trim()} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-all">
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingInfo ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ── Quick Metrics Bar ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Platform', value: app.platform || '—', icon: <Globe className="w-3.5 h-3.5 text-slate-400" /> },
              { label: 'Applied', value: app.dateApplied || '—', icon: <Calendar className="w-3.5 h-3.5 text-slate-400" /> },
              { label: 'In Stage', value: `${daysInStage}d`, icon: <Clock className="w-3.5 h-3.5 text-slate-400" /> },
              { label: 'Tasks', value: totalTasksCount > 0 ? `${completedTasksCount}/${totalTasksCount}` : '—', icon: <CheckSquare className="w-3.5 h-3.5 text-slate-400" /> },
            ].map((m) => (
              <div key={m.label} className="bg-slate-50/80 rounded-xl border border-slate-200/80 px-3.5 py-3 flex items-center gap-3 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  {m.icon}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider block">{m.label}</span>
                  <span className="font-bold text-slate-900 text-xs block font-mono truncate">{m.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── 2-Column Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* Left: Tasks + Notes */}
            <div className="lg:col-span-7 space-y-5">

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                    Tasks
                    {totalTasksCount > 0 && <span className="ml-1 text-slate-400 font-normal">({totalTasksCount})</span>}
                  </h3>
                  {totalTasksCount > 0 && (
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold border border-blue-200/60">
                      {completedTasksCount}/{totalTasksCount} done
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                  <div className="divide-y divide-slate-100">
                    {app.tasks && app.tasks.length > 0 ? (
                      app.tasks.map((task) => (
                        <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                      ))
                    ) : (
                      <div className="text-slate-400 font-mono text-[11px] text-center py-4">No tasks yet.</div>
                    )}
                  </div>

                  <form onSubmit={handleAddTask} className="border-t border-slate-100 bg-slate-50/60 p-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Add a task…"
                      className="flex-1 bg-white text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
                    />
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      title="Due date (optional)"
                      className="w-28 bg-white text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-[11px] cursor-pointer"
                    />
                    <button type="submit" disabled={!newTaskTitle.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </form>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Notes &amp; Scratchpad
                  </h3>
                  <span className={`text-[10px] font-mono transition-colors ${hasUnsavedNotes ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                    {hasUnsavedNotes ? '● Unsaved · Ctrl+Enter to save' : 'Ctrl+Enter to save'}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); if (hasUnsavedNotes) handleSaveNotes(); } }}
                  placeholder="Interview prep notes, follow-up actions, salary details, contacts…"
                  className="w-full bg-white text-slate-900 placeholder-slate-400 p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white font-mono text-xs leading-relaxed resize-y shadow-2xs transition-all"
                />
              </div>

            </div>

            {/* Right: Info cards + Emails + Contacts + History */}
            <div className="lg:col-span-5 space-y-5">

              {/* Job Link — read-only, hover actions */}
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-blue-500" />
                  Job Listing
                </h3>
                {app.jobLink ? (
                  <div className="flex items-center justify-between gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 group hover:border-slate-300 transition-colors shadow-2xs">
                    <p className="text-xs font-mono text-slate-700 truncate min-w-0 flex-1">{app.jobLink}</p>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Copy link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={app.jobLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="w-full text-left text-[11px] font-mono text-slate-400 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-blue-300 hover:text-blue-500 transition-colors cursor-pointer"
                  >
                    + Add job posting URL via Edit Info
                  </button>
                )}
              </div>

              {/* Primary Contact Email — read-only, hover copy */}
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-blue-500" />
                  Primary Email
                </h3>
                {app.contactEmail ? (
                  <div className="flex items-center justify-between gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 group hover:border-slate-300 transition-colors shadow-2xs">
                    <p className="text-xs font-mono text-slate-700 truncate min-w-0 flex-1">{app.contactEmail}</p>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Copy email"
                      >
                        {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`mailto:${app.contactEmail}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Open email client"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="w-full text-left text-[11px] font-mono text-slate-400 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-blue-300 hover:text-blue-500 transition-colors cursor-pointer"
                  >
                    + Add contact email via Edit Info
                  </button>
                )}
              </div>

              {/* Email Log */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    Email Log
                    {app.emails && app.emails.length > 0 && <span className="ml-1 text-slate-400 font-normal">({app.emails.length})</span>}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setShowAddEmail(!showAddEmail)} className="flex items-center gap-1 text-[10px] font-mono bg-white hover:bg-slate-50 text-slate-600 font-semibold px-2 py-1 rounded-lg border border-slate-200 shadow-2xs cursor-pointer transition-colors">
                      <Plus className="w-3 h-3" />
                      Log
                    </button>
                    {app.contactEmail && (
                      <a href={`mailto:${app.contactEmail}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-mono bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-2 py-1 rounded-lg border border-blue-200/60 shadow-2xs transition-colors">
                        <Mail className="w-3 h-3" />
                        Compose
                      </a>
                    )}
                  </div>
                </div>

                {showAddEmail && (
                  <form onSubmit={handleAddEmailLog} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-sm">
                    <input type="text" required value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Subject *" className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" required value={emailSender} onChange={(e) => setEmailSender(e.target.value)} placeholder="From *" className="bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]" />
                      <input type="text" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} placeholder="To (optional)" className="bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]" />
                    </div>
                    <input type="date" value={emailDate} onChange={(e) => setEmailDate(e.target.value)} className="w-full bg-slate-50 text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]" />
                    <textarea value={emailSnippet} onChange={(e) => setEmailSnippet(e.target.value)} placeholder="Snippet / summary…" rows={2} className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 p-2 rounded-lg border border-slate-200 text-xs resize-none" />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddEmail(false)} className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer">Cancel</button>
                      <button type="submit" disabled={!emailSubject.trim() || !emailSender.trim()} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold cursor-pointer">Save</button>
                    </div>
                  </form>
                )}

                <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                  {app.emails && app.emails.length > 0 ? (
                    app.emails.map((email) => (
                      <div key={email.id} className="p-3 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 truncate">{email.subject}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                              <span>From: {email.sender}</span>
                              {email.recipient && <span className="text-slate-400">→ {email.recipient}</span>}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 mt-0.5">{email.date}</span>
                        </div>
                        {email.snippet && (
                          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/60 rounded-lg p-2 mt-2 italic leading-relaxed">
                            &ldquo;{email.snippet}&rdquo;
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 font-mono text-[11px] text-center py-4">No emails logged yet.</div>
                  )}
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    Contacts
                    {app.contacts && app.contacts.length > 0 && <span className="ml-1 text-slate-400 font-normal">({app.contacts.length})</span>}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingContactId) { handleCancelContactForm(); return; }
                      if (showAddContact) { handleCancelContactForm(); } else { setCName(''); setCRole(''); setCEmail(''); setCPhone(''); setCLinkedIn(''); setCNotes(''); setShowAddContact(true); }
                    }}
                    className="flex items-center gap-1 text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200/60 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    {showAddContact || editingContactId ? 'Cancel' : 'Add'}
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                  {app.contacts && app.contacts.length > 0 ? (
                    app.contacts.map((contact, idx) => {
                      const avatarColor = avatarColors[idx % avatarColors.length];

                      if (editingContactId === contact.id) {
                        return (
                          <form key={contact.id} onSubmit={handleSaveContact} className="p-3 space-y-2.5 bg-blue-50/30">
                            {/* Avatar visible while editing */}
                            <div className="flex items-center gap-3 pb-2 border-b border-blue-100/60">
                              <div className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}>
                                {getInitials(cName || contact.name)}
                              </div>
                              <span className="text-[11px] font-mono font-bold text-blue-700">Editing contact</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" required value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Name *" className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs" />
                              <input type="text" value={cRole} onChange={(e) => setCRole(e.target.value)} placeholder="Role / Title" className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="Email" className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]" />
                              <input type="tel" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="Phone" className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]" />
                            </div>
                            <input type="url" value={cLinkedIn} onChange={(e) => setCLinkedIn(e.target.value)} placeholder="LinkedIn URL" className="w-full bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]" />
                            <textarea value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="Notes about this contact…" rows={2} className="w-full bg-white text-slate-900 placeholder-slate-400 p-2 rounded-lg border border-slate-200 text-xs resize-none" />
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={handleCancelContactForm} className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer">Cancel</button>
                              <button type="submit" disabled={!cName.trim()} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold cursor-pointer">Save</button>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <div key={contact.id} className="p-3 hover:bg-slate-50/60 transition-colors group">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}>
                                {getInitials(contact.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{contact.name}</p>
                                <p className="text-[11px] text-slate-500 truncate">{contact.role || 'Contact'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {contact.email && (
                                <a href={`mailto:${contact.email}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={contact.email}>
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {contact.linkedIn && (
                                <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="LinkedIn">
                                  <Linkedin className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button type="button" onClick={() => handleStartEditContact(contact)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => handleDeleteContact(contact.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer" title="Remove">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {(contact.phone || contact.notes) && (
                            <div className="mt-2 pl-[42px] space-y-1.5">
                              {contact.phone && (
                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 group/phone">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{contact.phone}</span>
                                  </div>
                                  <button type="button" onClick={() => handleCopyPhone(contact.phone!, contact.id)} className="opacity-0 group-hover/phone:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded cursor-pointer font-semibold">
                                    {copiedPhoneId === contact.id ? <><Check className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">Copied</span></> : <><Copy className="w-2.5 h-2.5" /><span>Copy</span></>}
                                  </button>
                                </div>
                              )}
                              {contact.notes && (
                                <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-2 leading-relaxed">
                                  {contact.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : !showAddContact ? (
                    <div className="text-slate-400 font-mono text-[11px] text-center py-4">No contacts yet.</div>
                  ) : null}

                  {/* New Contact form — inline inside the card container */}
                  {showAddContact && !editingContactId && (
                    <form onSubmit={handleSaveContact} className="p-3 space-y-2.5 bg-slate-50/40">
                      <div className="pb-1.5 border-b border-slate-200/60">
                        <span className="text-[11px] font-mono font-bold text-slate-700">New Contact</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" required value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Name *" className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs" />
                        <input type="text" value={cRole} onChange={(e) => setCRole(e.target.value)} placeholder="Role / Title" className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="Email" className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]" />
                        <input type="tel" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="Phone" className="bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]" />
                      </div>
                      <input type="url" value={cLinkedIn} onChange={(e) => setCLinkedIn(e.target.value)} placeholder="LinkedIn URL" className="w-full bg-white text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]" />
                      <textarea value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="Notes about this contact…" rows={2} className="w-full bg-white text-slate-900 placeholder-slate-400 p-2 rounded-lg border border-slate-200 text-xs resize-none" />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={handleCancelContactForm} className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer">Cancel</button>
                        <button type="submit" disabled={!cName.trim()} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold cursor-pointer">Save Contact</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Status History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-blue-500" />
                    Status History
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {historyEntries.length} {historyEntries.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 max-h-[200px] overflow-y-auto shadow-2xs">
                  {isLoadingHistory ? (
                    <div className="text-slate-400 font-mono text-[11px] text-center py-2">Loading…</div>
                  ) : historyEntries.length === 0 ? (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                          Created as <StatusBadge status={app.status} size="sm" />
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 mt-1">{formatTimestamp(app.createdAt || app.stageUpdatedAt)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                      {historyEntries.map((entry, idx) => (
                        <div key={entry.id || idx} className="relative flex items-start gap-3">
                          <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {entry.fromStatus ? (
                                <>
                                  <StatusBadge status={entry.fromStatus} size="sm" />
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  <StatusBadge status={entry.toStatus} size="sm" />
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] font-mono text-slate-500">Set to</span>
                                  <StatusBadge status={entry.toStatus} size="sm" />
                                </>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{formatTimestamp(entry.timestamp)}</p>
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

        {/* ── Footer ── */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all font-medium shadow-2xs cursor-pointer text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <div className="flex items-center gap-2">
            {showSavedToast && (
              <span className="text-emerald-600 font-mono text-[11px] flex items-center gap-1 font-semibold animate-in fade-in duration-150">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              onClick={handleSaveNotes}
              disabled={!hasUnsavedNotes || isSavingNotes}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all text-xs cursor-pointer ${hasUnsavedNotes ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
            >
              <Save className="w-3.5 h-3.5" />
              {isSavingNotes ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
