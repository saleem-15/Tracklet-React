import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus, Contact, ApplicationTask, FollowUpTemplate, EmailLog } from '../types';
import { calculateDaysInStage } from '../lib/sampleData';
import { ApplicationDetailHeader } from './detail/ApplicationDetailHeader';
import { ApplicationDetailFooter } from './detail/ApplicationDetailFooter';
import { ApplicationInfoEditor } from './detail/ApplicationInfoEditor';
import { ApplicationMetricsBar } from './detail/ApplicationMetricsBar';
import { TaskChecklistSection } from './detail/TaskChecklistSection';
import { ContactManagerSection } from './detail/ContactManagerSection';
import { StatusHistoryTimeline } from './detail/StatusHistoryTimeline';
import { UnsavedChangesPrompt } from './detail/UnsavedChangesPrompt';
import { ApplicationNotesSection } from './detail/ApplicationNotesSection';
import { ApplicationQuickLinks } from './detail/ApplicationQuickLinks';
import { EmailLogSection } from './detail/EmailLogSection';
import { FollowUpModal, FollowUpTriggerDetails } from './templates/FollowUpModal';
import { TemplateRepository } from '../lib/templateRepository';
import { addBusinessDays } from '../lib/dateUtils';
import { resolveDraftOnOpen, clearNoteDraft } from '../lib/editor/noteDrafts';
import { useEscapeKey } from '../lib/useEscapeKey';

export interface ApplicationDetailPanelProps {
  app: Application | null;
  allContacts?: Contact[];
  currentUserEmail?: string;
  onClose: () => void;
  onUpdateApp: (id: string, updates: Partial<Application>) => Promise<void>;
  onDeleteApp: (id: string) => Promise<void>;
  onLinkContact?: (contactId: string, appId: string) => Promise<void>;
  onUnlinkContact?: (contactId: string, appId: string) => Promise<void>;
  onCreateAndLinkContact?: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, appId: string) => Promise<void>;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => Promise<void>;
  onSelectContact?: (contactId: string) => void;
  onEditContact?: (contact: Contact) => void;
  onShowToast?: (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    description?: string,
    action?: { label: string; onClick: () => void },
    stage?: ApplicationStatus
  ) => void;
}

