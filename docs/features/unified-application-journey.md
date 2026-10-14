# Feature Specification: Unified Application Journey (Holistic Activity Stream)

> **Status**: Future Roadmap Candidate  
> **Origin**: Explored during Status History Redesign (Variant D)  
> **Target Release**: Future Major Milestone  
> **Related Epics**: Activity Logs, Multi-Channel Communications, Timeline Intelligence  

---

## 1. Executive Summary & Vision

Today, Tracklet tracks candidate data across segregated sections inside the application drawer:
1. **Status History**: Logs status changes and stage dwell time (`Applied -> Screening -> Interview -> Offer`).
2. **Email Logs**: Logs outbound & inbound correspondence via the Gmail/Outlook Webmail Companion.
3. **Tasks Checklist**: Tracks preparation items, take-home assignments, and reminders.
4. **Notes Surface**: Rich text notes and interview retrospectives.

While this segmentation works well for editing individual attributes, it fractures the chronological narrative of a job application. A job search is not purely a sequence of stage transitions; it is an organic, multi-channel journey consisting of recruiter emails, phone screenings, scheduled assignments, and feedback.

The **Unified Application Journey** aggregates all disparate candidate events into a single, beautifully organized chronological spine stream. It allows the candidate to see the complete narrative of their candidacy from first outreach to signed offer.

---

## 2. Core User Stories

- **US-1 (Holistic Narrative)**: As a candidate reviewing an application active for 3+ weeks, I want to see when I applied, what emails were exchanged, when I completed the technical assessment, and when I advanced stages in one unified view.
- **US-2 (Category Filtering)**: As a candidate, I want to quickly filter the timeline to view only recruiter communications (`Emails`), only workflow milestones (`Stages`), or only actionable to-dos (`Tasks`) without losing timeline context.
- **US-3 (Deep Linking)**: When reviewing an email or task in the timeline, I want one-click access to open the original thread or toggle the task status.
- **US-4 (Recruiter Touchpoint Proof)**: When preparing for an interview round, I want to glance at the full sequence of prior interactions in chronological order so I never miss critical context.

---

## 3. Architecture & Normalization Data Model

The Unified Journey normalizes heterogeneous sub-entities (`StatusHistoryEntry`, `EmailLog`, `ApplicationTask`) into a polymorphic stream without requiring breaking changes to Firestore schemas.

### Event Normalization Schema

```typescript
export type UnifiedEventType = 'status' | 'email' | 'task' | 'touchpoint';

export interface UnifiedEvent<T = any> {
  id: string;
  type: UnifiedEventType;
  timestamp: string; // ISO 8601 string for universal chronological sorting
  title: string;
  data: T;
}
```

### Event Mapping Rules

| Entity Source | Event Type | Marker Icon & Color | Primary Label | Metadata / Action |
| :--- | :--- | :--- | :--- | :--- |
| `app.history[]` | `'status'` | Semantic Dot (`STAGE_CONFIG_MAP`) | Destination Stage (e.g. `Interview`) | Dwell duration, transition date, inline note quote |
| `app.emails[]` | `'email'` | Mail icon (Indigo) | Email subject | Direction badge (`Sent` / `Received`), Sender/Recipient, snippet, webmail deep link |
| `app.tasks[]` | `'task'` | CheckSquare (Emerald / Amber) | Task title | Completion state (`Completed` / `Pending`), Due date |
| `Follow-up Sent` | `'touchpoint'`| Send icon (Blue) | Follow-up touchpoint | Recruiter name, template name |

---

## 4. UI/UX Design Specifications

1. **Continuous Spine Geometry**:
   - Single 1px vertical spine at `left-[11px]`.
   - Distinct 24px icon badges positioned over the spine indicating event categories.
2. **Category Filter Header**:
   - Segmented filter pill group (`All (N)`, `Stages (N)`, `Emails (N)`, `Tasks (N)`).
   - Instant client-side filtering with badge counters.
3. **Card Micro-interactions**:
   - Rest: `bg-slate-50/50 border-slate-200/80`
   - Hover: `bg-slate-50/90 transition-colors`
   - Outbound links to external email threads open in a secure new tab (`target="_blank" rel="noopener noreferrer"`).
