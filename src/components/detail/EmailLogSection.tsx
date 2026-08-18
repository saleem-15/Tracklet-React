import React, { useState } from 'react';
import { Mail, Plus } from 'lucide-react';
import { EmailLog } from '../../types';

export interface EmailLogSectionProps {
  emails?: EmailLog[];
  contactEmail?: string;
  onAddEmailLog: (email: Omit<EmailLog, 'id'>) => Promise<void>;
}

export const EmailLogSection: React.FC<EmailLogSectionProps> = ({
  emails = [],
  contactEmail,
  onAddEmailLog,
}) => {
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailSender, setEmailSender] = useState(contactEmail || '');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailDate, setEmailDate] = useState('');
  const [emailSnippet, setEmailSnippet] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailSender.trim()) return;
    setIsSaving(true);
    try {
      await onAddEmailLog({
        subject: emailSubject.trim(),
        sender: emailSender.trim(),
        recipient: emailRecipient.trim() || undefined,
        date: emailDate || new Date().toISOString().split('T')[0],
        snippet: emailSnippet.trim() || undefined,
      });
      setEmailSubject('');
      setEmailSender(contactEmail || '');
      setEmailRecipient('');
      setEmailDate('');
      setEmailSnippet('');
      setShowAddEmail(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-blue-500" />
          Email Log
          {emails.length > 0 && <span className="ml-1 text-slate-500 font-normal">({emails.length})</span>}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddEmail(!showAddEmail)}
            className="flex items-center gap-1 text-[11px] font-mono bg-white hover:bg-slate-50 text-slate-600 font-semibold px-2 py-1 rounded-lg border border-slate-200 shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            Log
          </button>
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-mono bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-2 py-1 rounded-lg border border-blue-200/60 shadow-2xs transition-colors"
            >
              <Mail className="w-3 h-3" />
              Compose
            </a>
          )}
        </div>
      </div>

      {showAddEmail && (
        <form onSubmit={handleSubmit} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-sm">
          <input
            type="text"
            required
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Subject *"
            className="w-full bg-slate-50 text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={emailSender}
              onChange={(e) => setEmailSender(e.target.value)}
              placeholder="From *"
              className="bg-slate-50 text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
            />
            <input
              type="text"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              placeholder="To (optional)"
              className="bg-slate-50 text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
            />
          </div>
          <input
            type="date"
            value={emailDate}
            onChange={(e) => setEmailDate(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
          />
          <textarea
            value={emailSnippet}
            onChange={(e) => setEmailSnippet(e.target.value)}
            placeholder="Snippet / summary…"
            rows={2}
            className="w-full bg-slate-50 text-slate-900 placeholder-slate-500 p-2 rounded-lg border border-slate-200 text-xs resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddEmail(false)}
              className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !emailSubject.trim() || !emailSender.trim()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
        {emails.length > 0 ? (
          emails.map((email) => (
            <div key={email.id} className="p-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{email.subject}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                    <span>From: {email.sender}</span>
                    {email.recipient && <span className="text-slate-500">→ {email.recipient}</span>}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0 mt-0.5">{email.date}</span>
              </div>
              {email.snippet && (
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/60 rounded-lg p-2 mt-2 italic leading-relaxed">
                  &ldquo;{email.snippet}&rdquo;
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="text-slate-500 font-mono text-[11px] text-center py-4">No emails logged yet.</div>
        )}
      </div>
    </div>
  );
};
