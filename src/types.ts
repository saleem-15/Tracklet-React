export type ApplicationStatus = 
  | 'Wishlist'
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

export interface Contact {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  notes?: string;
}

export interface ApplicationTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
}

export interface Application {
  id: string;
  userId: string;
  company: string;
  role: string;
  platform: JobPlatform;
  dateApplied: string; // YYYY-MM-DD
  status: ApplicationStatus;
  jobLink?: string;
  notes?: string;
  contactEmail?: string;
  contacts?: Contact[];
  tasks?: ApplicationTask[];
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
  dateRange: 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | '7days' | '30days' | '60days';
}

export interface SortState {
  field: SortField;
  order: SortOrder;
}

export type ActiveTab = 'all' | 'pipeline' | 'stats' | 'settings';

export interface ExpiryNotificationSettings {
  enabled: boolean;
  expiryThresholdHours: number; // default 48
}
