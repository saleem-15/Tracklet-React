import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { EmailLog } from '../../types';
import { LinkifiedText } from '../LinkifiedText';

export interface EmailLogCardProps {
  email: EmailLog;
  onOpenReader: (email: EmailLog) => void;
  onEdit?: (email: EmailLog) => void;
  onDelete?: (emailId: string) => void;
}

export const EmailLogCard: React.FC<EmailLogCardProps> = ({
  email,
  onOpenReader,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isInbound = email.direction !== 'outbound' && email.sender.toLowerCase() !== 'you';
  const contentText = email.body || email.snippet || '';
  const isLong = contentText.length > 140 || contentText.includes('\n');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contentText) return;
    try {
      await navigator.clipboard.writeText(contentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <div className="p-3 sm:p-3.5 hover:bg-slate-50/70 transition-colors group">
      {/* Top Meta Row: Direction, Date & Link */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
              isInbound
                ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                : 'bg-purple-50 text-purple-700 border-purple-200/80'
            }`}
          >
            {isInbound ? (
              <>
                <ArrowDownLeft className="w-2.5 h-2.5 text-blue-600" />
                Received
              </>
            ) : (
              <>
                <ArrowUpRight className="w-2.5 h-2.5 text-purple-600" />
                Sent
              </>
            )}
          </span>

          <span className="text-[11px] font-mono text-slate-500">{email.date}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {email.emailUrl && (
            <a
              href={email.emailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/60 transition-colors"
              title="Open email thread in webmail"
            >
              <span>Open</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(email)}
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors cursor-pointer"
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

      {/* Subject */}
      <h4
        onClick={() => isLong && onOpenReader(email)}
        className={`text-xs font-semibold text-slate-900 leading-snug ${
          isLong ? 'hover:text-blue-600 cursor-pointer' : ''
        }`}
      >
        {email.subject}
      </h4>

      {/* From / To Subtitle */}
      <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {isInbound ? (
          <>
            <span>From: {email.sender}</span>
            {email.recipient && email.recipient.toLowerCase() !== 'you' && (
              <span>→ To: {email.recipient}</span>
            )}
          </>
        ) : (
          <>
            <span>Sent by: You</span>
            {email.recipient && <span>→ To: {email.recipient}</span>}
          </>
        )}
      </p>

      {/* Body / Snippet */}
      {contentText && (
        <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200/60 rounded-lg p-2.5">
          {isExpanded ? (
            <div className="whitespace-pre-wrap leading-relaxed">
              <LinkifiedText text={contentText} />
            </div>
          ) : (
            <p className="line-clamp-2 italic leading-relaxed text-slate-600">
              &ldquo;{contentText.length > 180 ? `${contentText.slice(0, 180)}…` : contentText}&rdquo;
            </p>
          )}

          {/* Footer of the text snippet: Expand / Modal / Copy */}
          <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between gap-2 text-[10px] font-mono">
            <div>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <span>Read full email</span>
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Copy email text"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {isLong && (
                <button
                  type="button"
                  onClick={() => onOpenReader(email)}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Open in focused reader modal"
                >
                  <Maximize2 className="w-3 h-3 text-slate-400" />
                  <span>Reader</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
