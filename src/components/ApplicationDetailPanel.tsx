import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus, Contact, ApplicationTask, EmailLog } from '../types';
import { calculateDaysInStage } from '../lib/sampleData';
import { ApplicationDetailHeader } from './detail/ApplicationDetailHeader';
import { ApplicationDetailFooter } from './detail/ApplicationDetailFooter';
import { ApplicationInfoEditor } from './detail/ApplicationInfoEditor';
import { ApplicationMetricsBar } from './detail/ApplicationMetricsBar';
import { TaskChecklistSection } from './detail/TaskChecklistSection';
import { ContactManagerSection } from './detail/ContactManagerSection';
import { EmailLogSection } from './detail/EmailLogSection';
import { StatusHistoryTimeline } from './detail/StatusHistoryTimeline';
import { UnsavedChangesPrompt } from './detail/UnsavedChangesPrompt';
import { ApplicationNotesSection } from './detail/ApplicationNotesSection';
import { ApplicationQuickLinks } from './detail/ApplicationQuickLinks';

export interface ApplicationDetailPanelProps {
  app: Application | null;
  onClose: () => void;
  onUpdateApp: (id: string, updates: Partial<Application>) => Promise<void>;
  onDeleteApp: (id: string) => Promise<void>;
}

export const ApplicationDetailPanel: React.FC<ApplicationDetailPanelProps> = ({
  app,
  onClose,
  onUpdateApp,
  onDeleteApp,
}) => {
  const [notes, setNotes] = useState(app?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  useEffect(() => {
    if (!app) return;
    setNotes(app.notes || '');
    setHasUnsavedNotes(false);
    setIsEditingInfo(false);
  }, [app?.id, app?.notes]);

  const isDirty = hasUnsavedNotes || isEditingInfo;

  const handleRequestClose = () => {
    if (isDirty) setShowUnsavedPrompt(true);
    else onClose();
  };

  useEffect(() => {
    if (!app) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUnsavedPrompt) setShowUnsavedPrompt(false);
        else handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [app, showUnsavedPrompt, isDirty]);

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
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    setHasUnsavedNotes(val !== (app?.notes || ''));
  };

  const handleSaveNotes = async () => {
    if (!app) return;
    setIsSavingNotes(true);
    await onUpdateApp(app.id, { notes: notes.trim(), updatedAt: new Date().toISOString() });
    setIsSavingNotes(false);
    setHasUnsavedNotes(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleDelete = async () => {
    if (!app) return;
    if (confirm(`Delete application for ${app.company} – ${app.role}?`)) {
      await onDeleteApp(app.id);
      onClose();
    }
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
  };

  const handleDeleteTask = async (taskId: string) => {
    await onUpdateApp(app.id, {
      tasks: (app.tasks || []).filter((t) => t.id !== taskId),
      updatedAt: new Date().toISOString(),
    });
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
  };

  const handleDeleteContact = async (contactId: string) => {
    await onUpdateApp(app.id, {
      contacts: (app.contacts || []).filter((c) => c.id !== contactId),
      updatedAt: new Date().toISOString(),
    });
  };

  // Email handlers
  const handleAddEmailLog = async (emailData: Omit<EmailLog, 'id'>) => {
    const newEmailLog: EmailLog = { id: `email-${Date.now()}`, ...emailData };
    await onUpdateApp(app.id, {
      emails: [...(app.emails || []), newEmailLog],
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div
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
                hasUnsavedNotes={hasUnsavedNotes}
                onNotesChange={handleNotesChange}
                onSaveNotes={handleSaveNotes}
              />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-5 space-y-5">
              <ApplicationQuickLinks
                jobLink={app.jobLink}
                contactEmail={app.contactEmail}
                onOpenEditInfo={() => setIsEditingInfo(true)}
              />

              <EmailLogSection
                emails={app.emails}
                contactEmail={app.contactEmail}
                onAddEmailLog={handleAddEmailLog}
              />

              <ContactManagerSection
                contacts={app.contacts}
                onSaveContact={handleSaveContact}
                onDeleteContact={handleDeleteContact}
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
          onSaveNotes={handleSaveNotes}
          hasUnsavedNotes={hasUnsavedNotes}
          isSavingNotes={isSavingNotes}
          showSavedToast={showSavedToast}
        />
      </div>
    </div>
  );
};