export const ApplicationDetailPanel: React.FC<ApplicationDetailPanelProps> = ({
  app,
  allContacts = [],
  currentUserEmail,
  onClose,
  onUpdateApp,
  onDeleteApp,
  onLinkContact,
  onUnlinkContact,
  onCreateAndLinkContact,
  onUpdateContact,
  onSelectContact,
  onEditContact,
  onShowToast,
}) => {
  const [notes, setNotes] = useState(app?.notes || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [draftNoticeVisible, setDraftNoticeVisible] = useState(false);

  // Follow-up engine state
  const [templates, setTemplates] = useState<FollowUpTemplate[]>(() => TemplateRepository.loadGuestTemplates());
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpContact, setFollowUpContact] = useState<Contact | null>(null);

  useEffect(() => {
    let isMounted = true;
    TemplateRepository.loadTemplates(app?.userId).then((loaded) => {
      if (isMounted) setTemplates(loaded);
    });
    return () => {
      isMounted = false;
    };
  }, [app?.userId]);

  // Resolve primary contact name & email (checks app.contactEmail first, then linked contacts)
  const effectiveContact = React.useMemo(() => {
    if (!app) return { email: undefined, name: undefined };
    if (app.contactEmail) {
      const match = allContacts.find((c) => c.email === app.contactEmail) ||
        (app.contacts || []).find((c) => c.email === app.contactEmail);
      return {
        email: app.contactEmail,
        name: match?.name,
      };
    }
    const linkedIds = new Set(app.contactIds || []);
    const linked = allContacts.filter((c) => linkedIds.has(c.id) && c.email);
    const legacy = (app.contacts || []).filter((c) => c.email);
    const candidates = [...linked, ...legacy];
    if (candidates.length > 0) {
      const recruiter = candidates.find((c) => c.category === 'Recruiter' || c.category === 'Hiring Manager') || candidates[0];
      return {
        email: recruiter.email,
        name: recruiter.name,
      };
    }
    return { email: undefined, name: undefined };
  }, [app, allContacts]);

  // Refs for tracking debounced auto-save state and flush on close
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNotesRef = React.useRef<string>(app?.notes || '');
  const lastSavedNotesRef = React.useRef<string>(app?.notes || '');
  const appIdRef = React.useRef<string | undefined>(app?.id);
  const inFlightSaveRef = React.useRef<Promise<void> | null>(null);
  const saveSeqRef = React.useRef(0);

  // Resync editor state ONLY when the target record changes (FR-003) —
  // never as a side-effect of our own saves echoing back through app.notes.
  useEffect(() => {
    appIdRef.current = app?.id;
    if (!app) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Crash-recovery decision (FR-018/019): restore fresher device drafts
    const resolution = resolveDraftOnOpen(app.id, app.notes || '', app.updatedAt);
    let initialNotes = app.notes || '';
    let restored = false;
    if ('restore' in resolution && resolution.restore) {
      initialNotes = resolution.restore.markdown;
      restored = true;
    }
    setDraftNoticeVisible(restored);

    setNotes(initialNotes);
    latestNotesRef.current = initialNotes;
    lastSavedNotesRef.current = app.notes || '';
    const dirtyOnLoad = initialNotes !== lastSavedNotesRef.current;
    setHasUnsavedNotes(dirtyOnLoad);
    setSaveStatus(dirtyOnLoad ? 'unsaved' : 'idle');
    setIsEditingInfo(false);
  }, [app?.id]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const isDirty = hasUnsavedNotes || isEditingInfo;

  const performSaveNotes = React.useCallback(
    async (notesToSave: string) => {
      const currentAppId = appIdRef.current;
      if (!currentAppId) return;
      if (notesToSave === lastSavedNotesRef.current) {
        setHasUnsavedNotes(false);
        setSaveStatus('idle');
        return;
      }

      const seq = ++saveSeqRef.current;
      setSaveStatus('saving');
      setIsSavingNotes(true);
      const savePromise = (async () => {
        try {
          await onUpdateApp(currentAppId, {
            notes: notesToSave.trim(),
            updatedAt: new Date().toISOString(),
          });
          if (seq === saveSeqRef.current) {
            lastSavedNotesRef.current = notesToSave;
            setHasUnsavedNotes(false);
            setSaveStatus('saved');
            clearNoteDraft(currentAppId);
            setShowSavedToast(true);
            setTimeout(() => setShowSavedToast(false), 2500);
            setTimeout(() => {
              setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
            }, 3000);
          }
        } catch (err) {
          console.error('Failed to auto-save notes:', err);
          if (seq === saveSeqRef.current) {
            setSaveStatus('unsaved');
          }
        } finally {
          if (seq === saveSeqRef.current) {
            setIsSavingNotes(false);
            inFlightSaveRef.current = null;
          }
        }
      })();
      inFlightSaveRef.current = savePromise;
      await savePromise;
    },
    [onUpdateApp]
  );

  const handleNotesChange = React.useCallback(
    (val: string) => {
      setNotes(val);
      latestNotesRef.current = val;
      const isDifferent = val !== lastSavedNotesRef.current;
      setHasUnsavedNotes(isDifferent);

      if (isDifferent) {
        setSaveStatus('unsaved');
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        // 3000ms debounce to protect Firebase quota while ensuring safe background saves
        saveTimerRef.current = setTimeout(() => {
          performSaveNotes(latestNotesRef.current);
        }, 3000);
      } else {
        setSaveStatus('idle');
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
      }
    },
    [performSaveNotes]
  );

  const handleSaveNotes = React.useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await performSaveNotes(latestNotesRef.current);
  }, [performSaveNotes]);

  const handleRequestClose = React.useCallback(async () => {
    // If editing top metadata, prompt before discarding
    if (isEditingInfo) {
      setShowUnsavedPrompt(true);
      return;
    }

    // Immediately flush any pending debounced notes to Firestore on modal close
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (inFlightSaveRef.current) {
      try {
        await inFlightSaveRef.current;
      } catch {
        /* ignore in-flight error during close flush */
      }
    }

    if (latestNotesRef.current !== lastSavedNotesRef.current && appIdRef.current) {
      const flushingAppId = appIdRef.current;
      try {
        await onUpdateApp(flushingAppId, {
          notes: latestNotesRef.current.trim(),
          updatedAt: new Date().toISOString(),
        });
        clearNoteDraft(flushingAppId);
        lastSavedNotesRef.current = latestNotesRef.current;
      } catch {
        // Keep the draft on failure so the next open can recover it
      }
    }

    onClose();
  }, [isEditingInfo, onClose, onUpdateApp]);

  useEscapeKey(handleRequestClose, Boolean(app) && !showUnsavedPrompt);

  if (!app) return null;

  const daysInStage = calculateDaysInStage(app.stageUpdatedAt);
  const completedTasksCount = app.tasks ? app.tasks.filter((t) => t.completed).length : 0;
  const totalTasksCount = app.tasks ? app.tasks.length : 0;

  // Status & Info handlers
  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!app || newStatus === app.status) return;
    const now = new Date().toISOString();
    await onUpdateApp(app.id, { status: newStatus, stageUpdatedAt: now, updatedAt: now });
  };

  const handleSaveInfo = async (updates: Partial<Application>) => {
    if (!app) return;
    await onUpdateApp(app.id, updates);
    setIsEditingInfo(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    onShowToast?.('success', 'Application updated');
  };

  const handleDelete = async () => {
    if (!app) return;
    onClose();
    await onDeleteApp(app.id);
  };

  // Task handlers
  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = (app.tasks || []).map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    await onUpdateApp(app.id, { tasks: updatedTasks, updatedAt: new Date().toISOString() });
  };

  const handleEditTask = async (taskId: string, updatedFields: Partial<ApplicationTask>) => {
    const updatedTasks = (app.tasks || []).map((t) => (t.id === taskId ? { ...t, ...updatedFields } : t));
    await onUpdateApp(app.id, { tasks: updatedTasks, updatedAt: new Date().toISOString() });
  };

  const handleAddTask = async (title: string, dueDate?: string) => {
    const newTask: ApplicationTask = { id: `task-${Date.now()}`, title, completed: false, dueDate };
    await onUpdateApp(app.id, { tasks: [...(app.tasks || []), newTask], updatedAt: new Date().toISOString() });
    onShowToast?.('success', 'Task added', title);
  };

  const handleDeleteTask = async (taskId: string) => {
    const deletedTask = (app.tasks || []).find((t) => t.id === taskId);
    const updatedTasks = (app.tasks || []).filter((t) => t.id !== taskId);
    await onUpdateApp(app.id, {
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });

    if (deletedTask) {
      onShowToast?.('info', `Task deleted (${deletedTask.title})`, undefined, {
        label: 'Undo',
        onClick: async () => {
          await onUpdateApp(app.id, {
            tasks: [...(app.tasks || []), deletedTask],
            updatedAt: new Date().toISOString(),
          });
          onShowToast?.('success', 'Restored task');
        },
      });
    }
  };

  // Contact handlers
  const handleSaveContact = async (contactData: Partial<Contact>, editingId?: string | null) => {
    let updatedContacts: Contact[];
    if (editingId) {
      updatedContacts = (app.contacts || []).map((c) => (c.id === editingId ? ({ ...c, ...contactData } as Contact) : c));
    } else {
      const newContact: Contact = {
        id: `c-${Date.now()}`,
        name: contactData.name || 'Contact',
        role: contactData.role,
        email: contactData.email,
        phone: contactData.phone,
        linkedIn: contactData.linkedIn,
        notes: contactData.notes,
      };
      updatedContacts = [...(app.contacts || []), newContact];
    }
    const updates: Partial<Application> = { contacts: updatedContacts, updatedAt: new Date().toISOString() };
    if (!app.contactEmail && contactData.email) {
      updates.contactEmail = contactData.email;
    }
    await onUpdateApp(app.id, updates);
    onShowToast?.('success', editingId ? 'Contact updated' : 'Contact added', contactData.name || 'Contact');
  };

  const handleDeleteContact = async (contactId: string) => {
    const deletedContact = (app.contacts || []).find((c) => c.id === contactId);
    const updatedContacts = (app.contacts || []).filter((c) => c.id !== contactId);
    await onUpdateApp(app.id, {
      contacts: updatedContacts,
      updatedAt: new Date().toISOString(),
    });

    if (deletedContact) {
      onShowToast?.('info', `Contact deleted (${deletedContact.name})`, undefined, {
        label: 'Undo',
        onClick: async () => {
          await onUpdateApp(app.id, {
            contacts: [...(app.contacts || []), deletedContact],
            updatedAt: new Date().toISOString(),
          });
          onShowToast?.('success', `Restored ${deletedContact.name}`);
        },
      });
    }
  };

  const handleSaveTemplate = async (templateToSave: Omit<FollowUpTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const saved = await TemplateRepository.saveTemplate(templateToSave, app?.userId);
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
  };

  const handleDeleteTemplate = async (id: string) => {
    await TemplateRepository.deleteTemplate(id, app?.userId);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetDefaults = async () => {
    const resetted = await TemplateRepository.resetDefaultTemplates(app?.userId);
    setTemplates(resetted);
  };

  const handleFollowUpTriggered = async (details: FollowUpTriggerDetails) => {
    if (!app) return;

    const now = new Date().toISOString();

    // 1. Log timeline touchpoint marker (Task T014)
    const historyEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      toStatus: app.status,
      fromStatus: app.status,
      timestamp: now,
      note: `Follow-up sent to ${details.recipientName} (${details.template.title})`,
    };
    const updatedHistory = [...(app.history || []), historyEntry];

    // 2. Inject 5-day reminder task if requested (Task T015)
    let updatedTasks = app.tasks ? [...app.tasks] : [];
    if (details.addReminder) {
      const reminderTask: ApplicationTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: `Follow up with ${details.recipientName} (${app.company})`,
        completed: false,
        dueDate: addBusinessDays(new Date(), 5),
      };
      updatedTasks.push(reminderTask);
    }

    await onUpdateApp(app.id, {
      history: updatedHistory,
      tasks: updatedTasks,
      updatedAt: now,
    });
  };

  // Email handlers
  const handleAddEmailLog = async (emailData: Omit<EmailLog, 'id'>) => {
    if (!app) return;
    const newEmailLog: EmailLog = { id: `email-${Date.now()}`, ...emailData };
    await onUpdateApp(app.id, {
      emails: [...(app.emails || []), newEmailLog],
      updatedAt: new Date().toISOString(),
    });
    onShowToast?.('success', 'Email logged');
  };

  const handleUpdateEmailLog = async (emailId: string, emailData: Partial<Omit<EmailLog, 'id'>>) => {
    const updatedEmails = (app.emails || []).map((e) =>
      e.id === emailId ? { ...e, ...emailData } : e
    );
    await onUpdateApp(app.id, {
      emails: updatedEmails,
      updatedAt: new Date().toISOString(),
    });
    onShowToast?.('success', 'Email log updated');
  };

  const handleDeleteEmailLog = async (emailId: string) => {
    const deletedEmail = (app.emails || []).find((e) => e.id === emailId);
    const updatedEmails = (app.emails || []).filter((e) => e.id !== emailId);
    await onUpdateApp(app.id, {
      emails: updatedEmails,
      updatedAt: new Date().toISOString(),
    });

    if (deletedEmail) {
      onShowToast?.('info', `Deleted "${deletedEmail.subject}"`, undefined, {
        label: 'Undo',
        onClick: async () => {
          await onUpdateApp(app.id, {
            emails: [...(app.emails || []), deletedEmail],
            updatedAt: new Date().toISOString(),
          });
          onShowToast?.('success', `Restored "${deletedEmail.subject}"`);
        },
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={app ? `Application Details - ${app.company}` : 'Application Details'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={handleRequestClose}
    >
      {showUnsavedPrompt && (
        <UnsavedChangesPrompt
          onKeepEditing={() => setShowUnsavedPrompt(false)}
          onDiscardAndExit={() => {
            setShowUnsavedPrompt(false);
            onClose();
          }}
        />
      )}

      <div
        className="w-full max-w-5xl max-h-[92vh] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <ApplicationDetailHeader
          app={app}
          isEditingInfo={isEditingInfo}
          onToggleEditInfo={() => setIsEditingInfo(!isEditingInfo)}
          onStatusChange={handleStatusChange}
          onClose={handleRequestClose}
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isEditingInfo && (
            <ApplicationInfoEditor app={app} onSave={handleSaveInfo} onCancel={() => setIsEditingInfo(false)} />
          )}

          <ApplicationMetricsBar
            platform={app.platform}
            dateApplied={app.dateApplied}
            daysInStage={daysInStage}
            completedTasksCount={completedTasksCount}
            totalTasksCount={totalTasksCount}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-5">
              <TaskChecklistSection
                tasks={app.tasks}
                onToggleTask={handleToggleTask}
                onEditTask={handleEditTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
              />

              <ApplicationNotesSection
                notes={notes}
                onNotesChange={handleNotesChange}
                saveStatus={saveStatus}
                appId={app.id}
                draftNoticeVisible={draftNoticeVisible}
                onDismissDraftNotice={() => {
                  clearNoteDraft(app.id);
                  setDraftNoticeVisible(false);
                }}
              />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-5 space-y-5">
              <ApplicationQuickLinks
                jobLink={app.jobLink}
                emailThreadUrl={app.emailThreadUrl}
                contactEmail={effectiveContact.email}
                contactName={effectiveContact.name}
                company={app.company}
                role={app.role}
                onOpenEditInfo={() => setIsEditingInfo(true)}
                onOpenFollowUp={() => {
                  setFollowUpContact(null);
                  setIsFollowUpModalOpen(true);
                }}
              />

              <EmailLogSection
                emails={app.emails}
                companyName={app.company}
                contactEmail={app.contactEmail}
                contacts={app.contacts}
                allContacts={allContacts}
                currentUserEmail={currentUserEmail}
                onAddEmailLog={handleAddEmailLog}
                onUpdateEmailLog={handleUpdateEmailLog}
                onDeleteEmailLog={handleDeleteEmailLog}
              />

              <ContactManagerSection
                allContacts={allContacts}
                linkedContactIds={app.contactIds || []}
                legacyContacts={app.contacts || []}
                onLinkContact={async (contactId) => {
                  if (onLinkContact) await onLinkContact(contactId, app.id);
                }}
                onUnlinkContact={async (contactId) => {
                  if (onUnlinkContact) await onUnlinkContact(contactId, app.id);
                }}
                onCreateAndLinkContact={async (data) => {
                  if (onCreateAndLinkContact) {
                    await onCreateAndLinkContact(data, app.id);
                  }
                }}
                onUpdateContact={onUpdateContact}
                onSelectContact={onSelectContact}
                onEditContact={onEditContact}
                onFollowUpContact={(contact) => {
                  setFollowUpContact(contact);
                  setIsFollowUpModalOpen(true);
                }}
              />

              <StatusHistoryTimeline
                history={app.history}
                currentStatus={app.status}
                createdAt={app.createdAt}
                stageUpdatedAt={app.stageUpdatedAt}
              />
            </div>
          </div>
        </div>

        <ApplicationDetailFooter
          onDelete={handleDelete}
          onSave={handleSaveNotes}
          hasUnsavedChanges={hasUnsavedNotes}
          isSaving={isSavingNotes}
          showSavedToast={showSavedToast}
        />
      </div>

      {isFollowUpModalOpen && (
        <FollowUpModal
          isOpen={isFollowUpModalOpen}
          app={app}
          allContacts={allContacts}
          initialContactId={followUpContact?.id}
          initialContactEmail={followUpContact?.email || effectiveContact.email}
          templates={templates}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onResetDefaults={handleResetDefaults}
          onFollowUpTriggered={handleFollowUpTriggered}
          onShowToast={(type, title, msg) => onShowToast?.(type, title, msg)}
          onClose={() => {
            setIsFollowUpModalOpen(false);
            setFollowUpContact(null);
          }}
        />
      )}
    </div>
  );
};
