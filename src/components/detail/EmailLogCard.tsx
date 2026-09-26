import React, { useState } from 'react';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Contact, EmailLog } from '../../types';
import { LinkifiedText } from '../LinkifiedText';
import { formatEmailDateTime } from '../../lib/dateUtils';
import { resolveEmailCounterparty } from '../../lib/emailCounterpartyUtils';

export interface EmailLogCardProps {
  email: EmailLog;
  contacts?: Contact[];
  companyName?: string;
  onOpenReader: (email: EmailLog) => void;
  onEdit?: (email: EmailLog) => void;
  onDelete?: (emailId: string) => void;
}

export const EmailLogCard: React.FC<EmailLogCardProps> = ({
  email,
  contacts = [],
  companyName,
  onOpenReader,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isInbound = email.direction !== 'outbound' && email.sender.toLowerCase() !== 'you';
  const contentText = email.body || email.snippet || '';
  const isLong = contentText.length > 140 || contentText.includes('\n');

  const formattedDateTime = formatEmailDateTime(email.date, email.timestamp);
  const { primaryLabel, secondaryEmail } = resolveEmailCounterparty({
    isInbound,
    sender: email.sender,
    recipient: email.recipient,
    contacts,
    companyName,
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow group relative">
      <div className="flex items-start gap-3">
        {/* Left Direction Indicator: 45° Diagonal Arrow inside circular accent */}
        <div
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            isInbound
              ? 'bg-sky-50 text-sky-600'
              : 'bg-emerald-50 text-emerald-600'
          }`}
          title={isInbound ? 'Received email' : 'Sent email'}
        >
          {isInbound ? (
            <ArrowDownLeft className="w-3.5 h-3.5" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Card Body */}
        <div className="flex-1 min-w-0">
          {/* Top Row: Subject + Date & Actions */}
          <div className="flex items-baseline justify-between gap-3">
            <h4
              onClick={() => isLong && onOpenReader(email)}
              className={`text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug truncate ${
                isLong ? 'hover:text-blue-600 cursor-pointer' : ''
              }`}
              title={email.subject}
            >
              {email.subject}
            </h4>

            {/* Right meta & secondary action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                {formattedDateTime}
              </span>

              {/* Hover Actions: Webmail link, Edit, Delete */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 ml-1">
                {email.emailUrl && (
                  <a
                    href={email.emailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Open thread in webmail"
                    aria-label="Open thread in webmail"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(email)}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Edit email log"
                    aria-label="Edit email log"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(email.id)}
                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Delete email log"
                    aria-label="Delete email log"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2-Tier Sender / Recipient Metadata */}
          <div className="mt-1">
            <div className="text-xs font-medium text-slate-800 leading-snug">
              {primaryLabel}
            </div>
            {secondaryEmail && (
              <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5" title={secondaryEmail}>
                {secondaryEmail}
              </div>
            )}
          </div>

          {/* Unboxed Content Snippet (clean text, no nested gray container) */}
          {contentText && (
            <div className="mt-2">
              {isExpanded ? (
                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  <LinkifiedText text={contentText} />
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {contentText}
                </p>
              )}

              {/* Bottom bar: Read full email link + Copy / Reader controls */}
              <div className="mt-2 flex items-center justify-between gap-3 pt-1">
                {isLong ? (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? 'Show less' : 'Read full email'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                ) : (
                  <div />
                )}

                {/* Secondary utility controls (Reader) */}
                {isLong && (
                  <button
                    type="button"
                    onClick={() => onOpenReader(email)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Open in focused reader modal"
                  >
                    <Maximize2 className="w-3 h-3 text-slate-400" />
                    <span>Reader</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
