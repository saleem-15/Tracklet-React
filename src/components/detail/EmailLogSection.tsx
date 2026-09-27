import React, { useState, useMemo } from 'react';
import { Mail, Plus, Link2, ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';
import { Contact, EmailLog } from '../../types';
import { EmailLogCard } from './EmailLogCard';
import { formatLocalDate } from '../../lib/dateUtils';

export interface EmailLogSectionProps {
  emails?: EmailLog[];
  companyName?: string;
  contactEmail?: string;
  contacts?: Contact[];
  allContacts?: Contact[];
  currentUserEmail?: string;
  onAddEmailLog: (email: Omit<EmailLog, 'id'>) => Promise<void>;
  onUpdateEmailLog?: (emailId: string, email: Partial<Omit<EmailLog, 'id'>>) => Promise<void>;
  onDeleteEmailLog?: (emailId: string) => Promise<void>;
}

export const EmailLogSection: React.FC<EmailLogSectionProps> = ({
  emails = [],
  companyName,
  contactEmail,
  contacts = [],
  allContacts = [],
  currentUserEmail,
  onAddEmailLog,
  onUpdateEmailLog,
  onDeleteEmailLog,
}) => {
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);

  // Sort emails: newest at top, oldest at bottom (matches StatusHistoryTimeline order)
  const sortedEmails = useMemo(() => {
    return [...emails].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date).getTime();
      const timeB = new Date(b.timestamp || b.date).getTime();
      return (isNaN(timeA) ? 0 : timeA) < (isNaN(timeB) ? 0 : timeB) ? 1 : -1;
    });
  }, [emails]);

  // Available candidate contacts to suggest as 1-click chips
  const relevantContacts = [
    ...(contacts || []),
    ...(allContacts || []).filter((c) =>
      contacts?.every((ac) => ac.id !== c.id) &&
      companyName &&
      c.organization?.toLowerCase() === companyName.toLowerCase()
    ),
  ].filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);

  // Form state
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [subject, setSubject] = useState('');
  const [counterparty, setCounterparty] = useState(contactEmail || companyName || '');
  const [date, setDate] = useState('');
  const [emailUrl, setEmailUrl] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingTimestamp, setEditingTimestamp] = useState<string | undefined>(undefined);

  const defaultParty = contactEmail || relevantContacts[0]?.email || relevantContacts[0]?.name || companyName || '';

  const resetForm = () => {
    setDirection('inbound');
    setSubject('');
    setCounterparty(defaultParty);
    setDate('');
    setEmailUrl('');
    setBody('');
    setEditingEmailId(null);
    setEditingTimestamp(undefined);
    setShowAddEmail(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setShowAddEmail(true);
  };

  const handleStartEdit = (email: EmailLog) => {
    const isOutbound = email.direction === 'outbound' || email.sender.toLowerCase() === 'you';
    setEditingEmailId(email.id);
    setEditingTimestamp(email.timestamp);
    setDirection(isOutbound ? 'outbound' : 'inbound');
    setSubject(email.subject);
    setCounterparty(isOutbound ? (email.recipient || '') : email.sender);
    setDate(email.date);
    setEmailUrl(email.emailUrl || '');
    setBody(email.body || email.snippet || '');
    setShowAddEmail(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubject = subject.trim();
    const cleanParty = counterparty.trim() || companyName || 'Recruiter';
    if (!cleanSubject) return;

    setIsSaving(true);
    try {
      const isOutbound = direction === 'outbound';
      const userLabel = currentUserEmail || 'You';
      const now = new Date();

      let computedTimestamp: string;
      const editingDate = editingTimestamp ? formatLocalDate(new Date(editingTimestamp)) : '';
      if (editingEmailId && editingTimestamp && (!date || editingDate === date)) {
        computedTimestamp = editingTimestamp;
      } else if (date) {
        const [y, m, d] = date.split('-').map(Number);
        const target = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        computedTimestamp = target.toISOString();
      } else {
        computedTimestamp = now.toISOString();
      }

      const emailPayload: Omit<EmailLog, 'id'> = {
        subject: cleanSubject,
        sender: isOutbound ? userLabel : cleanParty,
        recipient: isOutbound ? cleanParty : userLabel,
        direction,
        date: date || now.toISOString().split('T')[0],
        timestamp: computedTimestamp,
        emailUrl: emailUrl.trim() || undefined,
        body: body.trim() || undefined,
        snippet: body.trim() ? body.trim().slice(0, 160) : undefined,
      };

      if (editingEmailId && onUpdateEmailLog) {
        await onUpdateEmailLog(editingEmailId, emailPayload);
      } else {
        await onAddEmailLog(emailPayload);
      }
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <div className="w-5 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5 text-blue-500" />
          </div>
          Emails
          {emails.length > 0 && <span className="ml-1 text-slate-500 font-normal">({emails.length})</span>}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (showAddEmail) {
                resetForm();
              } else {
                handleStartAdd();
              }
            }}
            className="flex items-center gap-1 text-[11px] font-mono bg-white hover:bg-slate-50 text-slate-600 font-semibold px-2 py-1 rounded-lg border border-slate-200 shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            {editingEmailId ? 'Edit' : 'Log Email'}
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

      {/* Log / Edit Form */}
      {showAddEmail && (
        <form
          onSubmit={handleSubmit}
          className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs animate-in fade-in duration-150"
        >
          {/* Header & Direction Segmented Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-800">
              {editingEmailId ? 'Edit Email Log' : 'Log Email Milestone'}
            </span>

            {/* Direction Toggle */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70 text-[11px] font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setDirection('inbound');
                  if (!counterparty) setCounterparty(defaultParty);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  direction === 'inbound'
                    ? 'bg-white text-sky-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3 h-3 text-sky-600" />
                Received
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirection('outbound');
                  if (!counterparty) setCounterparty(defaultParty);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  direction === 'outbound'
                    ? 'bg-white text-emerald-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                Sent
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 mb-1">
              Subject *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Interview Confirmation"
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs transition-colors"
            />
          </div>

          {/* Counterparty & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono text-slate-500">
                {direction === 'inbound' ? 'From (Recruiter / Company) *' : 'To (Recruiter / Contact) *'}
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {direction === 'inbound' ? 'To: You' : 'From: You'}
              </span>
            </div>

            <input
              type="text"
              required
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder="Name or email"
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono transition-colors"
            />

            {/* Quick 1-click Contact Chips */}
            {(contactEmail || companyName || relevantContacts.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-500 font-mono">Quick fill:</span>
                {contactEmail && (
                  <button
                    type="button"
                    onClick={() => setCounterparty(contactEmail)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
                  >
                    {counterparty === contactEmail && <Check className="w-2.5 h-2.5 text-blue-600" />}
                    {contactEmail}
                  </button>
                )}
                {relevantContacts.slice(0, 2).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCounterparty(c.email || c.name)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
                  >
                    {(counterparty === c.email || counterparty === c.name) && (
                      <Check className="w-2.5 h-2.5 text-blue-600" />
                    )}
                    {c.name}
                  </button>
                ))}
                {companyName && (
                  <button
                    type="button"
                    onClick={() => setCounterparty(companyName)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
                  >
                    {counterparty === companyName && <Check className="w-2.5 h-2.5 text-blue-600" />}
                    {companyName}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Date & Thread Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-mono text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-mono text-[11px] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-500 mb-1">
                Thread URL <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="url"
                  value={emailUrl}
                  onChange={(e) => setEmailUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-mono text-[11px] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div>
            <label className="block text-[11px] font-mono text-slate-500 mb-1">
              Email Body <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste or type email body..."
              rows={3}
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs resize-y transition-colors leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !subject.trim() || !counterparty.trim()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              {isSaving ? 'Saving…' : editingEmailId ? 'Update Email' : 'Save Email'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline Emails List */}
      {sortedEmails.length > 0 ? (
        <div className="relative space-y-3 pt-1">
          {/* Continuous vertical timeline spine: anchored at exactly 10px to match the 20px-wide node column */}
          <div
            className="absolute left-[10px] top-0 bottom-4 w-px bg-slate-200/60 pointer-events-none -translate-x-1/2"
            aria-hidden="true"
          />

          {sortedEmails.map((email) => {
            const isInbound = email.direction !== 'outbound' && email.sender.toLowerCase() !== 'you';
            return (
              <div key={email.id} className="flex items-start gap-2 relative group">
                {/* Timeline Node Column: 20px wide, center is at 10px */}
                <div className="w-5 shrink-0 relative self-stretch">
                  {/* Unified Directional Node directly on the timeline spine (vertically centered with the card's subject) */}
                  <div
                    className={`absolute top-[20px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border flex items-center justify-center shadow-2xs z-10 transition-colors ${
                      isInbound
                        ? 'bg-sky-50 border-sky-200/90 text-sky-600'
                        : 'bg-emerald-50 border-emerald-200/90 text-emerald-600'
                    }`}
                    title={isInbound ? 'Received email' : 'Sent email'}
                    aria-label={isInbound ? 'Received email' : 'Sent email'}
                  >
                    {isInbound ? (
                      <ArrowDownLeft className="w-3 h-3" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3" />
                    )}
                  </div>
                </div>

                {/* Email Card */}
                <div className="flex-1 min-w-0">
                  <EmailLogCard
                    email={email}
                    contacts={[...(contacts || []), ...(allContacts || [])]}
                    companyName={companyName}
                    onEdit={handleStartEdit}
                    onDelete={onDeleteEmailLog}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !showAddEmail && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 text-center shadow-2xs">
            <Mail className="w-5 h-5 text-slate-400 mx-auto mb-1.5 opacity-60" />
            <div className="text-slate-500 font-mono text-xs font-medium">
              No emails logged yet
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Click &ldquo;Log Email&rdquo; above or use the webmail companion extension to clip emails here.
            </p>
          </div>
        )
      )}
    </div>
  );
};
