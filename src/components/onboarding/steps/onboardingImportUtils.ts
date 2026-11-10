import { Application } from '../../../types';
import { 
  parseRawCSV, 
  autoDetectFieldMapping, 
  normalizeCSVStatus, 
  normalizeCSVPlatform, 
  normalizeCSVWorkLocation, 
  normalizeCSVEmploymentType, 
  normalizeCSVDate 
} from '../../../lib/importCsv';

export interface ParsedCSVResult {
  apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[];
  detectedColumns: string[];
}

export function parseCSVContentToApplications(content: string): ParsedCSVResult {
  const rows = parseRawCSV(content);
  if (rows.length < 2) {
    throw new Error('Please select a CSV with a header row and at least one data row.');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const mapping = autoDetectFieldMapping(headers);

  const detectedColumns = headers.filter((_, idx) =>
    Object.values(mapping).some((mIdx) => mIdx === idx)
  );

  const apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[] = [];

  for (const row of dataRows) {
    const company = mapping.company >= 0 ? row[mapping.company]?.trim() : '';
    const role = mapping.role >= 0 ? row[mapping.role]?.trim() : '';

    if (!company && !role) continue;

    const finalCompany = company || 'Untitled Company';
    const finalRole = role || 'Untitled Role';

    const platform = mapping.platform >= 0 ? normalizeCSVPlatform(row[mapping.platform]) : 'LinkedIn';
    const workLocation = mapping.workLocation >= 0 ? normalizeCSVWorkLocation(row[mapping.workLocation]) : undefined;
    const employmentType = mapping.employmentType >= 0 ? normalizeCSVEmploymentType(row[mapping.employmentType]) : undefined;
    const location = mapping.location >= 0 ? row[mapping.location]?.trim() : undefined;
    const dateApplied = mapping.dateApplied >= 0 ? normalizeCSVDate(row[mapping.dateApplied]) : new Date().toISOString().slice(0, 10);
    const status = mapping.status >= 0 ? normalizeCSVStatus(row[mapping.status]) : 'Applied';
    const jobLink = mapping.jobLink >= 0 ? row[mapping.jobLink]?.trim() : undefined;
    const emailThreadUrl = mapping.emailThreadUrl >= 0 ? row[mapping.emailThreadUrl]?.trim() : undefined;
    const contactEmail = mapping.contactEmail >= 0 ? row[mapping.contactEmail]?.trim() : undefined;
    const notes = mapping.notes >= 0 ? row[mapping.notes]?.trim() : undefined;
    const resumeFileName = mapping.resumeFileName != null && mapping.resumeFileName >= 0 ? row[mapping.resumeFileName]?.trim() : undefined;

    let companyDomain: string | undefined = undefined;
    if (jobLink) {
      try {
        const host = new URL(jobLink).hostname.replace(/^www\./, '');
        if (host && host.includes('.')) {
          companyDomain = host;
        }
      } catch {
        // ignore domain extraction error
      }
    }

    apps.push({
      company: finalCompany,
      companyDomain,
      role: finalRole,
      platform,
      workLocation,
      employmentType,
      location,
      dateApplied,
      status,
      jobLink: jobLink || undefined,
      emailThreadUrl: emailThreadUrl || undefined,
      contactEmail: contactEmail || undefined,
      notes: notes || undefined,
      resumeFileName: resumeFileName || undefined,
    });
  }

  return { apps, detectedColumns };
}