4. **Accessibility (WCAG AA)**:
   - High-contrast text labels (`text-slate-800` / `text-slate-900`).
   - Semantic tags and ARIA roles for screen readers.

---

## 5. Implementation Reference Code

Below is the complete, tested, production-ready React component developed during the prototype lab. When implementing this feature in the future, developers can drop this component into `src/components/detail/` and integrate it as a dedicated tab or toggle in `ApplicationDetailPanel.tsx`.

```tsx
import React, { useState, useMemo } from 'react';
import {
  Activity,
  Mail,
  CheckSquare,
  Square,
  ArrowRight,
  Send,
  Inbox,
  ExternalLink,
  Calendar,
  Layers,
} from 'lucide-react';
import { ApplicationStatus, StatusHistoryEntry, EmailLog, ApplicationTask } from '../../types';
import { STAGE_CONFIG_MAP } from '../../lib/constants';
import { StatusBadge } from '../StatusBadge';

export interface UnifiedActivityTimelineProps {
  history?: StatusHistoryEntry[];
  currentStatus: ApplicationStatus;
  emails?: (EmailLog | any)[];
  tasks?: (ApplicationTask | any)[];
  createdAt?: string;
  onToggleTask?: (taskId: string, completed: boolean) => void;
}

type ActivityFilter = 'ALL' | 'STATUS' | 'EMAIL' | 'TASK';

interface UnifiedEvent {
  id: string;
  type: 'status' | 'email' | 'task';
  timestamp: string;
  data: any;
}

function formatTimelineTimestamp(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return `${d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} · ${d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  } catch {
    return isoString;
  }
}

