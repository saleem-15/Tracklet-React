# ApplicationRepository Interface Contract

**Location**: `src/lib/applicationRepository.ts`  
**Purpose**: Unified persistence contract for Tracklet applications and history.

```typescript
import { Application, ApplicationStatus } from '../types';

export interface IApplicationRepository {
  /**
   * Load applications from Firestore if authenticated, or localStorage if guest.
   * Does NOT auto-seed fake records for new accounts.
   */
  loadApplications(userId?: string): Promise<Application[]>;

  /**
   * Add a new application. Persists to Firestore if authenticated, localStorage if guest.
   */
  addApplication(
    newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>,
    userId?: string
  ): Promise<Application>;

  /**
   * Update an existing application.
   */
  updateApplication(
    id: string,
    updates: Partial<Application>,
    userId?: string
  ): Promise<Partial<Application>>;

  /**
   * Delete an application.
   */
  deleteApplication(id: string, userId?: string): Promise<void>;

  /**
   * Bulk update status for multiple applications.
   */
  batchUpdateStatus(
    ids: string[],
    newStatus: ApplicationStatus,
    userId?: string
  ): Promise<void>;

  /**
   * Bulk delete multiple applications.
   */
  batchDelete(ids: string[], userId?: string): Promise<void>;

  /**
   * Batch import applications (used for CSV import and Guest Migration).
   */
  batchImport(
    apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[],
    userId?: string
  ): Promise<Application[]>;

  /**
   * Explicitly load or reload sample demo dataset.
   */
  seedDemoData(userId?: string): Promise<Application[]>;

  /**
   * Permanently purge all user applications and history records from Firestore (GDPR).
   */
  purgeUserData(userId: string): Promise<void>;
}
```
