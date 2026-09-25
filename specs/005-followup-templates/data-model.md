# Data Model: Follow-Up Templates & Engine

**Feature**: 005-followup-templates | **Date**: 2026-09-05

## Entity Definitions

### 1. `FollowUpTemplate`

Represents an outreach or check-in email template available across applications and contact cards.

```typescript
export type FollowUpCategory = 
  | 'Post-Application'
  | 'Interview'
  | 'Offer'
  | 'Networking'
  | 'Custom';

export interface FollowUpTemplate {
  id: string;
  userId?: string;             // Owner userId (undefined for guest defaults)
  title: string;              // e.g. "Post-Application Check-In"
  subject: string;            // e.g. "Following up on {role} application - {company}"
  body: string;               // Plaintext / Markdown body with {placeholders}
  category: FollowUpCategory;
  isBuiltIn?: boolean;        // True for system defaults
  order?: number;             // Sort index in picker
  createdAt?: string;         // ISO timestamp
  updatedAt?: string;         // ISO timestamp
}
```

### 2. Built-In Default Templates

The system ships with 4 default templates stored in `src/lib/constants.ts`:

```typescript
export const DEFAULT_FOLLOWUP_TEMPLATES: Omit<FollowUpTemplate, 'id'>[] = [
  {
    title: 'Post-Application Check-In',
    category: 'Post-Application',
    subject: 'Following up on {role} application - {company}',
    body: `Hi {contactName},

I hope you're having a great week.

I recently submitted my application for the {role} role at {company} on {dateApplied}, and I wanted to check in and reiterate my strong enthusiasm for joining the team.

Given my background and interest in {company}'s mission, I would love the opportunity to speak with you or the team about how my experience aligns with your goals.

Please let me know if there are any additional materials, portfolio samples, or references I can provide.

Thank you for your time and consideration!

Best regards,`,
    isBuiltIn: true,
    order: 1,
  },
  {
    title: 'Post-Interview Thank You',
    category: 'Interview',
    subject: 'Thank you for your time today — {role} ({company})',
    body: `Hi {contactName},

Thank you so much for taking the time to speak with me today regarding the {role} position at {company}.

I really enjoyed our conversation, especially learning more about your team's current challenges and upcoming priorities. Our discussion reaffirmed my excitement about the role and what we could build together.

Please let me know if you need any follow-up information or additional code/design samples from my end.

Looking forward to hearing about the next steps!

Best regards,`,
    isBuiltIn: true,
    order: 2,
  },
  {
    title: '1-Week Status Inquiry',
    category: 'Interview',
    subject: 'Following up on {role} interview — {company}',
    body: `Hi {contactName},

I hope you've had a productive week.

I'm following up to see if there are any updates regarding the {role} position following our conversation last week. 

I remain very interested in the opportunity to join {company} and would be delighted to provide any further details that could assist in your decision-making process.

Thanks again for your time and guidance throughout this process!

Best regards,`,
    isBuiltIn: true,
    order: 3,
  },
  {
    title: 'Offer Negotiation / Discussion',
    category: 'Offer',
    subject: 'Regarding the {role} offer — {company}',
    body: `Hi {contactName},

Thank you again for extending the offer to join {company} as {role}. I am genuinely excited about the work the team is doing and the opportunity to contribute.

I have thoroughly reviewed the offer details. Before making a final decision, I would appreciate the opportunity to discuss a few specific items regarding compensation and team alignment.

Could we find 15 minutes for a quick call this week?

Thank you again for your support throughout this process!

Best regards,`,
    isBuiltIn: true,
    order: 4,
  },
];
```

### 3. Application Touchpoint Marker

Recorded into `app.history` as a StatusHistoryEntry or interaction milestone:

```typescript
export interface StatusHistoryEntry {
  id: string;
  toStatus: ApplicationStatus;
  fromStatus?: ApplicationStatus;
  timestamp: string;
  note?: string; // e.g. "Sent follow-up to Karla Lindqvist (Post-Interview Thank You)"
}
```
