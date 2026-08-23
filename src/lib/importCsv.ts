import { Application, ApplicationStatus, JobPlatform, WorkLocation, EmploymentType } from '../types';

/**
 * Robust RFC 4180 compliant CSV parser
 * Handles quotes, commas inside quotes, escaped quotes (""), and newlines inside quoted strings.
 */
export function parseRawCSV(csvText: string): string[][] {
  const cleanText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped double quote inside quoted text
        currentVal += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Column delimiter
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if (char === '\n' && !insideQuotes) {
      // Row delimiter
      currentRow.push(currentVal.trim());
      // Ignore completely empty lines
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface CSVFieldMapping {
  company: number;
  role: number;
  platform: number;
  workLocation: number;
  employmentType: number;
  dateApplied: number;
  status: number;
  jobLink: number;
  notes: number;
  contactEmail: number;
  location: number;
  salary: number;
}

export function autoDetectFieldMapping(headers: string[]): CSVFieldMapping {
  const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizedHeaders = headers.map(normalizeHeader);

  const findIdx = (keywords: string[]): number => {
    return normalizedHeaders.findIndex((h) =>
      keywords.some((kw) => h === kw || h.includes(kw))
    );
  };

  return {
    company: findIdx(['company', 'organization', 'employer', 'companyname']),
    role: findIdx(['role', 'jobtitle', 'title', 'position', 'job', 'roletext']),
    platform: findIdx(['platform', 'source', 'jobboard', 'site', 'channel', 'portal']),
    workLocation: findIdx(['worklocation', 'workplacetype', 'worktype', 'workmodel', 'workarrangement', 'remotestatus']),
    employmentType: findIdx(['employmenttype', 'jobtype', 'employementtype']),
    dateApplied: findIdx(['dateapplied', 'applieddate', 'date', 'applicationdate', 'appliedon']),
    status: findIdx(['status', 'stage', 'applicationstatus', 'state', 'progress']),
    jobLink: findIdx(['joblink', 'joblistingurl', 'url', 'link', 'joburl', 'website', 'posting']),
    notes: findIdx(['notes', 'comments', 'description', 'note', 'details', 'remarks']),
    contactEmail: findIdx(['contactemail', 'email', 'recruiteremail', 'contact']),
    location: findIdx(['location', 'city', 'address', 'workplace', 'remote']),
    salary: findIdx(['salary', 'pay', 'compensation', 'rate', 'range']),
  };
}

export function normalizeCSVStatus(raw: string): ApplicationStatus {
  if (!raw) return 'Applied';
  const clean = raw.trim().toLowerCase();

  if (clean.includes('offer') || clean.includes('accepted')) return 'Offer';
  if (clean.includes('interview') || clean.includes('technical') || clean.includes('onsite') || clean.includes('round')) return 'Interview';
  if (clean.includes('screen') || clean.includes('recruiter') || clean.includes('phone') || clean.includes('assessment') || clean.includes('hr')) return 'Screening';
  if (clean.includes('reject') || clean.includes('declined') || clean.includes('passed') || clean.includes('closed') || clean.includes('unsuccessful')) return 'Rejected';
  if (clean.includes('archive') || clean.includes('withdraw') || clean.includes('saved') || clean.includes('inactive')) return 'Archived';
  return 'Applied';
}

export function normalizeCSVPlatform(raw: string): JobPlatform {
  if (!raw) return 'LinkedIn';
  const clean = raw.trim().toLowerCase();

  if (clean.includes('linkedin')) return 'LinkedIn';
  if (clean.includes('indeed')) return 'Indeed';
  if (clean.includes('lever')) return 'Lever';
  if (clean.includes('greenhouse')) return 'Greenhouse';
  if (clean.includes('otta')) return 'Otta';
  if (clean.includes('referral') || clean.includes('friend') || clean.includes('network')) return 'Referral';
  if (clean.includes('wellfound') || clean.includes('angel')) return 'Wellfound';
  if (clean.includes('company') || clean.includes('careers') || clean.includes('website') || clean.includes('direct')) return 'Company Site';
  return 'Other';
}

/**
 * Maps free-text workplace values ("WFH", "on-site", "Hybrid Remote", ...) to
 * a WorkLocation. Returns undefined for unrecognized input so callers can omit the field.
 */
export function normalizeCSVWorkLocation(raw: string): WorkLocation | undefined {
  if (!raw) return undefined;
  const clean = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return undefined;

  if (clean.startsWith('hybrid')) return 'Hybrid';
  if ((clean.startsWith('part') || clean.startsWith('most')) && clean.endsWith('remote')) return 'Hybrid';
  const isNegatedRemote = clean.includes('notremote') || clean.includes('nolongerremote') || clean.includes('nonremote');
  if (
    !isNegatedRemote &&
    (clean === 'remote' ||
      clean === 'wfh' ||
      clean === 'anywhere' ||
      clean.endsWith('remote') ||
      clean.includes('workfromhome') ||
      clean.includes('homeoffice'))
  ) {
    return 'Remote';
  }
  if (clean === 'onsite' || clean === 'inoffice' || clean === 'inperson' || clean === 'office' || clean === 'atoffice') return 'Onsite';
  return undefined;
}

/**
 * Maps free-text employment values ("full time", "FT", "c2c", "co-op", ...) to
 * an EmploymentType. Returns undefined for unrecognized input.
 */
export function normalizeCSVEmploymentType(raw: string): EmploymentType | undefined {
  if (!raw) return undefined;
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return undefined;

  if (clean.startsWith('fulltime') || clean === 'ft' || clean === 'permanent' || clean === 'salaried') return 'Full-time';
  if (clean.startsWith('parttime') || clean === 'pt') return 'Part-time';
  if (clean.startsWith('contract') || clean === 'c2c' || clean === 'freelance' || clean.startsWith('temp') || clean === '1099') return 'Contract';
  if (clean.startsWith('internship') || clean === 'intern' || clean === 'trainee' || clean === 'coop') return 'Internship';
  return undefined;
}

export function normalizeCSVDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const clean = raw.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Handle standard JS Date parsing safely without UTC offset shift
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().slice(0, 10);
}

export function downloadSampleCSVTemplate() {
  const sampleCSV = `Company,Role,Platform,Work Location,Employment Type,Job Location,Date Applied,Status,Job Listing URL,Notes
Linear,Senior Frontend Engineer,LinkedIn,Hybrid,Full-time,San Francisco CA,2026-07-20,Interview,https://linear.app/careers/fe-eng,"Great recruiter phone screen on Monday. Technical round scheduled."
Stripe,Full Stack Developer,Company Site,Remote,Full-time,"Seattle, WA",2026-07-18,Screening,https://stripe.com/jobs/dev,"Submitted resume via company portal."
OpenAI,AI Product Engineer,Referral,Onsite,Contract,"San Francisco, CA",2026-07-25,Applied,https://openai.com/careers,"Referred by Alex from engineering team."
Supabase,Support Engineer,Lever,Remote,Part-time,Remote,2026-07-26,Applied,https://supabase.com/careers,"Fully remote company with async culture."`;

  const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'tracklet_job_applications_sample_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
