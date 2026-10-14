import React, { useState, useMemo } from 'react';
import { Mail, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Contact, EmailLog } from '../../types';
import { EmailLogCard } from './EmailLogCard';
import { EmailLogForm } from './EmailLogForm';

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
  const relevantContacts = useMemo(() => {
    return [
      ...(contacts || []),
      ...(allContacts || []).filter((c) =>
        contacts?.every((ac) => ac.id !== c.id) &&
        companyName &&
        c.organization?.toLowerCase() === companyName.toLowerCase()
      ),
    ].filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);
  }, [contacts, allContacts, companyName]);

  const defaultParty = contactEmail || relevantContacts[0]?.email || relevantContacts[0]?.name || companyName || '';

  const quickFillOptions = useMemo(() => {
    const list = [
      contactEmail,
      ...relevantContacts.slice(0, 2).map((c) => c.email || c.name),
      companyName,
    ].filter((v): v is string => Boolean(v && v.trim()));
    return Array.from(new Set(list));
  }, [contactEmail, relevantContacts, companyName]);

  const editingEmail = useMemo(() => {
    if (!editingEmailId) return null;
    return emails.find((e) => e.id === editingEmailId) || null;
  }, [editingEmailId, emails]);

  const handleStartAdd = () => {
    setEditingEmailId(null);
    setShowAddEmail(true);
  };

  const handleStartEdit = (email: EmailLog) => {
    setEditingEmailId(email.id);
    setShowAddEmail(true);
  };

  const handleFormSubmit = async (payload: Omit<EmailLog, 'id'>) => {
    // If counterparty matches any relevant contact, attach contactId for attribution
    let finalPayload = payload;
    const matchedContact = relevantContacts.find(
      (c) =>
        (c.email && c.email.toLowerCase() === payload.sender.toLowerCase()) ||
        (c.email && payload.recipient && c.email.toLowerCase() === payload.recipient.toLowerCase()) ||
        (c.name && c.name.toLowerCase() === payload.sender.toLowerCase()) ||
        (c.name && payload.recipient && c.name.toLowerCase() === payload.recipient.toLowerCase())
    );
    if (matchedContact && !finalPayload.contactId) {
      finalPayload = { ...finalPayload, contactId: matchedContact.id };
    }

    if (editingEmailId && onUpdateEmailLog) {
      await onUpdateEmailLog(editingEmailId, finalPayload);
    } else {
      await onAddEmailLog(finalPayload);
    }
    setShowAddEmail(false);
    setEditingEmailId(null);
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
                setShowAddEmail(false);
                setEditingEmailId(null);
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
        <EmailLogForm
          key={editingEmailId || 'new'}
          initialEmail={editingEmail}
          defaultCounterparty={defaultParty}
          quickFillOptions={quickFillOptions}
          currentUserEmail={currentUserEmail}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowAddEmail(false);
            setEditingEmailId(null);
          }}
        />
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
