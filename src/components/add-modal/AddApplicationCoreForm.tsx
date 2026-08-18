import React from 'react';
import { Building2, Globe, Briefcase, Link } from 'lucide-react';

export interface AddApplicationCoreFormProps {
  company: string;
  onCompanyChange: (val: string) => void;
  companyDomain: string;
  onCompanyDomainChange: (val: string) => void;
  role: string;
  onRoleChange: (val: string) => void;
  jobLink: string;
  onJobLinkChange: (val: string) => void;
}

export const AddApplicationCoreForm: React.FC<AddApplicationCoreFormProps> = ({
  company,
  onCompanyChange,
  companyDomain,
  onCompanyDomainChange,
  role,
  onRoleChange,
  jobLink,
  onJobLinkChange,
}) => {
  const handleJobLinkChange = (val: string) => {
    onJobLinkChange(val);
    if (!companyDomain && val.includes('.')) {
      try {
        const urlToParse = val.startsWith('http') ? val : `https://${val}`;
        const host = new URL(urlToParse).hostname.replace(/^www\./, '');
        if (host && host.includes('.')) {
          onCompanyDomainChange(host);
        }
      } catch {}
    }
  };

  return (
    <div className="space-y-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-500" />
          Role &amp; Company
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
              onChange={(e) => onCompanyChange(e.target.value)}
              placeholder="Linear, Stripe"
              className="w-full bg-white text-slate-900 placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs font-semibold transition-all shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Domain</label>
          <div className="relative">
            <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={companyDomain}
              onChange={(e) => onCompanyDomainChange(e.target.value.toLowerCase().trim())}
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
              onChange={(e) => onRoleChange(e.target.value)}
              placeholder="Software Engineer"
              className="w-full bg-white text-slate-900 placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs font-semibold transition-all shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Job Link</label>
          <div className="relative">
            <Link className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={jobLink}
              onChange={(e) => handleJobLinkChange(e.target.value)}
              placeholder="https://"
              className="w-full bg-white text-slate-900 placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono text-xs transition-all shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
