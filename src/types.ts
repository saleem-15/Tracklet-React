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
  emails?: EmailLog[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  completedAt?: string; // ISO 8601 string e.g. "2026-07-25T14:35:10.000Z"
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
  contactId?: string;
  applicationId?: string;
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

export type SettingsPaneId = 
  | 'account'      // Account, Security & Data Portability
  | 'autofill'     // ATS Autofill Profile
  | 'billing'      // Subscription & Billing
  | 'workflow';    // Workflow & Alerts

export interface PipelinePreferences {
  defaultClipStage: 'Saved' | 'Applied';
  stalenessThresholdDays: number; // default 14
  autoArchiveGhostedDays?: number; // default 45
}

export interface SalaryTarget {
  minimumBase?: number;
  targetOTE?: number;
  currency: string;
}

export type NoticePeriodOption = 
  | 'immediate'
  | '2_weeks'
  | '1_month'
  | '2_months'
  | '3_months';

export type RelocationPreference = 
  | 'remote_only'
  | 'willing_to_relocate'
  | 'not_willing'
  | 'negotiable';

export interface CandidateWorkAuth {
  isLegallyAuthorized: boolean;           // "Are you authorized to work in target country without restriction?"
  requiresSponsorship: boolean;           // "Will you now or in future require visa sponsorship?"
  currentStatus?: string;                 // e.g. "Citizen / Permanent Resident", "Employment Visa (H-1B, TN)", etc.
}

export interface CandidateExperienceSnapshot {
  currentTitle?: string;                  // e.g. "Senior Frontend Engineer"
  currentCompany?: string;                // e.g. "Stripe"
  yearsOfExperience?: number;             // e.g. 7
  primaryDiscipline?: string;             // e.g. "Engineering"
}

export interface CandidateLocation {
  city: string;
  stateRegion?: string;
  country: string;
  postalCode?: string;
  formattedLocation?: string;
}

export interface CandidateProfile {
  id?: string;
  // Personal Identity & Contact Information
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string | CandidateLocation;

  // Work Authorization & Availability
  workAuthorization?: string;             // Legacy string fallback
  workAuth?: CandidateWorkAuth;           // Structured booleans for real ATS radios
  noticePeriod?: NoticePeriodOption;
  earliestStartDate?: string;             // YYYY-MM-DD
  relocationPreference?: RelocationPreference;

  // Professional Snapshot & Targeting
  experience?: CandidateExperienceSnapshot;
  targetTitles: string[];
  targetLocations?: string[];
  salaryTarget?: SalaryTarget;

  // Online Presence & Portfolios
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  twitterUrl?: string;

  // ATS Boilerplate Snippets
  bioSnippet?: string;                    // Short elevator pitch
  coverLetterSnippet?: string;            // Standard introduction note
  preferredResumeName?: string;
  defaultResumeId?: string;

  updatedAt?: string;
}

export interface UserPreferences {
  expirySettings: ExpiryNotificationSettings;
  pipelinePreferences: PipelinePreferences;
  uiPreferences?: {
    tableRowDensity?: 'dense' | 'roomy';
    soundEffectsEnabled?: boolean;
    toastDurationSeconds?: number;
  };
  updatedAt: string;
}

export type CommercialPlanType = 
  | 'free'
  | 'pro_monthly'         // $12/mo
  | 'pro_job_hunt_pass';   // $29/3mo

export interface QuotaDimension {
  used: number;
  limit: number | 'unlimited';
  label: string;
  unit: string;
  renewalDate?: string;
}

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

// --- SaaS Entitlements, Plans & Quotas ---
export type PlanTier = 'free' | 'pro';

export type SubscriptionStatus = 
  | 'none' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'trialing';

export interface UserQuotas {
  scrapesUsedThisMonth: number;
  autofillsUsedThisMonth: number;
  quotaResetAt: string; // ISO 8601 string e.g. "2026-11-01T00:00:00.000Z"
}

export interface UserEntitlementProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  stripeCustomerId?: string | null;
  quotas: UserQuotas;
  createdAt: string;
  updatedAt: string;
}

export type PaywallTriggerContext = 
  | 'pipeline_cap' 
  | 'scrape_limit' 
  | 'autofill_limit' 
  | 'feature_gate';

export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerContext: PaywallTriggerContext;
  currentUsage?: number;
  maxQuota?: number;
  onUpgradeClick?: () => void;
}

export interface ExtensionUserSession {
  uid: string;
  email: string | null;
  idToken: string;
  refreshToken: string;
  planTier: PlanTier;
  activeApplicationsCount?: number;
  expiresAt: number; // Unix epoch ms
  syncedAt: number;  // Unix epoch ms
}



// --- Tester Feedback & Issue Reporting ---
export type TesterReportCategory = 
  | 'bug' 
  | 'visual_glitch' 
  | 'feature_request' 
  | 'general_feedback'
  | 'other';

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
  authMode: 'authenticated' | 'unauthenticated';
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

// --- Browser Extension Distribution & Status ---
export type ExtensionStatus = 
  | 'checking' 
  | 'not_installed' 
  | 'connected' 
  | 'update_available';

export interface ExtensionState {
  status: ExtensionStatus;
  installedVersion: string | null;
  latestVersion: string;
  isChecking: boolean;
  lastCheckedAt: number | null;
  recheck: () => Promise<{ status: ExtensionStatus; version: string | null }>;
}

export interface TrackletExtPingMessage {
  type: 'TRACKLET_EXT_PING';
  timestamp: number;
}

export interface TrackletExtPongPayload {
  installed: boolean;
  version: string;
  name: string;
}

export interface TrackletExtPongMessage {
  type: 'TRACKLET_EXT_PONG';
  payload: TrackletExtPongPayload;
}

