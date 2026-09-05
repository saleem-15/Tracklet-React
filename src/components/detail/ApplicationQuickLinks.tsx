import React, { useState } from 'react';
import { Link, AtSign, ExternalLink, Mail, MessageSquareText } from 'lucide-react';
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
  contactEmail,
  contactName,
  company,
  role,
  onOpenEditInfo,
  onOpenFollowUp,
}) => {
  const [copiedJobLink, setCopiedJobLink] = useState(false);
  const [copiedThreadUrl, setCopiedThreadUrl] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyJobLink = () => {
    if (jobLink) {
      navigator.clipboard.writeText(jobLink);
      setCopiedJobLink(true);
      setTimeout(() => setCopiedJobLink(false), 2000);
    }
  };

  const handleCopyThreadUrl = () => {
    if (emailThreadUrl) {
      navigator.clipboard.writeText(emailThreadUrl);
      setCopiedThreadUrl(true);
      setTimeout(() => setCopiedThreadUrl(false), 2000);
    }
  };

  const handleCopyEmail = () => {
    if (contactEmail) {
      navigator.clipboard.writeText(contactEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const mailtoSubject = role && company
    ? `Following up on ${role} application - ${company}`
    : company
    ? `Following up on application at ${company}`
    : 'Following up on job application';

  const fallbackMailtoUrl = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(mailtoSubject)}`
    : undefined;

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
              <CopyIconButton onClick={handleCopyJobLink} isCopied={copiedJobLink} title="Copy link" />
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
            className="w-full text-left text-[11px] font-mono text-slate-500 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-blue-300 hover:text-blue-600 transition-colors cursor-pointer"
          >
            + Add job posting URL via Edit Info
          </button>
        )}
      </div>

      {/* Email Thread URL */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <MessageSquareText className="w-3.5 h-3.5 text-blue-600" />
          Email Thread
        </h3>
        {emailThreadUrl ? (
          <div className="flex items-center justify-between gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 group hover:border-slate-300 transition-colors shadow-2xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
                Webmail
              </span>
              <p className="text-xs font-mono text-slate-700 truncate min-w-0 flex-1">{emailThreadUrl}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyIconButton onClick={handleCopyThreadUrl} isCopied={copiedThreadUrl} title="Copy thread link" />
              <a
                href={emailThreadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/70 shadow-2xs transition-colors"
                title="Open email thread in webmail"
              >
                <span>Open</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenEditInfo}
            className="w-full text-left text-[11px] font-mono text-slate-500 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-blue-300 hover:text-blue-600 transition-colors cursor-pointer"
          >
            + Add email thread link (Gmail/Outlook) via Edit Info
          </button>
        )}
      </div>

      {/* Primary Recruiter Email & 1-Click Follow-Up Launcher */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <AtSign className="w-3.5 h-3.5 text-blue-500" />
          Primary Recruiter / Contact
        </h3>
        {contactEmail ? (
          <div className="flex items-center justify-between gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 group hover:border-slate-300 transition-colors shadow-2xs">
            <div className="min-w-0 flex-1">
              {contactName && (
                <p className="text-xs font-semibold text-slate-800 truncate">{contactName}</p>
              )}
              <p className="text-[11px] font-mono text-slate-600 truncate">{contactEmail}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CopyIconButton onClick={handleCopyEmail} isCopied={copiedEmail} title="Copy email" />
              {onOpenFollowUp ? (
                <button
                  type="button"
                  onClick={onOpenFollowUp}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 shadow-2xs transition-colors cursor-pointer"
                  title="Open follow-up engine"
                >
                  <Mail className="w-3 h-3 text-blue-600" />
                  <span>Follow-up</span>
                </button>
              ) : (
                <a
                  href={fallbackMailtoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 shadow-2xs transition-colors"
                  title={`Draft email to ${contactEmail}`}
                >
                  <Mail className="w-3 h-3 text-blue-600" />
                  <span>Follow-up</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl px-3.5 py-2.5">
            <button
              type="button"
              onClick={onOpenEditInfo}
              className="text-left text-[11px] font-mono text-slate-500 hover:text-blue-600 transition-colors cursor-pointer flex-1"
            >
              + Add contact email via Edit Info
            </button>
            {onOpenFollowUp && (
              <button
                type="button"
                onClick={onOpenFollowUp}
                className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Open follow-up engine"
              >
                <Mail className="w-3 h-3 text-blue-600" />
                <span>Follow-up</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
