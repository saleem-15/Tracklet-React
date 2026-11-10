import React, { useState, useEffect } from 'react';
import { JobPlatform, WorkLocation, EmploymentType, ApplicationStatus, Application, Contact, ApplicationTask } from '../types';
import { AddApplicationHeader } from './add-modal/AddApplicationHeader';
import { AddApplicationCoreForm } from './add-modal/AddApplicationCoreForm';
import { AddApplicationMetadataForm } from './add-modal/AddApplicationMetadataForm';
import { AddApplicationTasksSection } from './add-modal/AddApplicationTasksSection';
import { AddApplicationContactsSection } from './add-modal/AddApplicationContactsSection';
import { AddApplicationNotesSection } from './add-modal/AddApplicationNotesSection';
import { AddApplicationFooter } from './add-modal/AddApplicationFooter';
import { UnsavedChangesPrompt } from './detail/UnsavedChangesPrompt';
import { Modal } from './Modal';

export interface AddApplicationModalProps {
  isOpen: boolean;
  allContacts?: Contact[];
  onClose: () => void;
  onAdd: (newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>) => Promise<void>;
  onCreateContact?: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
}

export const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  isOpen,
  allContacts = [],
  onClose,
  onAdd,
  onCreateContact,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [company, setCompany] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [role, setRole] = useState('');
  const [platform, setPlatform] = useState<JobPlatform>('LinkedIn');
  const [workLocation, setWorkLocation] = useState<WorkLocation | ''>('');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('');
  const [jobLocation, setJobLocation] = useState('');
  const [dateApplied, setDateApplied] = useState(todayStr);
  const [status, setStatus] = useState<ApplicationStatus>('Saved');
  const [jobLink, setJobLink] = useState('');
  const [emailThreadUrl, setEmailThreadUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  const isDirty =
    company.trim() !== '' ||
    role.trim() !== '' ||
    notes.trim() !== '' ||
    jobLink.trim() !== '' ||
    emailThreadUrl.trim() !== '' ||
    workLocation !== '' ||
    employmentType !== '' ||
    jobLocation.trim() !== '' ||
    contacts.length > 0 ||
    tasks.length > 0;

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const resetForm = React.useCallback(() => {
    setCompany('');
    setCompanyDomain('');
    setRole('');
    setPlatform('LinkedIn');
    setWorkLocation('');
    setEmploymentType('');
    setJobLocation('');
    setDateApplied(todayStr);
    setStatus('Saved');
    setJobLink('');
    setEmailThreadUrl('');
    setNotes('');
    setContacts([]);
    setTasks([]);
    setShowUnsavedPrompt(false);
  }, [todayStr]);

  // Contact Handlers
  const handleAddContact = (contact: Contact) => {
    setContacts((prev) => (prev.some((c) => c.id === contact.id) ? prev : [...prev, contact]));
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
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleEditTask = (id: string, updatedFields: Partial<ApplicationTask>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextCompleted = updatedFields.completed !== undefined ? updatedFields.completed : t.completed;
          let completedAt = t.completedAt;
          if (updatedFields.completed !== undefined) {
            completedAt = updatedFields.completed
              ? (updatedFields.completedAt || t.completedAt || new Date().toISOString())
              : undefined;
          } else if (updatedFields.completedAt !== undefined) {
            completedAt = updatedFields.completedAt;
          }
          return { ...t, ...updatedFields, completed: nextCompleted, completedAt };
        }
        return t;
      })
    );
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

    let formattedThreadUrl = emailThreadUrl.trim();
    if (formattedThreadUrl && !formattedThreadUrl.startsWith('http://') && !formattedThreadUrl.startsWith('https://')) {
      formattedThreadUrl = `https://${formattedThreadUrl}`;
    }

    const primaryContactEmail = contacts.find((c) => c.email)?.email || undefined;

    const payload = {
      company: company.trim(),
      companyDomain: companyDomain.trim() || undefined,
      role: role.trim(),
      platform,
      workLocation: workLocation || undefined,
      employmentType: employmentType || undefined,
      location: jobLocation.trim() || undefined,
      dateApplied: dateApplied || todayStr,
      status,
      jobLink: formattedJobLink || undefined,
      emailThreadUrl: formattedThreadUrl || undefined,
      contactEmail: primaryContactEmail,
      contactIds: contacts.map((c) => c.id),
      tasks: tasks.length > 0 ? tasks : undefined,
      notes: notes.trim() || undefined,
    };

    // Optimistic UI close (form is safely reset when exit animation finishes via onExitComplete)
    onClose();

    onAdd(payload).catch((err) => {
      console.error('Failed to create application:', err);
    });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        ariaLabel="Add Job Application"
        maxWidthClassName="max-w-4xl"
        className="max-h-[92vh] flex flex-col"
        closeOnEscape={!showUnsavedPrompt}
        onExitComplete={resetForm}
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
                  emailThreadUrl={emailThreadUrl}
                  onEmailThreadUrlChange={setEmailThreadUrl}
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
                  workLocation={workLocation}
                  onWorkLocationChange={setWorkLocation}
                  employmentType={employmentType}
                  onEmploymentTypeChange={setEmploymentType}
                  jobLocation={jobLocation}
                  onJobLocationChange={setJobLocation}
                />

                <AddApplicationContactsSection
                  contacts={contacts}
                  allContacts={allContacts}
                  onAddContact={handleAddContact}
                  onRemoveContact={handleRemoveContact}
                  onCreateContact={onCreateContact}
                />
              </div>
            </div>
          </div>

          <AddApplicationFooter
            onCancel={handleRequestClose}
            isSubmitDisabled={!company.trim() || !role.trim()}
          />
        </form>
      </Modal>

      {showUnsavedPrompt && (
        <UnsavedChangesPrompt
          onKeepEditing={() => setShowUnsavedPrompt(false)}
          onDiscardAndExit={() => {
            setShowUnsavedPrompt(false);
            resetForm();
            onClose();
          }}
        />
      )}
    </>
  );
};
