import React, { useState } from 'react';
import { Link, AtSign, ExternalLink } from 'lucide-react';
import { CopyIconButton, EmailIconButton } from '../IconButton';

export interface ApplicationQuickLinksProps {
  jobLink?: string;
  contactEmail?: string;
  onOpenEditInfo: () => void;
}

export const ApplicationQuickLinks: React.FC<ApplicationQuickLinksProps> = ({
  jobLink,
  contactEmail,
  onOpenEditInfo,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyLink = () => {
    if (jobLink) {
      navigator.clipboard.writeText(jobLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyEmail = () => {
    if (contactEmail) {
      navigator.clipboard.writeText(contactEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Job Link */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5 text-blue-500" />
          Job Listing
        </h3>
        {jobLink ? (
          <div className="flex items-center justify-between gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 group hover:border-slate-300 transition-colors shadow-2xs">
            <p className="text-xs font-mono text-slate-700 truncate min-w-0 flex-1">{jobLink}</p>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyIconButton onClick={handleCopyLink} isCopied={copiedLink} title="Copy link" />
              <a
                href={jobLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-blue-700 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenEditInfo}
            className="w-full text-left text-[11px] font-mono text-slate-500 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-blue-300 hover:text-blue-500 transition-colors cursor-pointer"
          >
            + Add job posting URL via Edit Info
          </button>
        )}
      </div>

      {/* Primary Email */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <AtSign className="w-3.5 h-3.5 text-blue-500" />
          Primary Email
        </h3>
        {contactEmail ? (
          <div className="flex items-center justify-between gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 group hover:border-slate-300 transition-colors shadow-2xs">
            <p className="text-xs font-mono text-slate-700 truncate min-w-0 flex-1">{contactEmail}</p>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyIconButton onClick={handleCopyEmail} isCopied={copiedEmail} title="Copy email" />
              <EmailIconButton email={contactEmail} />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenEditInfo}
            className="w-full text-left text-[11px] font-mono text-slate-500 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-blue-300 hover:text-blue-500 transition-colors cursor-pointer"
          >
            + Add contact email via Edit Info
          </button>
        )}
      </div>
    </div>
  );
};
