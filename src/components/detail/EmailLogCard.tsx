import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  MoreHorizontal,
  Copy,
  Check,
} from 'lucide-react';
import { Contact, EmailLog } from '../../types';
import { FormattedEmailBody } from './FormattedEmailBody';
import { formatEmailDateTime } from '../../lib/dateUtils';
import { resolveEmailCounterparty } from '../../lib/emailCounterpartyUtils';

export interface EmailLogCardProps {
  email: EmailLog;
  contacts?: Contact[];
  companyName?: string;
  onEdit?: (email: EmailLog) => void;
  onDelete?: (emailId: string) => void;
}

export const EmailLogCard: React.FC<EmailLogCardProps> = ({
  email,
  contacts = [],
  companyName,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside and escape key
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

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

  const handleCopy = async () => {
    try {
      const parts = [
        email.subject ? `Subject: ${email.subject}` : '',
        primaryLabel ? (isInbound ? `From: ${primaryLabel}` : primaryLabel) : '',
        secondaryEmail ? `<${secondaryEmail}>` : '',
        '',
        contentText,
      ].filter(Boolean);
      await navigator.clipboard.writeText(parts.join('\n'));
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        setIsMenuOpen(false);
      }, 1000);
    } catch {
      // Fallback ignore
    }
  };

  const hasAnyActions = Boolean(onEdit || onDelete || email.emailUrl || isLong || contentText);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs hover:shadow-xs transition-shadow relative">
      {/* Top Row: Full-Width Clean Subject (Max 2 lines when collapsed, unconstrained when expanded) */}
      <h4
        className={`text-[13px] font-semibold text-slate-900 leading-snug break-words select-text ${
          isExpanded ? '' : 'line-clamp-2'
        }`}
        title={email.subject}
      >
        {email.subject}
      </h4>

      {/* Supporting Metadata: Primary Actor (Left) + Formatted Date & Time (Right) */}
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 min-w-0">
        <div className="text-xs text-slate-600 truncate min-w-0 flex items-baseline gap-1">
          {isInbound ? (
            <>
              <span className="text-slate-500 font-normal shrink-0">From</span>
              <span className="font-medium text-slate-700 truncate">{primaryLabel}</span>
            </>
          ) : (
            <>
              <span className="text-slate-500 font-normal shrink-0">To</span>
              <span className="font-medium text-slate-700 truncate">
                {primaryLabel.startsWith('To: ') ? primaryLabel.slice(4) : primaryLabel}
              </span>
            </>
          )}
        </div>

        {/* Date & Time anchored with actor identity */}
        <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0 text-right tabular-nums">
          {formattedDateTime}
        </span>
      </div>

      {/* Secondary Email Handle (Directly below sender/recipient) */}
      {secondaryEmail && (
        <div className="text-[11px] font-mono text-slate-500 select-all truncate mt-0.5" title={secondaryEmail}>
          {secondaryEmail}
        </div>
      )}

      {/* Unboxed Content Snippet (clean formatted text, full horizontal width) */}
      {contentText && (
        <div className="mt-1.5">
          {isExpanded ? (
            <FormattedEmailBody text={contentText} />
          ) : (
            <FormattedEmailBody text={contentText} isCollapsed />
          )}
        </div>
      )}

      {/* Bottom Action Surface: Read full email on left, ⋯ menu on right */}
      {hasAnyActions && (
        <div className="mt-2 flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
          {/* Left: Read full email link */}
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

          {/* Right: Secondary Actions Menu (⋯) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              aria-label="More actions for this email"
              className={`p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
                isMenuOpen ? 'bg-slate-100 text-slate-800' : ''
              }`}
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 bottom-full mb-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
              >

                {email.emailUrl && (
                  <a
                    href={email.emailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>Open in webmail</span>
                  </a>
                )}

                {contentText && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopy}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy text</span>
                      </>
                    )}
                  </button>
                )}

                {onEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(email);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit email</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete(email.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
                    <span>Delete log</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
