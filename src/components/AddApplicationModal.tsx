import React, { useState, useEffect } from 'react';
import { X, Plus, Building2, Briefcase, Calendar, Link, Mail, UserCheck, CheckSquare, ChevronDown, Globe } from 'lucide-react';
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

      let formattedJobLink = jobLink.trim();
      if (formattedJobLink && !formattedJobLink.startsWith('http://') && !formattedJobLink.startsWith('https://')) {
        formattedJobLink = `https://${formattedJobLink}`;
      }

      await onAdd({
        company: company.trim(),
        companyDomain: companyDomain.trim() || undefined,
        role: role.trim(),
        platform,
        dateApplied: dateApplied || todayStr,
        status,
        jobLink: formattedJobLink || undefined,
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md max-h-[88vh] bg-white border border-slate-200/90 rounded-2xl shadow-2xl text-slate-900 text-xs flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight font-heading">
              Add New Job Application
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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
                size="sm"
              />
              <div className="relative flex-1">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Linear, Stripe, OpenAI"
                  className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Company Domain (Optional) */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-medium">
              Company Domain (Optional)
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value.toLowerCase().trim())}
                placeholder="e.g. linear.app or stripe.com"
                className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-mono text-xs transition-all shadow-2xs"
              />
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
              <CustomSelectDropdown<JobPlatform>
                value={platform}
                onChange={(val) => setPlatform(val)}
                options={PLATFORMS.map((p) => ({ label: p, value: p }))}
                className="w-full"
              />
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
            <CustomSelectDropdown<ApplicationStatus>
              value={status}
              onChange={(val) => setStatus(val)}
              options={STATUSES.map((s) => ({ label: s, value: s }))}
              className="w-full"
            />
          </div>

          {/* Job Link */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium">
                Job Listing URL (Optional)
              </label>
              {jobLink.trim() && (
                <span className="text-[10px] font-mono text-slate-400">
                  {jobLink.startsWith('http://') || jobLink.startsWith('https://') ? (
                    <span className="text-emerald-600 font-semibold">Valid URL format</span>
                  ) : (
                    <span className="text-amber-600 font-semibold">Will auto-prefix https://</span>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={jobLink}
                onChange={(e) => {
                  const val = e.target.value;
                  setJobLink(val);
                  // Optional auto-detect domain if domain is empty
                  if (!companyDomain && val.includes('.')) {
                    try {
                      const urlToParse = val.startsWith('http') ? val : `https://${val}`;
                      const host = new URL(urlToParse).hostname.replace(/^www\./, '');
                      if (host && host.includes('.')) {
                        setCompanyDomain(host);
                      }
                    } catch {
                      // ignore parse errors
                    }
                  }
                }}
                placeholder="https://linkedin.com/jobs/... or company.com/careers"
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
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 sm:py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 font-medium transition-all shadow-2xs cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !company.trim() || !role.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer text-xs"
            >
              {isSubmitting ? 'Saving...' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
