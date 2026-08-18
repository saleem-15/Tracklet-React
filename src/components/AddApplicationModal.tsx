import React, { useState, useEffect } from 'react';
import {
  Plus,
  Building2,
  Briefcase,
  Calendar,
  Link,
  Mail,
  UserCheck,
  CheckSquare,
  Globe,
  Trash2,
  UserPlus,
  ListTodo,
  Users,
  Clock,
  FileText,
  AtSign,
  Phone,
  Linkedin,
} from 'lucide-react';
import { JobPlatform, ApplicationStatus, Application, Contact, ApplicationTask } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { CustomSelectDropdown } from './CustomSelectDropdown';
import { StageSelectorDropdown } from './StageSelectorDropdown';
import { DeleteIconButton, CloseIconButton } from './IconButton';
import { TaskItem } from './TaskItem';
import { UI_TOKENS } from '../theme/tokens';

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>) => Promise<void>;
}

const PLATFORMS: JobPlatform[] = [
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

const STATUSES: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

function getInitials(name: string): string {
  if (!name.trim()) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const avatarColors = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-rose-100 text-rose-700 border-rose-200',
];

export const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [company, setCompany] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [role, setRole] = useState('');
  const [platform, setPlatform] = useState<JobPlatform>('LinkedIn');
  const [dateApplied, setDateApplied] = useState(todayStr);
  const [status, setStatus] = useState<ApplicationStatus>('Saved');
  const [jobLink, setJobLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Multiple Contacts State matching global Contact data class
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cName, setCName] = useState('');
  const [cRole, setCRole] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cLinkedIn, setCLinkedIn] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [showExtraContactFields, setShowExtraContactFields] = useState(false);

  // Dynamic Multiple Tasks State
  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const isDirty =
    company.trim() !== '' ||
    role.trim() !== '' ||
    notes.trim() !== '' ||
    jobLink.trim() !== '' ||
    contacts.length > 0 ||
    tasks.length > 0 ||
    cName.trim() !== '' ||
    cEmail.trim() !== '' ||
    cPhone.trim() !== '' ||
    taskTitle.trim() !== '';

  const handleRequestClose = () => {
    if (isDirty) {
      if (confirm('Discard unsaved job application entry?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDirty]);

  if (!isOpen) return null;

  const handleAddContactItem = () => {
    if (!cName.trim() && !cEmail.trim() && !cPhone.trim()) return;
    setContacts((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: cName.trim() || 'Point of Contact',
        role: cRole.trim() || undefined,
        email: cEmail.trim() || undefined,
        phone: cPhone.trim() || undefined,
        linkedIn: cLinkedIn.trim() || undefined,
        notes: cNotes.trim() || undefined,
      },
    ]);
    setCName('');
    setCRole('');
    setCEmail('');
    setCPhone('');
    setCLinkedIn('');
    setCNotes('');
    setShowExtraContactFields(false);
  };

  const handleRemoveContactItem = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddTaskItem = () => {
    if (!taskTitle.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        title: taskTitle.trim(),
        completed: false,
        dueDate: taskDueDate || undefined,
      },
    ]);
    setTaskTitle('');
    setTaskDueDate('');
  };

  const handleToggleTaskItem = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleEditTaskItem = (id: string, updatedFields: Partial<ApplicationTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t))
    );
  };

  const handleRemoveTaskItem = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    // Include any un-added draft contact if user typed without pressing +
    const finalContacts: Contact[] = [
      ...contacts.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role || undefined,
        email: c.email || undefined,
        phone: c.phone || undefined,
        linkedIn: c.linkedIn || undefined,
        notes: c.notes || undefined,
      })),
    ];
    if (
      (cName.trim() || cEmail.trim() || cPhone.trim()) &&
      !contacts.some((c) => c.name === cName.trim() && c.email === cEmail.trim())
    ) {
      finalContacts.push({
        id: `c-${Date.now()}`,
        name: cName.trim() || 'Point of Contact',
        role: cRole.trim() || undefined,
        email: cEmail.trim() || undefined,
        phone: cPhone.trim() || undefined,
        linkedIn: cLinkedIn.trim() || undefined,
        notes: cNotes.trim() || undefined,
      });
    }

    // Include any un-added draft task if user typed without pressing +
    const finalTasks: ApplicationTask[] = [
      ...tasks.map((t) => ({ id: t.id, title: t.title, completed: Boolean(t.completed), dueDate: t.dueDate || undefined })),
    ];
    if (taskTitle.trim() && !tasks.some((t) => t.title === taskTitle.trim())) {
      finalTasks.push({
        id: `t-${Date.now()}`,
        title: taskTitle.trim(),
        completed: false,
        dueDate: taskDueDate || undefined,
      });
    }

    let formattedJobLink = jobLink.trim();
    if (formattedJobLink && !formattedJobLink.startsWith('http://') && !formattedJobLink.startsWith('https://')) {
      formattedJobLink = `https://${formattedJobLink}`;
    }

    // Primary contact email shorthand for first contact or explicit input
    const primaryContactEmail = finalContacts.find((c) => c.email)?.email || undefined;

    const payload = {
      company: company.trim(),
      companyDomain: companyDomain.trim() || undefined,
      role: role.trim(),
      platform,
      dateApplied: dateApplied || todayStr,
      status,
      jobLink: formattedJobLink || undefined,
      contactEmail: primaryContactEmail,
      contacts: finalContacts.length > 0 ? finalContacts : undefined,
      tasks: finalTasks.length > 0 ? finalTasks : undefined,
      notes: notes.trim() || undefined,
    };

    // Optimistic UI: Close modal & reset form immediately
    onClose();
    setCompany('');
    setCompanyDomain('');
    setRole('');
    setPlatform('LinkedIn');
    setDateApplied(todayStr);
    setStatus('Saved');
    setJobLink('');
    setNotes('');
    setContacts([]);
    setCName('');
    setCRole('');
    setCEmail('');
    setCPhone('');
    setCLinkedIn('');
    setCNotes('');
    setShowExtraContactFields(false);
    setTasks([]);
    setTaskTitle('');
    setTaskDueDate('');

    // Trigger onAdd in background
    onAdd(payload).catch((err) => {
      console.error('Failed to create application:', err);
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={handleRequestClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header — matches ApplicationDetailPanel */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shrink-0 gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <CompanyLogo
              company={company || 'Company'}
              jobLink={jobLink}
              companyDomain={companyDomain}
              size="lg"
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate leading-tight font-display">
                {company.trim() ? company : 'Add Application'}
              </h2>
              <p className="text-xs font-medium text-slate-500 truncate mt-0.5 font-mono">
                {role.trim() ? role : 'New application'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <StageSelectorDropdown
              currentStatus={status}
              onSelectStatus={(newStatus) => setStatus(newStatus)}
              size="md"
            />
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <CloseIconButton
              onClick={handleRequestClose}
              title="Close modal (Esc)"
            />
          </div>
        </div>

        {/* Form Body — 2-Column Responsive Layout */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              {/* Left Column: Core Details + Tasks + Notes */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Core Info Card */}
                <div className="space-y-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      Role & Company
                    </h3>
                  </div>

                  {/* Company & Domain Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">
                        Company <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Linear, Stripe"
                          className="w-full bg-white text-slate-900 placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs font-semibold transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">
                        Domain
                      </label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={companyDomain}
                          onChange={(e) => setCompanyDomain(e.target.value.toLowerCase().trim())}
                          placeholder="linear.app"
                          className="w-full bg-white text-slate-900 placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono text-xs transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role Title & Job Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">
                        Role <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="Software Engineer"
                          className="w-full bg-white text-slate-900 placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs font-semibold transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">
                        Job Link
                      </label>
                      <div className="relative">
                        <Link className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={jobLink}
                          onChange={(e) => {
                            const val = e.target.value;
                            setJobLink(val);
                            if (!companyDomain && val.includes('.')) {
                              try {
                                const urlToParse = val.startsWith('http') ? val : `https://${val}`;
                                const host = new URL(urlToParse).hostname.replace(/^www\./, '');
                                if (host && host.includes('.')) {
                                  setCompanyDomain(host);
                                }
                              } catch {}
                            }
                          }}
                          placeholder="https://"
                          className="w-full bg-white text-slate-900 placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono text-xs transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pipeline Tasks Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5 text-blue-500" />
                      Tasks
                      {tasks.length > 0 && <span className="ml-1 text-slate-500 font-normal">({tasks.length})</span>}
                    </h3>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                    <div className="divide-y divide-slate-100">
                      {tasks.length > 0 ? (
                        tasks.map((t) => (
                          <TaskItem
                            key={t.id}
                            task={t}
                            onToggle={handleToggleTaskItem}
                            onEdit={handleEditTaskItem}
                            onDelete={handleRemoveTaskItem}
                          />
                        ))
                      ) : (
                        <div className="text-slate-500 font-mono text-[11px] text-center py-3.5">
                          No tasks added.
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 flex items-center gap-2">
                      <input
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTaskItem();
                          }
                        }}
                        placeholder="Add a task..."
                        className="flex-1 bg-white text-slate-900 placeholder-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
                      />
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        title="Due date (optional)"
                        className="w-28 bg-white text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-[11px] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={handleAddTaskItem}
                        disabled={!taskTitle.trim()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Notes / Scratchpad Section */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Notes
                  </h3>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Referral info, salary target, interview notes..."
                    className="w-full bg-white text-slate-900 placeholder-slate-500 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white font-mono text-xs leading-relaxed resize-y shadow-2xs transition-all"
                  />
                </div>
              </div>

              {/* Right Column: Metadata & Contacts */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* Pipeline Metadata Card */}
                <div className="space-y-3 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Pipeline Metadata
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">
                        Platform
                      </label>
                      <CustomSelectDropdown<JobPlatform>
                        value={platform}
                        onChange={(val) => setPlatform(val)}
                        options={PLATFORMS.map((p) => ({ label: p, value: p }))}
                        className="w-full"
                        size="md"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">
                        Date Applied
                      </label>
                      <input
                        type="date"
                        value={dateApplied}
                        onChange={(e) => setDateApplied(e.target.value)}
                        className="w-full bg-white text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono text-xs cursor-pointer transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Key Contacts Section — matches ApplicationDetailPanel cards & global Contact model */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      Key Contacts
                      {contacts.length > 0 && <span className="ml-1 text-slate-500 font-normal">({contacts.length})</span>}
                    </h3>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                    {contacts.length > 0 ? (
                      contacts.map((c, idx) => {
                        const avatarColor = avatarColors[idx % avatarColors.length];
                        return (
                          <div key={c.id} className="p-3 hover:bg-slate-50/60 transition-colors group">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}>
                                  {getInitials(c.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">{c.name}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{c.role || 'Contact'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {c.email && (
                                  <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 truncate max-w-[110px]">
                                    {c.email}
                                  </span>
                                )}
                                {c.linkedIn && (
                                  <a
                                    href={c.linkedIn}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="LinkedIn Profile"
                                  >
                                    <Linkedin className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <DeleteIconButton
                                  onClick={() => handleRemoveContactItem(c.id)}
                                  title="Remove contact"
                                />
                              </div>
                            </div>

                            {(c.phone || c.notes) && (
                              <div className="mt-2 pl-[42px] space-y-1">
                                {c.phone && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="truncate">{c.phone}</span>
                                  </div>
                                )}
                                {c.notes && (
                                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded px-2 py-1 leading-relaxed italic">
                                    {c.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-500 font-mono text-[11px] text-center py-3.5">
                        No contacts added.
                      </div>
                    )}

                    {/* Inline Contact Add Form supporting full Contact model */}
                    <div className="p-3 bg-slate-50/60 space-y-2 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={cName}
                          onChange={(e) => setCName(e.target.value)}
                          placeholder="Name *"
                          className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs font-medium"
                        />
                        <input
                          type="text"
                          value={cRole}
                          onChange={(e) => setCRole(e.target.value)}
                          placeholder="Role"
                          className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          value={cEmail}
                          onChange={(e) => setCEmail(e.target.value)}
                          placeholder="Email"
                          className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
                        />
                        <input
                          type="tel"
                          value={cPhone}
                          onChange={(e) => setCPhone(e.target.value)}
                          placeholder="Phone"
                          className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
                        />
                      </div>

                      {showExtraContactFields ? (
                        <div className="space-y-2 animate-in fade-in duration-150">
                          <input
                            type="url"
                            value={cLinkedIn}
                            onChange={(e) => setCLinkedIn(e.target.value)}
                            placeholder="LinkedIn URL (https://linkedin.com/in/...)"
                            className="w-full bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
                          />
                          <textarea
                            value={cNotes}
                            onChange={(e) => setCNotes(e.target.value)}
                            placeholder="Contact notes..."
                            rows={2}
                            className="w-full bg-white text-slate-900 placeholder-slate-500 p-2 rounded-lg border border-slate-200 text-xs resize-none"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowExtraContactFields(true)}
                          className="text-[11px] font-mono text-blue-600 hover:text-blue-700 font-semibold cursor-pointer py-0.5 inline-flex items-center gap-1"
                        >
                          <span>+ LinkedIn &amp; Notes</span>
                        </button>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleAddContactItem}
                          disabled={!cName.trim() && !cEmail.trim() && !cPhone.trim()}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-lg transition-all shadow-2xs cursor-pointer flex items-center gap-1 text-xs"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Add Contact</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRequestClose}
              className="h-[34px] px-3.5 rounded-[10px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 font-medium transition-all shadow-2xs cursor-pointer text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!company.trim() || !role.trim()}
              className={`${UI_TOKENS.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Add Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