export const UnifiedActivityTimeline: React.FC<UnifiedActivityTimelineProps> = ({
  history = [],
  currentStatus,
  emails = [],
  tasks = [],
  createdAt,
  onToggleTask,
}) => {
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('ALL');

  // Build unified event stream
  const allEvents = useMemo<UnifiedEvent[]>(() => {
    const list: UnifiedEvent[] = [];

    // 1. Status history entries
    if (history.length > 0) {
      history.forEach((h, idx) => {
        list.push({
          id: h.id || `hist-${idx}`,
          type: 'status',
          timestamp: h.timestamp || createdAt || new Date().toISOString(),
          data: h,
        });
      });
    }

    // 2. Emails logged
    emails.forEach((em, idx) => {
      const emailTime =
        em.timestamp || (em.date ? `${em.date}T12:00:00Z` : createdAt || new Date().toISOString());
      list.push({
        id: em.id || `email-${idx}`,
        type: 'email',
        timestamp: emailTime,
        data: em,
      });
    });

    // 3. Application Tasks
    tasks.forEach((tk, idx) => {
      const taskTime = tk.dueDate ? `${tk.dueDate}T09:00:00Z` : createdAt || new Date().toISOString();
      list.push({
        id: tk.id || `task-${idx}`,
        type: 'task',
        timestamp: taskTime,
        data: tk,
      });
    });

    // Sort descending (newest first)
    return list.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return (isNaN(tA) ? 0 : tA) < (isNaN(tB) ? 0 : tB) ? 1 : -1;
    });
  }, [history, currentStatus, emails, tasks, createdAt]);

  const counts = useMemo(() => {
    return {
      all: allEvents.length,
      status: allEvents.filter((e) => e.type === 'status').length,
      email: allEvents.filter((e) => e.type === 'email').length,
      task: allEvents.filter((e) => e.type === 'task').length,
    };
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'STATUS') return allEvents.filter((e) => e.type === 'status');
    if (activeFilter === 'EMAIL') return allEvents.filter((e) => e.type === 'email');
    if (activeFilter === 'TASK') return allEvents.filter((e) => e.type === 'task');
    return allEvents;
  }, [allEvents, activeFilter]);

  return (
    <div className="space-y-3">
      {/* Header and Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          Unified Application Journey
        </h3>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('STATUS')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
              activeFilter === 'STATUS'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stages ({counts.status})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('EMAIL')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
              activeFilter === 'EMAIL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Emails ({counts.email})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('TASK')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
              activeFilter === 'TASK'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tasks ({counts.task})
          </button>
        </div>
      </div>

      {/* Vertical Spine Stream Container */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 font-mono space-y-1">
            <Layers className="w-5 h-5 mx-auto text-slate-400 mb-2" />
            <p>No activity logged for this category yet.</p>
          </div>
        ) : (
          <div className="relative pl-7 space-y-4 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-px before:bg-slate-200">
            {filteredEvents.map((event) => {
              return (
                <div key={event.id} className="relative flex items-start group">
                  {/* Event Marker Node */}
                  <div className="absolute -left-7 top-1 w-6 h-6 flex items-center justify-center">
                    {event.type === 'status' && (
                      <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shadow-2xs ring-2 ring-white">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            STAGE_CONFIG_MAP[event.data.toStatus as ApplicationStatus]?.dot || 'bg-blue-500'
                          }`}
                        />
                      </div>
                    )}
                    {event.type === 'email' && (
                      <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-2xs ring-2 ring-white">
                        <Mail className="w-3 h-3" />
                      </div>
                    )}
                    {event.type === 'task' && (
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shadow-2xs ring-2 ring-white ${
                          event.data.completed
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-amber-50 border-amber-200 text-amber-600'
                        }`}
                      >
                        {event.data.completed ? (
                          <CheckSquare className="w-3 h-3" />
                        ) : (
                          <Square className="w-3 h-3" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Event Content Card */}
                  <div className="w-full bg-slate-50/50 hover:bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 transition-colors">
                    {/* Status Change Event */}
                    {event.type === 'status' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {event.data.fromStatus ? (
                              <>
                                <StatusBadge status={event.data.fromStatus} size="sm" />
                                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                <StatusBadge status={event.data.toStatus} size="sm" />
                              </>
                            ) : (
                              <>
                                <span className="text-[11px] font-mono text-slate-500">Stage:</span>
                                <StatusBadge status={event.data.toStatus} size="sm" />
                              </>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatTimelineTimestamp(event.timestamp)}
                          </span>
                        </div>
                        {event.data.note && (
                          <p className="text-xs text-slate-600 pt-0.5">{event.data.note}</p>
                        )}
                      </div>
                    )}

                    {/* Email Event */}
                    {event.type === 'email' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                              {event.data.subject || 'Email Logged'}
                            </span>
                            {event.data.direction === 'outbound' && (
                              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Send className="w-2.5 h-2.5" /> Sent
                              </span>
                            )}
                            {event.data.direction === 'inbound' && (
                              <span className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Inbox className="w-2.5 h-2.5" /> Received
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatTimelineTimestamp(event.timestamp)}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                          {event.data.sender && (
                            <span>
                              From: <strong className="text-slate-700">{event.data.sender}</strong>
                            </span>
                          )}
                          {event.data.recipient && (
                            <span>
                              To: <strong className="text-slate-700">{event.data.recipient}</strong>
                            </span>
                          )}
                        </div>

                        {event.data.snippet && (
                          <p className="text-xs text-slate-500 italic line-clamp-2 pt-0.5">
                            &ldquo;{event.data.snippet}&rdquo;
                          </p>
                        )}

                        {event.data.emailUrl && (
                          <div className="pt-1">
                            <a
                              href={event.data.emailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <span>View Email Thread</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Task Event */}
                    {event.type === 'task' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                event.data.completed ? 'text-slate-500 line-through' : 'text-slate-800'
                              }`}
                            >
                              {event.data.title}
                            </span>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={Boolean(event.data.completed)}
                              onClick={() => onToggleTask?.(event.data.id, !event.data.completed)}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                event.data.completed
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60 font-bold hover:bg-emerald-100'
                                  : 'text-amber-700 bg-amber-50 border-amber-200/60 font-medium hover:bg-amber-100'
                              }`}
                            >
                              {event.data.completed ? 'Completed' : 'Pending'}
                            </button>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatTimelineTimestamp(event.timestamp)}
                          </span>
                        </div>
                        {event.data.dueDate && (
                          <p className="text-[11px] font-mono text-slate-500">
                            Due Date: {event.data.dueDate}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
```
