# Data Model: Tester Issue & Feedback Reporting

**Branch**: `feat/tester-issue-reporting` | **Feature**: `009-tester-issue-reporting` | **Date**: 2026-10-07

## Overview

Defines the TypeScript interfaces, Firestore collection structure, and validation rules for the tester bug and feedback reporting system.

---

## 1. Core Interfaces & Types

```typescript
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
  viewport: string;           // e.g. "1440x900"
  devicePixelRatio: number;   // e.g. 1.25 or 2
  authMode: 'authenticated' | 'guest';
  userId?: string;            // Present if authenticated
  timestamp: string;          // ISO 8601
  recentErrors: string[];     // Last 3 sanitized console errors/warnings
}

export interface TesterAttachment {
  id: string;
  fileName: string;
  mediaType: string;          // e.g. "image/webp", "image/png"
  fileSizeBytes: number;
  dataUrl?: string;           // Client-side preview base64
  storageUrl?: string;        // Firebase Storage download URL
  source: 'clipboard_paste' | 'file_upload';
}

export interface TesterIssueReport {
  id: string;                 // Format: "TRK-BUG-1728300000" or UUID
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
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}

export type CreateTesterReportInput = Omit<
  TesterIssueReport, 
  'id' | 'status' | 'githubIssueNumber' | 'githubIssueUrl' | 'createdAt' | 'updatedAt'
>;
```

---

## 2. Storage Mapping & Persistence

### A. Firestore Storage
- **Collection**: `tester_feedback`
- **Document ID**: Auto-generated report ID (e.g. `TRK-BUG-1728300000`)
- **Document Payload**:
  ```json
  {
    "id": "TRK-BUG-1728300000",
    "type": "bug",
    "title": "Kanban card disappears after drag-and-drop",
    "description": "I moved a card from Applied to Screening and it vanished until I refreshed.",
    "severity": "high",
    "reporterName": "Alex Tester",
    "reporterEmail": "alex@example.com",
    "status": "new",
    "githubIssueNumber": 42,
    "githubIssueUrl": "https://github.com/saleem-15/Tracklet-React/issues/42",
    "diagnostics": {
      "appVersion": "1.2.0",
      "activeTab": "pipeline",
      "url": "https://tracklet.vercel.app/?tab=pipeline",
      "browser": "Chrome 128.0",
      "os": "Windows 11",
      "viewport": "1920x1080",
      "devicePixelRatio": 1,
      "authMode": "guest",
      "timestamp": "2026-10-07T14:15:00.000Z",
      "recentErrors": ["TypeError: Cannot read properties of undefined (reading 'stage')"]
    },
    "attachments": [
      {
        "id": "att-1",
        "fileName": "screenshot.webp",
        "mediaType": "image/webp",
        "fileSizeBytes": 142850,
        "storageUrl": "https://firebasestorage.googleapis.com/.../screenshot.webp",
        "source": "clipboard_paste"
      }
    ],
    "createdAt": "2026-10-07T14:15:00.000Z",
    "updatedAt": "2026-10-07T14:15:00.000Z"
  }
  ```

### B. Local Draft Persistence (`localStorage`)
- **Key**: `tracklet_tester_report_draft`
- **Purpose**: Preserves unsubmitted form fields (category, title, description, severity, attached images) across browser refreshes or accidental tab dismissals, preventing lost feedback.

---

## 3. Validation Rules

| Field | Rule | Error Feedback |
| :--- | :--- | :--- |
| `type` | Required, one of `'bug'`, `'visual_glitch'`, `'feature_request'`, `'general_feedback'` | "Please select a category." |
| `title` | Required, string, trimmed length between 3 and 120 characters | "Title must be between 3 and 120 characters." |
| `description` | Required, string, trimmed length between 10 and 2000 characters | "Please provide at least 10 characters describing the issue." |
| `severity` | Required, one of `'low'`, `'medium'`, `'high'`, `'blocker'`, defaults to `'medium'` | "Please select a severity." |
| `reporterEmail` | Optional; if present, must match standard email regex | "Please enter a valid email address." |
| `attachments` | Max 2 images per report; each image $\le$ 2MB; formats: PNG, JPEG, WebP | "Screenshots must be PNG, JPEG, or WebP and under 2MB." |
