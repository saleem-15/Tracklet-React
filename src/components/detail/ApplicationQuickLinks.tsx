import React, { useState } from 'react';
import { ExternalLink, Globe, MessageSquareText, Plus } from 'lucide-react';
import { CopyIconButton } from '../IconButton';

export interface ApplicationQuickLinksProps {
  jobLink?: string;
  emailThreadUrl?: string;
  contactEmail?: string;
  contactName?: string;
  company?: string;
  role?: string;
  onOpenEditInfo: () => void;
  onOpenFollowUp?: () => void;
}

export const ApplicationQuickLinks: React.FC<ApplicationQuickLinksProps> = ({
  jobLink,
  emailThreadUrl,
  onOpenEditInfo,
}) => {
  const [copiedJobLink, setCopiedJobLink] = useState(false);
  const [copiedThreadUrl, setCopiedThreadUrl] = useState(false);

  const handleCopyJobLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (jobLink) {
      navigator.clipboard.writeText(jobLink);
      setCopiedJobLink(true);
      setTimeout(() => setCopiedJobLink(false), 2000);
    }
  };

  const handleCopyThreadUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (emailThreadUrl) {
      navigator.clipboard.writeText(emailThreadUrl);
      setCopiedThreadUrl(true);
      setTimeout(() => setCopiedThreadUrl(false), 2000);
    }
  };

  const hasAnyLink = Boolean(jobLink || emailThreadUrl);

  if (!hasAnyLink) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/70 rounded-xl text-xs">
        <span className="text-slate-500 font-medium">No external links attached</span>
        <button
          type="button"
          onClick={onOpenEditInfo}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Add Job or Email Link</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
          Links & Resources
        </span>
        {(!jobLink || !emailThreadUrl) && (
          <button
            type="button"
            onClick={onOpenEditInfo}
            className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>{!jobLink ? 'Add Job Link' : 'Add Thread'}</span>
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {jobLink && (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 group transition-colors">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <a
                href={jobLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-slate-700 hover:text-blue-600 truncate transition-colors"
                title={jobLink}
              >
                {jobLink.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <CopyIconButton onClick={handleCopyJobLink} isCopied={copiedJobLink} title="Copy link" />
              <a
                href={jobLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Open job listing"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {emailThreadUrl && (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 group transition-colors">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MessageSquareText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <a
                href={emailThreadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-slate-700 hover:text-blue-600 truncate transition-colors"
                title={emailThreadUrl}
              >
                Email Thread (Webmail)
              </a>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <CopyIconButton onClick={handleCopyThreadUrl} isCopied={copiedThreadUrl} title="Copy thread URL" />
              <a
                href={emailThreadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                title="Open email thread"
              >
                <span>Open</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
