# Interface Contract: Candidate Profile & Resume Storage

**Feature Directory**: `specs/008-extension-companion-redesign`  
**Date**: 2026-10-05  
**Spec Reference**: [`spec.md`](../spec.md)

---

## 1. Candidate Profile Storage Schema (`chrome.storage.sync`)

- **Storage Key**: `tracklet_candidate_profile_v1`
- **Fallback**: Automatically falls back to `chrome.storage.local` if `chrome.storage.sync` quota exceeds or user is signed out.

```json
{
  "tracklet_candidate_profile_v1": {
    "id": "cand_9f3a1e20",
    "fullName": "Sarah Connor",
    "firstName": "Sarah",
    "lastName": "Connor",
    "email": "sarah.connor@example.com",
    "phone": "+1 (555) 234-5678",
    "location": "Los Angeles, CA",
    "linkedInUrl": "https://www.linkedin.com/in/sarah-connor",
    "githubUrl": "https://github.com/sarah-connor",
    "portfolioUrl": "https://sarahconnor.dev",
    "targetTitle": "Senior Systems Engineer",
    "workAuthorization": "Authorized to work in US without restriction",
    "preferredResumeName": "Sarah_Connor_Resume_2026.pdf",
    "updatedAt": "2026-10-05T15:00:00.000Z"
  }
}
```

---

## 2. IndexedDB Tailored Resume Storage Schema

To avoid the 1MB Firestore document limit and Chrome storage quota ceilings, full resume file binaries (PDF/DOCX) are stored in an IndexedDB database dedicated to the extension companion.

- **Database Name**: `TrackletExtensionDB`
- **Version**: `1`
- **Object Store**: `tailored_resumes`
- **Primary Key**: `blobId` (string UUID)

```typescript
export interface StoredResumeBlob {
  blobId: string;                     // e.g. "res_blob_stripe_20261005"
  applicationId?: string;             // Associated Tracklet application ID
  fileName: string;                   // Original file name (e.g. "Sarah_Stripe_Custom.pdf")
  fileSize: number;                   // Size in bytes
  mimeType: string;                   // "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  fileData: Blob;                     // Binary file payload
  uploadedAt: string;                 // ISO 8601 timestamp
}
```

**IndexedDB Storage Operations**:
- `saveResumeBlob(storedResume: StoredResumeBlob): Promise<string>`
- `getResumeBlob(blobId: string): Promise<StoredResumeBlob | null>`
- `deleteResumeBlob(blobId: string): Promise<boolean>`
- `exportResumeAsDataUrl(blobId: string): Promise<string>`
