import React, { useState } from 'react';
import { Pencil, Building2, Briefcase, Link, AtSign, Save } from 'lucide-react';
import { Application, JobPlatform, WorkLocation, EmploymentType } from '../../types';
import { JOB_PLATFORMS, WORK_LOCATIONS, EMPLOYMENT_TYPES } from '../../lib/constants';
import { CustomSelectDropdown } from '../CustomSelectDropdown';

export interface ApplicationInfoEditorProps {
  app: Application;
  onSave: (updates: Partial<Application>) => Promise<void>;
  onCancel: () => void;
}

export const ApplicationInfoEditor: React.FC<ApplicationInfoEditorProps> = ({
  app,
  onSave,
  onCancel,
}) => {
  const [editCompany, setEditCompany] = useState(app.company || '');
  const [editRole, setEditRole] = useState(app.role || '');
  const [editPlatform, setEditPlatform] = useState<JobPlatform>(app.platform || 'LinkedIn');
  const [editWorkLocation, setEditWorkLocation] = useState<WorkLocation | ''>(app.workLocation || '');
  const [editEmploymentType, setEditEmploymentType] = useState<EmploymentType | ''>(app.employmentType || '');
  const [editJobLocation, setEditJobLocation] = useState(app.location || '');
  const [editDateApplied, setEditDateApplied] = useState(app.dateApplied || '');
  const [editJobLink, setEditJobLink] = useState(app.jobLink || '');
  const [editCompanyDomain, setEditCompanyDomain] = useState(app.companyDomain || '');
  const [editContactEmail, setEditContactEmail] = useState(app.contactEmail || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompany.trim() || !editRole.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        company: editCompany.trim(),
        role: editRole.trim(),
        platform: editPlatform,
        workLocation: editWorkLocation || undefined,
        employmentType: editEmploymentType || undefined,
        location: editJobLocation.trim() || undefined,
        dateApplied: editDateApplied,
        jobLink: editJobLink.trim() || undefined,
        companyDomain: editCompanyDomain.trim() || undefined,
        contactEmail: editContactEmail.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 border border-blue-200/80 rounded-2xl p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center justify-between pb-2 border-b border-blue-100/80">
        <div className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-slate-900 text-xs tracking-tight">Edit Application Details</span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Metadata &amp; links</span>
      </div>

      {/* Row 1: Company + Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Company *</label>
          <div className="relative">
            <Building2 className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              required
              value={editCompany}
              onChange={(e) => setEditCompany(e.target.value)}
              placeholder="e.g. Google"
              className="w-full bg-white text-slate-900 font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Role *</label>
          <div className="relative">
            <Briefcase className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              required
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full bg-white text-slate-900 font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Platform + Date + Domain */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Platform</label>
          <CustomSelectDropdown<JobPlatform>
            value={editPlatform}
            onChange={(val) => setEditPlatform(val)}
            options={JOB_PLATFORMS.map((p) => ({ label: p, value: p }))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Date Applied</label>
          <input
            type="date"
            value={editDateApplied}
            onChange={(e) => setEditDateApplied(e.target.value)}
            className="w-full bg-white text-slate-900 font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs cursor-pointer transition-all"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Company Domain</label>
          <input
            type="text"
            value={editCompanyDomain}
            onChange={(e) => setEditCompanyDomain(e.target.value)}
            placeholder="e.g. google.com"
            className="w-full bg-white text-slate-900 font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
          />
        </div>
      </div>

      {/* Row 3: Work Type + Job Type + Job Location */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Work Type</label>
          <CustomSelectDropdown<WorkLocation | ''>
            value={editWorkLocation}
            onChange={(val) => setEditWorkLocation(val)}
            options={[
              { label: 'Not set', value: '' },
              ...WORK_LOCATIONS.map((w) => ({ label: w, value: w })),
            ]}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Job Type</label>
          <CustomSelectDropdown<EmploymentType | ''>
            value={editEmploymentType}
            onChange={(val) => setEditEmploymentType(val)}
            options={[
              { label: 'Not set', value: '' },
              ...EMPLOYMENT_TYPES.map((e) => ({ label: e, value: e })),
            ]}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Job Location</label>
          <input
            type="text"
            value={editJobLocation}
            onChange={(e) => setEditJobLocation(e.target.value)}
            placeholder="e.g. San Francisco, CA"
            className="w-full bg-white text-slate-900 font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
          />
        </div>
      </div>

      {/* Row 4: Job Link + Contact Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Job Posting URL</label>
          <div className="relative">
            <Link className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="url"
              value={editJobLink}
              onChange={(e) => setEditJobLink(e.target.value)}
              placeholder="https://company.com/jobs/..."
              className="w-full bg-white text-slate-900 font-mono pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Primary Contact Email</label>
          <div className="relative">
            <AtSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="email"
              value={editContactEmail}
              onChange={(e) => setEditContactEmail(e.target.value)}
              placeholder="recruiter@company.com"
              className="w-full bg-white text-slate-900 font-mono pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !editCompany.trim() || !editRole.trim()}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all ${
            isSaving || !editCompany.trim() || !editRole.trim()
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </form>
  );
};
