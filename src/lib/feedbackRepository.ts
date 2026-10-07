import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  isFirebaseConfigured 
} from './firebase';
import { 
  TesterIssueReport, 
  CreateTesterReportInput 
} from '../types';
import { STORAGE_KEY_TESTER_DRAFT } from './constants';
import { sanitizeForFirestore } from './firestoreUtils';

const STORAGE_KEY_SUBMITTED_REPORTS = 'tracklet_tester_submitted_reports';
const DEFAULT_REPO = 'saleem-15/Tracklet-React';

export class FeedbackRepository {
  /**
   * Generates a unique, human-friendly tracking ID (e.g. TRK-BUG-482910).
   */
  static generateReportId(): string {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `TRK-BUG-${randomSuffix}`;
  }

  /**
   * Saves a new tester issue report to Firestore and local backup cache.
   */
  static async saveReport(input: CreateTesterReportInput): Promise<TesterIssueReport> {
    const id = this.generateReportId();
    const now = new Date().toISOString();

    const report: TesterIssueReport = {
      ...input,
      id,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };

    // 1. Persist to Firestore if configured
    if (isFirebaseConfigured) {
      try {
        const feedbackCol = collection(db, 'tester_feedback');
        const docRef = doc(feedbackCol, id);
        await setDoc(docRef, sanitizeForFirestore({ ...report } as Record<string, unknown>));
      } catch (err) {
        console.warn('[FeedbackRepository] Could not write to Firestore (persisting locally):', err);
      }
    }

    // 2. Persist to local cache for offline recovery and history
    this.saveToLocalCache(report);

    // 3. Clear draft from localStorage upon successful save
    this.clearDraft();

    return report;
  }

  /**
   * Dispatches the report to the Vercel serverless function `/api/report-issue`.
   * If the endpoint is unavailable (e.g., in local Vite dev), falls back smoothly to local URL generation.
   */
  static async dispatchToApi(
    report: TesterIssueReport, 
    repo = DEFAULT_REPO
  ): Promise<{ success: boolean; issueNumber?: number; issueUrl?: string; fallbackUrl?: string }> {
    try {
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: report.type,
          title: report.title,
          description: report.description,
          severity: report.severity,
          reporterName: report.reporterName,
          reporterEmail: report.reporterEmail,
          diagnostics: report.diagnostics,
          screenshotUrl: report.attachments[0]?.storageUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          issueNumber: data.issueNumber,
          issueUrl: data.issueUrl,
        };
      } else {
        const errorText = await response.text();
        console.warn(`[FeedbackRepository] /api/report-issue error (${response.status}):`, errorText);
      }
    } catch (err) {
      console.warn('[FeedbackRepository] API call failed, using fallback:', err);
    }

    // Fallback: Return pre-filled GitHub Issue URL template
    return {
      success: false,
      fallbackUrl: this.generateGitHubIssueUrl(report, repo),
    };
  }

  /**
   * Generates a pre-filled GitHub Issue URL template.
   */
  static generateGitHubIssueUrl(report: TesterIssueReport, repo = DEFAULT_REPO): string {
    const baseUrl = `https://github.com/${repo}/issues/new`;
    const title = encodeURIComponent(report.title);
    const labels = encodeURIComponent(['bug', 'tester-feedback', `severity: ${report.severity}`].join(','));
    const body = encodeURIComponent(this.formatGitHubIssueMarkdown(report));

    return `${baseUrl}?title=${title}&labels=${labels}&body=${body}`;
  }

  /**
   * Formats a clean Markdown document for the GitHub issue description.
   */
  static formatGitHubIssueMarkdown(report: TesterIssueReport): string {
    const { diagnostics } = report;
    const errorRows = diagnostics.recentErrors.length > 0
      ? diagnostics.recentErrors.map(e => `\`\`\`text\n${e}\n\`\`\``).join('\n')
      : '_None detected_';

    const screenshotMarkdown = report.attachments.length > 0 && report.attachments[0].storageUrl
      ? `\n### Visual Evidence\n![Tester Screenshot](${report.attachments[0].storageUrl})\n`
      : '';

    return `## ${report.title}

### Description
${report.description}
${screenshotMarkdown}
### Reporter
- **Name:** ${report.reporterName || 'Anonymous Tester'}
- **Email:** ${report.reporterEmail || 'Not provided'}
- **Tracking ID:** \`${report.id}\`
- **Severity:** \`${report.severity.toUpperCase()}\`
- **Category:** \`${report.type}\`

### Diagnostic Environment
| Attribute | Value |
| :--- | :--- |
| **Page Route / Tab** | \`${diagnostics.activeTab}\` (\`${diagnostics.url}\`) |
| **Browser** | ${diagnostics.browser} |
| **Operating System** | ${diagnostics.os} |
| **Viewport Size** | ${diagnostics.viewport} (DPR: ${diagnostics.devicePixelRatio}) |
| **Auth Mode** | ${diagnostics.authMode}${diagnostics.userId ? ` (\`${diagnostics.userId}\`)` : ''} |
| **Timestamp** | ${diagnostics.timestamp} |

### Recent Console Errors
${errorRows}
`;
  }

  /**
   * Loads submitted reports from Firestore or local storage.
   */
  static async loadReports(): Promise<TesterIssueReport[]> {
    if (isFirebaseConfigured) {
      try {
        const feedbackCol = collection(db, 'tester_feedback');
        const q = query(feedbackCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const reports: TesterIssueReport[] = [];
        querySnapshot.forEach((docSnap) => {
          reports.push(docSnap.data() as TesterIssueReport);
        });

        if (reports.length > 0) return reports;
      } catch (err) {
        console.warn('[FeedbackRepository] Could not fetch Firestore reports:', err);
      }
    }

    return this.loadFromLocalCache();
  }

  /**
   * Saves partial report draft to localStorage.
   */
  static saveDraft(draft: Partial<CreateTesterReportInput>): void {
    try {
      localStorage.setItem(STORAGE_KEY_TESTER_DRAFT, JSON.stringify(draft));
    } catch (e) {
      console.error('[FeedbackRepository] Failed saving draft:', e);
    }
  }

  /**
   * Loads partial report draft from localStorage.
   */
  static loadDraft(): Partial<CreateTesterReportInput> | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TESTER_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Clears report draft from localStorage.
   */
  static clearDraft(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_TESTER_DRAFT);
    } catch (e) {
      console.error('[FeedbackRepository] Failed clearing draft:', e);
    }
  }

  private static saveToLocalCache(report: TesterIssueReport): void {
    try {
      const existing = this.loadFromLocalCache();
      const updated = [report, ...existing.filter((r) => r.id !== report.id)].slice(0, 50);
      localStorage.setItem(STORAGE_KEY_SUBMITTED_REPORTS, JSON.stringify(updated));
    } catch (e) {
      console.error('[FeedbackRepository] Failed saving to local cache:', e);
    }
  }

  private static loadFromLocalCache(): TesterIssueReport[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUBMITTED_REPORTS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}
