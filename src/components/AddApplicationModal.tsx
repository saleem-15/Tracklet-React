import React, { useState, useEffect } from 'react';
import { X, Plus, Building2, Briefcase, Calendar, Link, Mail, UserCheck, CheckSquare, ChevronDown, Globe, Trash2, UserPlus, ListTodo } from 'lucide-react';
import { JobPlatform, ApplicationStatus, Application, Contact, ApplicationTask } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { CustomSelectDropdown } from './CustomSelectDropdown';

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
  'Wishlist',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const [company, setCompany] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [role, setRole] = useState('');
  const [platform, setPlatform] = useState<JobPlatform>('LinkedIn');
  const [dateApplied, setDateApplied] = useState(todayStr);
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [jobLink, setJobLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Multiple Contacts State
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cRole, setCRole] = useState('');

  // Dynamic Multiple Tasks State
  const [tasks, setTasks] = useState<{ id: string; title: string; dueDate: string }[]>([]);
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDirty]);

  const handleAddContactItem = () => {
    if (!cName.trim() && !cEmail.trim()) return;
    setContacts((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: cName.trim() || 'Point of Contact',
        email: cEmail.trim(),
        role: cRole.trim() || 'Recruiter / Contact',
      },
    ]);
    setCName('');
    setCEmail('');
    setCRole('');
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
        dueDate: taskDueDate,
      },
    ]);
    setTaskTitle('');
    setTaskDueDate('');
  };

  const handleRemoveTaskItem = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    setIsSubmitting(true);
    try {
      // Include any un-added draft contact if user typed without pressing +
      const finalContacts: Contact[] = [...contacts.map((c) => ({ id: c.id, name: c.name, email: c.email || undefined, role: c.role || undefined }))];
      if ((cName.trim() || cEmail.trim()) && !contacts.some((c) => c.name === cName.trim() && c.email === cEmail.trim())) {
        finalContacts.push({
          id: `c-${Date.now()}`,
          name: cName.trim() || 'Point of Contact',
          email: cEmail.trim() || undefined,
          role: cRole.trim() || 'Recruiter / Contact',
        });
      }

      // Include any un-added draft task if user typed without pressing +
      const finalTasks: ApplicationTask[] = [
        ...tasks.map((t) => ({ id: t.id, title: t.title, completed: false, dueDate: t.dueDate || undefined })),
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

      await onAdd({
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
      });

      // Reset form
      setCompany('');
      setCompanyDomain('');
      setRole('');
      setPlatform('LinkedIn');
      setDateApplied(todayStr);
      setStatus('Applied');
      setJobLink('');
      setNotes('');
      setContacts([]);
      setCName('');
      setCEmail('');
      setCRole('');
      setTasks([]);
      setTaskTitle('');
      setTaskDueDate('');
      onClose();
    } catch (err) {
      console.error('Failed to create application:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={handleRequestClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-white border border-slate-200/90 rounded-2xl shadow-2xl text-slate-900 text-xs flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200/80 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight font-display">
                Add Job Application
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">Create pipeline entry with tasks & contacts</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            title="Close modal (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            
            {/* Section 1: Core Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-blue-600">
                  01. Role & Company Info
                </span>
                <span className="text-[10px] font-mono text-slate-400">* Required</span>
              </div>

              {/* Company & Domain Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 mb-1 font-medium">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <CompanyLogo
                      company={company || 'Company'}
                      jobLink={jobLink}
                      companyDomain={companyDomain}
                      size="sm"
                    />
                    <div className="relative flex-1">
                      <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Linear, Stripe"
                        className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-600 mb-1 font-medium">
                    Company Domain (Optional)
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={companyDomain}
                      onChange={(e) => setCompanyDomain(e.target.value.toLowerCase().trim())}
                      placeholder="e.g. linear.app"
                      className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Role Title & Job Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 mb-1 font-medium">
                    Role Title <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Senior Frontend Developer"
                      className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-600 mb-1 font-medium">
                    Job Listing Link
                  </label>
                  <div className="relative">
                    <Link className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                      placeholder="https://company.com/jobs/..."
                      className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Pipeline Metadata */}
            <div className="space-y-3 pt-1">
              <div className="border-b border-slate-100 pb-1.5">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-blue-600">
                  02. Pipeline Metadata
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 mb-1 font-medium">
                    Platform
                  </label>
                  <CustomSelectDropdown<JobPlatform>
                    value={platform}
                    onChange={(val) => setPlatform(val)}
                    options={PLATFORMS.map((p) => ({ label: p, value: p }))}
                    className="w-full"
                    size="sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-600 mb-1 font-medium">
                    Initial Status
                  </label>
                  <CustomSelectDropdown<ApplicationStatus>
                    value={status}
                    onChange={(val) => setStatus(val)}
                    options={STATUSES.map((s) => ({ label: s, value: s }))}
                    className="w-full"
                    size="sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-600 mb-1 font-medium">
                    Date Applied
                  </label>
                  <input
                    type="date"
                    value={dateApplied}
                    onChange={(e) => setDateApplied(e.target.value)}
                    className="w-full bg-slate-50/80 text-slate-700 px-3 py-1 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono cursor-pointer shadow-2xs h-[30px]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Dynamic Multiple Tasks */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                  03. Pipeline Tasks ({tasks.length})
                </span>
                <span className="text-[10px] font-mono text-slate-400">Add action items</span>
              </div>

              {/* Added Tasks List */}
              {tasks.length > 0 && (
                <div className="space-y-1.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-sans text-xs font-semibold text-slate-800 truncate">{t.title}</span>
                        {t.dueDate && (
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                            Due: {t.dueDate}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTaskItem(t.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Remove task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Task Input Row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CheckSquare className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                    placeholder="Add task title (e.g. Prepare portfolio pitch)"
                    className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
                  />
                </div>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-32 bg-slate-50/80 text-slate-700 px-2 py-1 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono cursor-pointer shadow-2xs h-[30px]"
                  title="Due date (Optional)"
                />
                <button
                  type="button"
                  onClick={handleAddTaskItem}
                  disabled={!taskTitle.trim()}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 text-blue-700 font-semibold border border-blue-200/80 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Section 4: Dynamic Multiple Contacts */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                  04. Key Contacts ({contacts.length})
                </span>
                <span className="text-[10px] font-mono text-slate-400">Recruiters, hiring managers</span>
              </div>

              {/* Added Contacts List */}
              {contacts.length > 0 && (
                <div className="space-y-1.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                  {contacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-sans text-xs font-semibold text-slate-800 truncate">{c.name}</span>
                        {c.role && <span className="text-[11px] text-slate-500 font-medium">({c.role})</span>}
                        {c.email && (
                          <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/80 shrink-0 truncate">
                            {c.email}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContactItem(c.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Remove contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Contact Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative">
                  <UserCheck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="Contact name (e.g. Sarah Miller)"
                    className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
                  />
                </div>

                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    placeholder="Email (e.g. sarah@co.com)"
                    className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cRole}
                    onChange={(e) => setCRole(e.target.value)}
                    placeholder="Role (e.g. Tech Recruiter)"
                    className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddContactItem}
                    disabled={!cName.trim() && !cEmail.trim()}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 text-blue-700 font-semibold border border-blue-200/80 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 5: Initial Notes */}
            <div className="space-y-2 pt-1">
              <div className="border-b border-slate-100 pb-1.5">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-500">
                  05. Additional Notes
                </span>
              </div>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Referral name, salary range, custom tech stack notes..."
                className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs resize-none shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-mono text-slate-400">Press Esc to exit</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 font-medium transition-all shadow-2xs cursor-pointer text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !company.trim() || !role.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer text-xs"
              >
                {isSubmitting ? 'Adding...' : 'Add Application'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
