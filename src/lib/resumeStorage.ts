import { storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from './firebase';

/**
 * Resume upload service — real Firebase Cloud Storage transfers.
 *
 * Files land under the user's private, isolated directory
 * (`users/{userId}/resumes/{blobId}/{fileName}`, see docs/PRIVACY_POLICY.md
 * § "Resumes & Career Documents"). Progress is reported from actual
 * `uploadBytesResumable` transfer events — no simulation.
 */

export interface ResumeUploadResult {
  /** Client-generated blob ID, matches the folder segment in storagePath */
  blobId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  /** Full Cloud Storage object path (users/{userId}/resumes/{blobId}/{fileName}) */
  storagePath: string;
  downloadUrl: string;
}

/**
 * Handle returned by an upload starter. The modal awaits `promise` for
 * completion and calls `cancel()` when the user dismisses mid-transfer.
 */
export interface UploadHandle<T = void> {
  promise: Promise<T>;
  cancel: () => void;
}

const RESUME_STORAGE_ROOT = 'resumes';

/** Human-readable file size, e.g. "2.4 MB" / "812 KB" / "14 B". */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function buildResumeStoragePath(userId: string, blobId: string, fileName: string): string {
  return `users/${userId}/${RESUME_STORAGE_ROOT}/${blobId}/${fileName}`;
}

/**
 * Uploads a resume to Cloud Storage with real progress events.
 * Rejections surface the original Firebase Storage error (cancelled tasks
 * reject with a `canceled` code — callers distinguish via their own flag).
 */
export function uploadResume(
  userId: string,
  file: File,
  onProgress: (pct: number) => void
): UploadHandle<ResumeUploadResult> {
  const blobId = crypto.randomUUID();
  const storagePath = buildResumeStoragePath(userId, blobId, file.name);
  const task = uploadBytesResumable(ref(storage, storagePath), file);

  const promise = new Promise<ResumeUploadResult>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || file.size;
        onProgress(Math.min(100, Math.max(0, Math.round((snapshot.bytesTransferred / total) * 100))));
      },
      (error) => reject(error),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          resolve({
            blobId,
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            storagePath,
            downloadUrl,
          });
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Failed to resolve download URL.'));
        }
      }
    );
  });

  return {
    promise,
    cancel: () => {
      task.cancel();
    },
  };
}

/** Deletes a previously uploaded resume object (used by Danger Zone purges). */
export async function deleteResumeObject(storagePath: string): Promise<void> {
  await deleteObject(ref(storage, storagePath));
}
