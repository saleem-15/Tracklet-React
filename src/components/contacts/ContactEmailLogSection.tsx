import React, { useState, useMemo } from 'react';
import { Mail, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Contact, EmailLog, Application } from '../../types';
import { EmailLogCard } from '../detail/EmailLogCard';
import { EmailLogForm } from '../detail/EmailLogForm';
import { SelectOption } from '../CustomSelectDropdown';

export interface ContactEmailLogSectionProps {
  contact: Contact;
  emails?: EmailLog[];
  applications?: Application[];
  currentUserEmail?: string;
  onAddEmailLog: (email: Omit<EmailLog, 'id'>, targetApplicationId?: string) => Promise<void>;
  onUpdateEmailLog?: (emailId: string, email: Partial<Omit<EmailLog, 'id'>>) => Promise<void>;
  onDeleteEmailLog?: (emailId: string) => Promise<void>;
  onNavigateToApplication?: (appId: string) => void;
}

export const ContactEmailLogSection: React.FC<ContactEmailLogSectionProps> = ({
  contact,
  emails = [],
  applications = [],
  currentUserEmail,
  onAddEmailLog,
  onUpdateEmailLog,
  onDeleteEmailLog,
  onNavigateToApplication,
}) => {
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);

  // Linked applications for this contact
  const linkedApps = useMemo(() => {
    const linkedIds = new Set(contact.applicationIds || []);
    return applications.filter((app) => linkedIds.has(app.id));
  }, [contact.applicationIds, applications]);

  // Application options for the form selector
  const applicationOptions: SelectOption<string>[] = useMemo(() => {
    return [
      { label: 'None (Contact only)', value: '__none__' },
      ...linkedApps.map((app) => ({
        label: `${app.company} · ${app.role}`,
        value: app.id,
      })),
    ];
  }, [linkedApps]);

  // Sort emails: newest at top, oldest at bottom
  const sortedEmails = useMemo(() => {
    return [...emails].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date).getTime();
      const timeB = new Date(b.timestamp || b.date).getTime();
      return (isNaN(timeA) ? 0 : timeA) < (isNaN(timeB) ? 0 : timeB) ? 1 : -1;
    });
  }, [emails]);

  const defaultParty = contact.email || contact.name || '';
  const quickFillOptions = useMemo(() => {
    return [contact.email, contact.name].filter((v): v is string => Boolean(v && v.trim()));
  }, [contact.email, contact.name]);

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

  const handleFormSubmit = async (payload: Omit<EmailLog, 'id'>, targetAppId?: string) => {
    const finalPayload = {
      ...payload,
      contactId: contact.id,
    };

    if (editingEmailId && onUpdateEmailLog) {
      await onUpdateEmailLog(editingEmailId, finalPayload);
    } else {
      await onAddEmailLog(finalPayload, targetAppId);
    }
    setShowAddEmail(false);
    setEditingEmailId(null);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-blue-500" />
          Emails
          {sortedEmails.length > 0 && (
            <span className="text-[11px] font-normal text-slate-500">
              ({sortedEmails.length})
            </span>
          )}
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
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
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
          applicationOptions={applicationOptions.length > 1 ? applicationOptions : undefined}
          defaultApplicationId={editingEmail?.applicationId}
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
          {/* Continuous vertical timeline spine: anchored at 10px */}
          <div
            className="absolute left-[10px] top-0 bottom-4 w-px bg-slate-200/60 pointer-events-none -translate-x-1/2"
            aria-hidden="true"
          />

          {sortedEmails.map((email) => {
            const isInbound = email.direction !== 'outbound' && email.sender.toLowerCase() !== 'you';
            const linkedApp = applications.find((a) => a.id === email.applicationId);

            return (
              <div key={email.id} className="flex items-start gap-2 relative group">
                {/* Timeline Node Column */}
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
                    contacts={[contact]}
                    companyName={linkedApp?.company}
                    linkedApplication={linkedApp}
                    onEdit={handleStartEdit}
                    onDelete={onDeleteEmailLog}
                    onNavigateToApplication={onNavigateToApplication}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !showAddEmail && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 text-center shadow-2xs">
            <Mail className="w-4 h-4 text-slate-400 mx-auto mb-1 opacity-60" />
            <div className="text-slate-600 font-mono text-xs font-medium">
              No emails logged yet
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Log advice, mentorship syncs, or interview updates with {contact.name}.
            </p>
          </div>
        )
      )}
    </div>
  );
};
