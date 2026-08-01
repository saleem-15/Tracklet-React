import { ApplicationStatus, JobPlatform } from '../types';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Wishlist',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  'Wishlist',
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
    status: 'Wishlist', 
    title: 'Wishlist / Saved', 
    dot: 'bg-purple-500',
    tagBg: 'text-purple-700 bg-purple-50'
  },
  { 
    status: 'Applied', 
    title: 'Applied', 
    dot: 'bg-slate-400',
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
  Wishlist: 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20 shadow-xs',
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
};
