import React, { useEffect, useState } from 'react';
import {
  Mail,
  ExternalLink,
  Copy,
  Check,
  X,
  Reply,
  Calendar,
  User,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { EmailLog } from '../../types';
import { LinkifiedText } from '../LinkifiedText';

export interface EmailReaderModalProps {
  email: EmailLog | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (email: EmailLog) => void;
  onDelete?: (emailId: string) => void;
}

export const EmailReaderModal: React.FC<EmailReaderModalProps> = ({
  email,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !email) return null;

  const isInbound = email.direction !== 'outbound' && email.sender.toLowerCase() !== 'you';
  const contentText = email.body || email.snippet || '';

  const handleCopy = async () => {
    if (!contentText) return;
    try {
      await navigator.clipboard.writeText(contentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  const mailtoReplyUrl = `mailto:${email.sender}?subject=${encodeURIComponent(
    email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
  )}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Email: ${email.subject}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  isInbound
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {isInbound ? (
                  <>
                    <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                    Received
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-purple-600" />
                    Sent by You
                  </>
                )}
              </span>

              <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {email.date}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {email.subject}
            </h2>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-mono">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">From:</span>
                <span className="font-semibold text-slate-800">{email.sender}</span>
              </span>
              {email.recipient && (
                <span className="flex items-center gap-1">
                  <span className="text-slate-500">→ To:</span>
                  <span className="font-semibold text-slate-800">{email.recipient}</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {email.emailUrl ? (
              <a
                href={email.emailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Thread
              </a>
            ) : null}

            {isInbound && email.sender.includes('@') && (
              <a
                href={mailtoReplyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              >
                <Reply className="w-3 h-3 text-slate-500" />
                Reply
              </a>
            )}
          </div>

          <div className="flex items-center gap-1">
            {contentText && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(email);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="Edit email entry"
                aria-label="Edit email entry"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(email.id);
                }}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Delete email entry"
                aria-label="Delete email entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {contentText ? (
            <div className="text-xs sm:text-sm text-slate-800 font-normal leading-relaxed whitespace-pre-wrap break-words bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <LinkifiedText text={contentText} />
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-8">
              No message body logged for this email.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
