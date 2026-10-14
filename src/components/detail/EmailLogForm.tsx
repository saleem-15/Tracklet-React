import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Link2, Check, Briefcase } from 'lucide-react';
import { EmailLog } from '../../types';
import { formatLocalDate } from '../../lib/dateUtils';
import { CustomSelectDropdown, SelectOption } from '../CustomSelectDropdown';

export interface EmailLogFormProps {
  initialEmail?: EmailLog | null;
  defaultCounterparty?: string;
  quickFillOptions?: string[];
  applicationOptions?: SelectOption<string>[];
  defaultApplicationId?: string;
  currentUserEmail?: string;
  onSubmit: (emailPayload: Omit<EmailLog, 'id'>, targetApplicationId?: string) => Promise<void>;
  onCancel: () => void;
}

export const EmailLogForm: React.FC<EmailLogFormProps> = ({
  initialEmail,
  defaultCounterparty = '',
  quickFillOptions = [],
  applicationOptions,
  defaultApplicationId,
  currentUserEmail,
  onSubmit,
  onCancel,
}) => {
  const isEditing = Boolean(initialEmail);
  const isInitialOutbound =
    initialEmail?.direction === 'outbound' || initialEmail?.sender?.toLowerCase() === 'you';

  const [direction, setDirection] = useState<'inbound' | 'outbound'>(
    initialEmail ? (isInitialOutbound ? 'outbound' : 'inbound') : 'inbound'
  );
  const [subject, setSubject] = useState(initialEmail?.subject || '');
  const [counterparty, setCounterparty] = useState(
    initialEmail
      ? isInitialOutbound
        ? initialEmail.recipient || ''
        : initialEmail.sender || ''
      : defaultCounterparty
  );
  const [date, setDate] = useState(initialEmail?.date || '');
  const [emailUrl, setEmailUrl] = useState(initialEmail?.emailUrl || '');
  const [body, setBody] = useState(initialEmail?.body || initialEmail?.snippet || '');
  const [selectedAppId, setSelectedAppId] = useState<string>(
    initialEmail?.applicationId || defaultApplicationId || '__none__'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubject = subject.trim();
    const cleanParty = counterparty.trim() || 'Contact';
    if (!cleanSubject) return;

    setIsSaving(true);
    try {
      const isOutbound = direction === 'outbound';
      const userLabel = currentUserEmail || 'You';
      const now = new Date();

      let computedTimestamp: string;
      const editingDate = initialEmail?.timestamp
        ? formatLocalDate(new Date(initialEmail.timestamp))
        : '';
      if (initialEmail && initialEmail.timestamp && (!date || editingDate === date)) {
        computedTimestamp = initialEmail.timestamp;
      } else if (date) {
        const [y, m, d] = date.split('-').map(Number);
        const target = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        computedTimestamp = target.toISOString();
      } else {
        computedTimestamp = now.toISOString();
      }

      const targetAppId = selectedAppId !== '__none__' ? selectedAppId : undefined;

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
        applicationId: targetAppId,
      };

      await onSubmit(emailPayload, targetAppId);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs animate-in fade-in duration-150"
    >
      {/* Header & Direction Segmented Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-800">
          {isEditing ? 'Edit Email Log' : 'Log Email Milestone'}
        </span>

        {/* Direction Toggle */}
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70 text-[11px] font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setDirection('inbound');
              if (!counterparty) setCounterparty(defaultCounterparty);
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
              if (!counterparty) setCounterparty(defaultCounterparty);
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
        <label className="block text-[11px] font-mono text-slate-500 mb-1">Subject *</label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Interview Confirmation or Mentorship Advice"
          className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs transition-colors"
        />
      </div>

      {/* Optional Linked Application selector */}
      {applicationOptions && applicationOptions.length > 1 && (
        <div>
          <label className="block text-[11px] font-mono text-slate-500 mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-slate-400" />
            Associate with Job Application
          </label>
          <CustomSelectDropdown
            value={selectedAppId}
            onChange={(val) => setSelectedAppId(String(val))}
            options={applicationOptions}
            size="sm"
            className="w-full"
          />
        </div>
      )}

      {/* Counterparty & Quick Chips */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-mono text-slate-500">
            {direction === 'inbound' ? 'From (Sender) *' : 'To (Recipient) *'}
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
          placeholder="Name or email address"
          className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono transition-colors"
        />

        {/* Quick Fill Chips */}
        {quickFillOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-slate-500 font-mono">Quick fill:</span>
            {quickFillOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setCounterparty(opt)}
                className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
              >
                {counterparty === opt && <Check className="w-2.5 h-2.5 text-blue-600" />}
                {opt}
              </button>
            ))}
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
          onClick={onCancel}
          className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !subject.trim() || !counterparty.trim()}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
        >
          {isSaving ? 'Saving…' : isEditing ? 'Update Email' : 'Save Email'}
        </button>
      </div>
    </form>
  );
};
