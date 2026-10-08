export type ApplicationStatus = 
  | 'Saved'
  | 'Applied'
  | 'Screening'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Archived';

export type JobPlatform = 
  | 'LinkedIn'
  | 'Indeed'
  | 'Bayt'
  | 'Lever'
  | 'Greenhouse'
  | 'Otta'
  | 'Company Site'
  | 'Referral'
  | 'Wellfound'
  | 'Other';

export type WorkLocation = 
  | 'Remote'
  | 'Hybrid'
  | 'Onsite';

export type EmploymentType = 
  | 'Full-time'
  | 'Part-time'
  | 'Contract'
  | 'Internship';

export type ContactCategory =
  | 'Mentor'
  | 'Recruiter'
  | 'Hiring Manager'
  | 'Referral'
  | 'Peer / Alumni'
  | 'Other';

export interface Contact {
  id: string;
  userId?: string;
  name: string;
  role?: string;
  organization?: string;
  location?: string;
  category?: ContactCategory;
  email?: string;
  phone?: string;
  linkedIn?: string;
  notes?: string;
  nextFollowUpDate?: string; // YYYY-MM-DD
  applicationIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
}

export interface EmailLog {
  id: string;
  subject: string;
  sender: string;
  recipient?: string;
  date: string;        // YYYY-MM-DD — for display and backward compat
  timestamp?: string;  // ISO 8601 with offset e.g. "2026-09-25T14:35:10+03:00" — for analytics
  direction?: 'inbound' | 'outbound';
  snippet?: string;
  body?: string;
  emailUrl?: string;
}

export interface Application {
  id: string;
  userId: string;
  company: string;
  role: string;
  platform: JobPlatform;
  workLocation?: WorkLocation;
  employmentType?: EmploymentType;
  location?: string;
  dateApplied: string; // YYYY-MM-DD
  status: ApplicationStatus;
  jobLink?: string;
  emailThreadUrl?: string;
  notes?: string;
  contactEmail?: string;
  contactIds?: string[];
  contacts?: Contact[];
  tasks?: ApplicationTask[];
  emails?: EmailLog[];
  history?: StatusHistoryEntry[];
  logoUrl?: string;
  companyDomain?: string;
  stageUpdatedAt: string; // ISO date string or YYYY-MM-DD
  createdAt: string;
  updatedAt: string;

  // Tailored CV Attachment Attributes
  resumeFileName?: string;
  resumeFileSize?: number;
  resumeBlobId?: string;
  resumeUploadedAt?: string;
}

export interface StatusHistoryEntry {
  id: string;
  toStatus: ApplicationStatus;
  fromStatus?: ApplicationStatus;
  timestamp: string; // ISO string timestamp
  note?: string;
}

export type FollowUpCategory = 
  | 'Post-Application'
  | 'Interview'
  | 'Offer'
  | 'Networking'
  | 'Custom';

export interface FollowUpTemplate {
  id: string;
  userId?: string;
  title: string;
  subject: string;
  body: string;
  category: FollowUpCategory;
  isBuiltIn?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type SortField = 'company' | 'role' | 'platform' | 'dateApplied' | 'status' | 'daysInStage';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  search: string;
  platform: JobPlatform | 'All';
  status: ApplicationStatus | 'All' | 'Active';
  workLocation: WorkLocation | 'All';
  employmentType: EmploymentType | 'All';
  dateRange: 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | '7days' | '30days' | '60days';
}

export interface SortState {
  field: SortField;
  order: SortOrder;
}

export type ActiveTab = 'all' | 'pipeline' | 'contacts' | 'stats' | 'settings';

export interface ExpiryNotificationSettings {
  enabled: boolean;
  expiryThresholdHours: number; // default 48
}

export type AuthProviderType = 'google.com' | 'password' | string;

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: AuthProviderType;
  emailVerified: boolean;
  creationTime?: string;
  lastSignInTime?: string;
}

export type AuthViewMode = 'signin' | 'signup' | 'forgot-password';

export interface GuestMigrationPayload {
  guestApplications: Application[];
  count: number;
}

// --- Tester Feedback & Issue Reporting ---
export type TesterReportCategory = 
  | 'bug' 
  | 'visual_glitch' 
  | 'feature_request' 
  | 'general_feedback';

export type TesterReportSeverity = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'blocker';

export type TesterReportStatus = 
  | 'new' 
  | 'under_review' 
  | 'resolved' 
  | 'dismissed';

export interface DiagnosticContext {
  appVersion: string;
  activeTab: string;
  url: string;
  browser: string;
  os: string;
  viewport: string;
  devicePixelRatio: number;
  authMode: 'authenticated' | 'guest';
  userId?: string;
  timestamp: string;
  recentErrors: string[];
}

export interface TesterAttachment {
  id: string;
  fileName: string;
  mediaType: string;
  fileSizeBytes: number;
  dataUrl?: string;
  storageUrl?: string;
  source: 'clipboard_paste' | 'file_upload';
}

export interface TesterIssueReport {
  id: string;
  type: TesterReportCategory;
  title: string;
  description: string;
  severity: TesterReportSeverity;
  reporterName?: string;
  reporterEmail?: string;
  status: TesterReportStatus;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  diagnostics: DiagnosticContext;
  attachments: TesterAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type CreateTesterReportInput = Omit<
  TesterIssueReport, 
  'id' | 'status' | 'githubIssueNumber' | 'githubIssueUrl' | 'createdAt' | 'updatedAt'
>;
