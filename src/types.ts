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
  date: string;
  snippet?: string;
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
}

export interface StatusHistoryEntry {
  id: string;
  toStatus: ApplicationStatus;
  fromStatus?: ApplicationStatus;
  timestamp: string; // ISO string timestamp
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
