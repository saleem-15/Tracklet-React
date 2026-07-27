import { Application, ApplicationTask, ExpiryNotificationSettings } from '../types';

export const SETTINGS_STORAGE_KEY = 'tracklet_expiry_settings_v1';

export const DEFAULT_EXPIRY_SETTINGS: ExpiryNotificationSettings = {
  enabled: true,
  expiryThresholdHours: 48,
};

export function loadExpirySettings(): ExpiryNotificationSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_EXPIRY_SETTINGS.enabled,
        expiryThresholdHours: typeof parsed.expiryThresholdHours === 'number' && parsed.expiryThresholdHours > 0 
          ? parsed.expiryThresholdHours 
          : DEFAULT_EXPIRY_SETTINGS.expiryThresholdHours,
      };
    }
  } catch (err) {
    console.error('Failed to load expiry settings', err);
  }
  return DEFAULT_EXPIRY_SETTINGS;
}

export function saveExpirySettings(settings: ExpiryNotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save expiry settings', err);
  }
}

export interface TaskDueSoonInfo {
  application: Application;
  task: ApplicationTask;
  hoursLeft: number; // Positive = hours until due, Negative = hours overdue
  formattedTimeLeft: string;
}

/**
 * Calculates hours remaining for a task's due date.
 * If task has no dueDate, returns null.
 */
export function getTaskHoursRemaining(dueDateStr?: string, now = new Date()): number | null {
  if (!dueDateStr) return null;
  // Parse date string e.g. "2026-07-28" or ISO string
  const due = new Date(dueDateStr.includes('T') ? dueDateStr : `${dueDateStr}T23:59:59`);
  if (isNaN(due.getTime())) return null;

  const diffMs = due.getTime() - now.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return hours;
}

export function formatHoursLeft(hours: number): string {
  if (hours < 0) {
    const absHours = Math.abs(hours);
    if (absHours < 24) {
      return `${Math.round(absHours)}h overdue`;
    }
    const days = Math.floor(absHours / 24);
    return `${days}d overdue`;
  }
  if (hours < 1) {
    return 'Due in < 1 hour';
  }
  if (hours < 24) {
    return `Due in ${Math.round(hours)}h`;
  }
  const days = Math.round(hours / 24);
  return `Due in ${days}d (${Math.round(hours)}h)`;
}

/**
 * Returns all incomplete tasks due within thresholdHours (or overdue up to 72h)
 */
export function getExpiringSoonTasks(
  applications: Application[],
  thresholdHours: number
): TaskDueSoonInfo[] {
  const result: TaskDueSoonInfo[] = [];
  const now = new Date();

  applications.forEach((app) => {
    if (app.status === 'Archived') return; // Skip archived applications
    if (!app.tasks || app.tasks.length === 0) return;

    app.tasks.forEach((task) => {
      if (task.completed) return; // Skip completed tasks

      const hoursLeft = getTaskHoursRemaining(task.dueDate, now);
      if (hoursLeft !== null) {
        // Due within thresholdHours, or overdue up to 5 days
        if (hoursLeft <= thresholdHours && hoursLeft >= -120) {
          result.push({
            application: app,
            task,
            hoursLeft,
            formattedTimeLeft: formatHoursLeft(hoursLeft),
          });
        }
      }
    });
  });

  // Sort by most urgent (lowest hoursLeft first)
  return result.sort((a, b) => a.hoursLeft - b.hoursLeft);
}

/**
 * Returns unique applications that have tasks due soon
 */
export function getExpiringSoonApplications(
  applications: Application[],
  thresholdHours: number
): Application[] {
  const expiringTasks = getExpiringSoonTasks(applications, thresholdHours);
  const appMap = new Map<string, Application>();
  expiringTasks.forEach((item) => {
    if (!appMap.has(item.application.id)) {
      appMap.set(item.application.id, item.application);
    }
  });
  return Array.from(appMap.values());
}
