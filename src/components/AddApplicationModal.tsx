import React, { useState, useEffect } from 'react';
import { JobPlatform, ApplicationStatus, Application, Contact, ApplicationTask } from '../types';
import { AddApplicationHeader } from './add-modal/AddApplicationHeader';
import { AddApplicationCoreForm } from './add-modal/AddApplicationCoreForm';
import { AddApplicationMetadataForm } from './add-modal/AddApplicationMetadataForm';
import { AddApplicationTasksSection } from './add-modal/AddApplicationTasksSection';
import { AddApplicationContactsSection } from './add-modal/AddApplicationContactsSection';
import { AddApplicationNotesSection } from './add-modal/AddApplicationNotesSection';
import { AddApplicationFooter } from './add-modal/AddApplicationFooter';
import { UnsavedChangesPrompt } from './detail/UnsavedChangesPrompt';

export interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>) => Promise<void>;
}

export const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [company, setCompany] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [role, setRole] = useState('');
  const [platform, setPlatform] = useState<JobPlatform>('LinkedIn');
  const [dateApplied, setDateApplied] = useState(todayStr);
  const [status, setStatus] = useState<ApplicationStatus>('Saved');
  const [jobLink, setJobLink] = useState('');
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  const isDirty =
    company.trim() !== '' ||
    role.trim() !== '' ||
    notes.trim() !== '' ||
    jobLink.trim() !== '' ||
    contacts.length > 0 ||
    tasks.length > 0;

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Move focus to first focusable input or button inside dialog
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus when modal closes
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose, isDirty]);

  if (!isOpen) return null;

  // Contact Handlers
  const handleAddContact = (contactData: Omit<Contact, 'id'>) => {
    setContacts((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        ...contactData,
      },
    ]);
  };

  const handleRemoveContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // Task Handlers
  const handleAddTask = (taskData: { title: string; dueDate?: string }) => {
    setTasks((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        title: taskData.title,
        completed: false,
        dueDate: taskData.dueDate,
      },
    ]);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const handleEditTask = (id: string, updatedFields: Partial<ApplicationTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t)));
  };

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    let formattedJobLink = jobLink.trim();
    if (formattedJobLink && !formattedJobLink.startsWith('http://') && !formattedJobLink.startsWith('https://')) {
      formattedJobLink = `https://${formattedJobLink}`;
    }

    const primaryContactEmail = contacts.find((c) => c.email)?.email || undefined;

    const payload = {
      company: company.trim(),
      companyDomain: companyDomain.trim() || undefined,
      role: role.trim(),
      platform,
      dateApplied: dateApplied || todayStr,
      status,
      jobLink: formattedJobLink || undefined,
      contactEmail: primaryContactEmail,
      contacts: contacts.length > 0 ? contacts : undefined,
      tasks: tasks.length > 0 ? tasks : undefined,
      notes: notes.trim() || undefined,
    };

    // Optimistic UI reset & close
    onClose();
    setCompany('');
    setCompanyDomain('');
    setRole('');
    setPlatform('LinkedIn');
    setDateApplied(todayStr);
    setStatus('Saved');
    setJobLink('');
    setNotes('');
    setContacts([]);
    setTasks([]);

    onAdd(payload).catch((err) => {
      console.error('Failed to create application:', err);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={handleRequestClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add Job Application"
        className="w-full max-w-4xl max-h-[92vh] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <AddApplicationHeader
          company={company}
          role={role}
          jobLink={jobLink}
          companyDomain={companyDomain}
          status={status}
          onStatusChange={setStatus}
          onClose={handleRequestClose}
        />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column */}
              <div className="lg:col-span-7 space-y-5">
                <AddApplicationCoreForm
                  company={company}
                  onCompanyChange={setCompany}
                  companyDomain={companyDomain}
                  onCompanyDomainChange={setCompanyDomain}
                  role={role}
                  onRoleChange={setRole}
                  jobLink={jobLink}
                  onJobLinkChange={setJobLink}
                />

                <AddApplicationTasksSection
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onEditTask={handleEditTask}
                  onRemoveTask={handleRemoveTask}
                />

                <AddApplicationNotesSection notes={notes} onNotesChange={setNotes} />
              </div>

              {/* Right Column */}
              <div className="lg:col-span-5 space-y-5">
                <AddApplicationMetadataForm
                  platform={platform}
                  onPlatformChange={setPlatform}
                  dateApplied={dateApplied}
                  onDateAppliedChange={setDateApplied}
                />

                <AddApplicationContactsSection
                  contacts={contacts}
                  onAddContact={handleAddContact}
                  onRemoveContact={handleRemoveContact}
                />
              </div>
            </div>
          </div>

          <AddApplicationFooter
            onCancel={handleRequestClose}
            isSubmitDisabled={!company.trim() || !role.trim()}
          />
        </form>
      </div>

      {showUnsavedPrompt && (
        <UnsavedChangesPrompt
          onKeepEditing={() => setShowUnsavedPrompt(false)}
          onDiscardAndExit={() => {
            setShowUnsavedPrompt(false);
            onClose();
          }}
        />
      )}
    </div>
  );
};
