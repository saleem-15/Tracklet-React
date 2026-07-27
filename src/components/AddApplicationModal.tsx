import React, { useState, useEffect } from 'react';
import { X, Plus, Building2, Briefcase, Calendar, Link, Mail, UserCheck, CheckSquare, ChevronDown, Globe } from 'lucide-react';
import { JobPlatform, ApplicationStatus, Application, Contact, ApplicationTask } from '../types';
import { CompanyLogo } from './CompanyLogo';

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
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [initialTaskTitle, setInitialTaskTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    setIsSubmitting(true);
    try {
      const contacts: Contact[] = [];
      if (contactName.trim() || contactEmail.trim()) {
        contacts.push({
          id: `c-${Date.now()}`,
          name: contactName.trim() || 'Recruiter / Contact',
          email: contactEmail.trim() || undefined,
          role: 'Recruiter / Point of Contact'
        });
      }

      const tasks: ApplicationTask[] = [];
      if (initialTaskTitle.trim()) {
        tasks.push({
          id: `t-${Date.now()}`,
          title: initialTaskTitle.trim(),
          completed: false
        });
      }

      await onAdd({
        company: company.trim(),
        companyDomain: companyDomain.trim() || undefined,
        role: role.trim(),
        platform,
        dateApplied: dateApplied || todayStr,
        status,
        jobLink: jobLink.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contacts: contacts.length > 0 ? contacts : undefined,
        tasks: tasks.length > 0 ? tasks : undefined,
        notes: notes.trim() || undefined,
      });

      // Reset
      setCompany('');
      setCompanyDomain('');
      setRole('');
      setPlatform('LinkedIn');
      setDateApplied(todayStr);
      setStatus('Applied');
      setJobLink('');
      setContactEmail('');
      setContactName('');
      setInitialTaskTitle('');
      setNotes('');
      onClose();
    } catch (err) {
      console.error('Failed to create application:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-2xl text-slate-900 overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Add New Job Application
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company Name & Logo Preview */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <CompanyLogo
                company={company || 'Company'}
                jobLink={jobLink}
                companyDomain={companyDomain}
                size="md"
              />
              <div className="relative flex-1">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Linear, Stripe, OpenAI"
                  className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Role Title */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
              Role Title <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Grid: Platform & Date Applied */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
                Platform
              </label>
              <div className="relative">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as JobPlatform)}
                  className="w-full appearance-none bg-slate-50 text-slate-700 pl-3 pr-8 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs cursor-pointer shadow-2xs"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
                Date Applied
              </label>
              <input
                type="date"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
                className="w-full bg-slate-50 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs cursor-pointer shadow-2xs"
              />
            </div>
          </div>

          {/* Initial Status */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
              Initial Status
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full appearance-none bg-slate-50 text-slate-700 pl-3 pr-8 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs cursor-pointer shadow-2xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Job Link */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
              Job Listing URL (Optional)
            </label>
            <div className="relative">
              <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
                Contact Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
                Contact Name
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Sarah Miller"
                  className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* First Action Task */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
              First Action Task (Optional)
            </label>
            <div className="relative">
              <CheckSquare className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={initialTaskTitle}
                onChange={(e) => setInitialTaskTitle(e.target.value)}
                placeholder="e.g. Send thank you note after call"
                className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Initial Notes */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
              Initial Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referral name, salary range, custom notes..."
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs resize-none shadow-2xs transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 font-medium transition-all shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !company.trim() || !role.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
