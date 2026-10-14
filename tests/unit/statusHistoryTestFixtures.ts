import { Application } from '../../src/types';

export const mockStandardHiringApp: Application = {
  id: 'test-app-1',
  userId: 'test-user',
  company: 'Linear',
  role: 'Senior Frontend Engineer',
  platform: 'LinkedIn',
  workLocation: 'Remote',
  employmentType: 'Full-time',
  location: 'San Francisco, CA / Remote',
  dateApplied: '2026-09-15',
  status: 'Offer',
  stageUpdatedAt: '2026-10-12T10:00:00Z',
  createdAt: '2026-09-15T10:00:00Z',
  updatedAt: '2026-10-12T10:00:00Z',
  notes: 'Spoke with Karri and Tuomas. Received written offer letter with equity package.',
  history: [
    {
      id: 'h1',
      fromStatus: 'Saved',
      toStatus: 'Applied',
      timestamp: '2026-09-15T10:00:00Z',
      note: 'Tailored resume submitted',
    },
    {
      id: 'h2',
      fromStatus: 'Applied',
      toStatus: 'Screening',
      timestamp: '2026-09-25T10:00:00Z',
      note: 'Recruiter phone sync',
    },
    {
      id: 'h3',
      fromStatus: 'Screening',
      toStatus: 'Interview',
      timestamp: '2026-09-30T10:00:00Z',
      note: 'Technical loop completed',
    },
    {
      id: 'h4',
      fromStatus: 'Interview',
      toStatus: 'Offer',
      timestamp: '2026-10-12T10:00:00Z',
      note: 'Formal offer extended',
    },
  ],
};

export const mockAccidentalMisclickApp: Application = {
  id: 'test-app-2',
  userId: 'test-user',
  company: 'Vercel',
  role: 'Staff DX Engineer',
  platform: 'Company Site',
  workLocation: 'Remote',
  employmentType: 'Full-time',
  location: 'Remote',
  dateApplied: '2026-09-20',
  status: 'Rejected', // Accidentally marked as Rejected
  stageUpdatedAt: '2026-10-13T12:00:00Z',
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-10-13T12:00:00Z',
  history: [
    {
      id: 'm1',
      fromStatus: 'Saved',
      toStatus: 'Applied',
      timestamp: '2026-09-20T10:00:00Z',
    },
    {
      id: 'm2',
      fromStatus: 'Applied',
      toStatus: 'Screening',
      timestamp: '2026-09-27T10:00:00Z',
    },
    {
      id: 'm3',
      fromStatus: 'Screening',
      toStatus: 'Interview',
      timestamp: '2026-10-04T10:00:00Z',
    },
    {
      id: 'm4',
      fromStatus: 'Interview',
      toStatus: 'Rejected',
      timestamp: '2026-10-13T12:00:00Z',
      note: 'Accidental drag to Rejected',
    },
  ],
};
