import { ApplicationStatus, JobPlatform } from '../types';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
];

export const TERMINAL_STATUSES: ApplicationStatus[] = [
  'Rejected',
  'Archived',
];

export const JOB_PLATFORMS: JobPlatform[] = [
  'LinkedIn',
  'Indeed',
  'Lever',
  'Greenhouse',
  'Otta',
  'Company Site',
  'Referral',
  'Wellfound',
  'Other',
];

export const PIPELINE_COLUMNS: {
  status: ApplicationStatus;
  title: string;
  dot: string;
  tagBg: string;
}[] = [
  { 
    status: 'Saved', 
    title: 'Saved', 
    dot: 'bg-purple-500',
    tagBg: 'text-purple-700 bg-purple-50'
  },
  { 
    status: 'Applied', 
    title: 'Applied', 
    dot: 'bg-slate-500',
    tagBg: 'text-slate-600 bg-slate-100'
  },
  { 
    status: 'Screening', 
    title: 'Screening Call', 
    dot: 'bg-amber-500',
    tagBg: 'text-amber-700 bg-amber-50'
  },
  { 
    status: 'Interview', 
    title: 'Interview Loop', 
    dot: 'bg-blue-500',
    tagBg: 'text-blue-700 bg-blue-50'
  },
  { 
    status: 'Offer', 
    title: 'Offer Received', 
    dot: 'bg-emerald-500',
    tagBg: 'text-emerald-700 bg-emerald-50'
  },
];

export const STATUS_ACTIVE_STYLES: Record<ApplicationStatus, string> = {
  Saved: 'bg-purple-600 text-white border-purple-600 shadow-purple-500/20 shadow-xs',
  Applied: 'bg-slate-700 text-white border-slate-700 shadow-xs',
  Screening: 'bg-amber-600 text-white border-amber-600 shadow-amber-500/20 shadow-xs',
  Interview: 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20 shadow-xs',
  Offer: 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20 shadow-xs',
  Rejected: 'bg-rose-600 text-white border-rose-600 shadow-rose-500/20 shadow-xs',
  Archived: 'bg-slate-500 text-white border-slate-500 shadow-xs',
};

export const LOCAL_STORAGE_KEYS = {
  GUEST_APPS: 'tracklet_guest_apps_v1',
  EXPIRY_SETTINGS: 'tracklet_expiry_settings_v1',
  SIDEBAR_COLLAPSED: 'tracklet_sidebar_collapsed',
  HISTORY_PREFIX: 'tracklet_history_',
  AUTH_PENDING_EMAIL: 'tracklet_auth_pending_email',
  EMAIL_RESEND_COOLDOWN: 'tracklet_email_resend_cooldown',
};

export const AUTH_PROVIDERS = {
  GOOGLE: 'google.com',
  PASSWORD: 'password',
} as const;

export const EMAIL_VERIFICATION_COOLDOWN_SECONDS = 60;

export const CONTACT_AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-rose-100 text-rose-700 border-rose-200',
];

export function getInitials(name: string): string {
  if (!name || !name.trim()) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const STAGE_CONFIG_MAP: Record<
  ApplicationStatus,
  { label: string; dot: string; bg: string; text: string; border: string; darkBadge: string }
> = {
  Saved: {
    label: 'Saved',
    dot: 'bg-purple-400',
    bg: 'bg-purple-50 hover:bg-purple-100/80',
    text: 'text-purple-700',
    border: 'border-purple-200/80',
    darkBadge: 'bg-purple-500/20 text-purple-200 border-purple-500/30',
  },
  Applied: {
    label: 'Applied',
    dot: 'bg-slate-400',
    bg: 'bg-slate-100 hover:bg-slate-200/80',
    text: 'text-slate-700',
    border: 'border-slate-200/80',
    darkBadge: 'bg-slate-700/60 text-slate-200 border-slate-600/50',
  },
  Screening: {
    label: 'Screening',
    dot: 'bg-amber-400',
    bg: 'bg-amber-50 hover:bg-amber-100/80',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    darkBadge: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  },
  Interview: {
    label: 'Interview',
    dot: 'bg-blue-400',
    bg: 'bg-blue-50 hover:bg-blue-100/80',
    text: 'text-blue-700',
    border: 'border-blue-200/80',
    darkBadge: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  },
  Offer: {
    label: 'Offer',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-50 hover:bg-emerald-100/80',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    darkBadge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  },
  Rejected: {
    label: 'Rejected',
    dot: 'bg-rose-400',
    bg: 'bg-rose-50 hover:bg-rose-100/80',
    text: 'text-rose-700',
    border: 'border-rose-200/80',
    darkBadge: 'bg-rose-500/20 text-rose-200 border-rose-500/30',
  },
  Archived: {
    label: 'Archived',
    dot: 'bg-slate-400',
    bg: 'bg-slate-50 hover:bg-slate-100/80',
    text: 'text-slate-500',
    border: 'border-slate-200/60',
    darkBadge: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
  },
};


