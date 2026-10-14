# Data Model: Contact Email Log & Unified Relations

## 1. Type Definitions

### Extended `EmailLog` Interface (`src/types.ts`)
```ts
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
  contactId?: string;      // Optional ID of associated Contact
  applicationId?: string;  // Optional ID of associated Application
}
```

### Extended `Contact` Interface (`src/types.ts`)
```ts
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
  emails?: EmailLog[];       // Chronological collection of direct email logs
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 2. Derivation & Cross-Visibility Model

### Contact Email Aggregation
For any given contact \(C\) and user applications collection \(\mathcal{A}\):
1. **Direct Emails**: \(E_{\text{direct}} = C.\text{emails} \parallel []\)
2. **Linked Application Emails**:
   \[
   E_{\text{app}} = \bigcup_{A \in \mathcal{A}} \{ e \in A.\text{emails} \mid e.\text{contactId} = C.\text{id} \lor (C.\text{email} \land (e.\text{sender} = C.\text{email} \lor e.\text{recipient} = C.\text{email})) \}
   \]
3. **Aggregated Timeline**:
   \[
   E_{\text{total}} = \text{dedupById}(E_{\text{direct}} \cup E_{\text{app}})
   \]
   Sorted descending by `timestamp || date`.

### Application Email Aggregation
For any given application \(A\):
\[
E_{\text{app-view}} = A.\text{emails} \parallel []
\]
Non-application emails stored in \(C.\text{emails}\) (with no `applicationId` matching \(A.\text{id}\)) are never displayed on application \(A\).

---

## 3. Storage & Persistence Mapping

| Operation | Target Collection | Fields Updated |
|---|---|---|
| Log direct contact email | `users/{userId}/contacts/{contactId}` or `tracklet_guest_contacts` | `emails: [...current, newEmail]`, `updatedAt` |
| Log company email for contact | `users/{userId}/applications/{appId}` or `tracklet_guest_applications` | `emails: [...current, { ...newEmail, contactId, applicationId }]`, `updatedAt` |
| Edit direct contact email | `users/{userId}/contacts/{contactId}` | `emails: updatedEmails`, `updatedAt` |
| Edit company email | `users/{userId}/applications/{appId}` | `emails: updatedEmails`, `updatedAt` |
| Delete direct contact email | `users/{userId}/contacts/{contactId}` | `emails: filteredEmails`, `updatedAt` |
| Delete company email | `users/{userId}/applications/{appId}` | `emails: filteredEmails`, `updatedAt` |
