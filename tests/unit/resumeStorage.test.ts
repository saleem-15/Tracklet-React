import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadResume,
  buildResumeStoragePath,
  deleteResumeObject,
} from '../../src/lib/resumeStorage';

// Mock the Firebase SDK surface used by resumeStorage (real SDK not initialized in tests)
vi.mock('../../src/lib/firebase', () => ({
  storage: {},
  ref: vi.fn((_store: unknown, path: string) => ({ path })),
  uploadBytesResumable: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from '../../src/lib/firebase';

interface MockTask {
  on: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  snapshot: { ref: unknown };
}

function makeTask(): MockTask {
  let captured: { next?: (snap: unknown) => void; error?: (e: unknown) => void; complete?: () => void } = {};
  const task: MockTask = {
    on: vi.fn((_event: string, next: (snap: unknown) => void, error: (e: unknown) => void, complete: () => void) => {
      captured = { next, error, complete };
      (task as MockTask & { __captured?: typeof captured }).__captured = captured;
    }),
    cancel: vi.fn(),
    snapshot: { ref: { path: 'x' } },
  };
  return task;
}

function getCallbacks(task: MockTask) {
  return (task as MockTask & { __captured?: { next?: (snap: unknown) => void; error?: (e: unknown) => void; complete?: () => void } }).__captured!;
}

describe('resumeStorage (real Cloud Storage upload plumbing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads to the user-isolated path users/{userId}/resumes/{blobId}/{fileName}', () => {
    const task = makeTask();
    vi.mocked(uploadBytesResumable).mockReturnValue(task as never);

    const file = new File(['body'], 'resume.pdf', { type: 'application/pdf' });
    uploadResume('user-1', file, vi.fn());

    expect(ref).toHaveBeenCalledTimes(1);
    const path = vi.mocked(ref).mock.calls[0][1] as string;
    expect(path).toMatch(/^users\/user-1\/resumes\/[0-9a-f-]{36}\/resume\.pdf$/);
    expect(buildResumeStoragePath('user-1', 'blob-9', 'cv.pdf')).toBe('users/user-1/resumes/blob-9/cv.pdf');
    expect(uploadBytesResumable).toHaveBeenCalledWith(expect.anything(), file);
  });

  it('reports real progress percentages from transfer snapshots', async () => {
    const task = makeTask();
    vi.mocked(uploadBytesResumable).mockReturnValue(task as never);
    const onProgress = vi.fn();

    const file = new File(['0123456789'], 'resume.pdf', { type: 'application/pdf' }); // 10 bytes
    const handle = uploadResume('user-1', file, onProgress);

    const { next } = getCallbacks(task);
    next!({ bytesTransferred: 25, totalBytes: 100 });
    next!({ bytesTransferred: 100, totalBytes: 100 });
    next!({ bytesTransferred: 5, totalBytes: 0 }); // falls back to file.size (10)

    expect(onProgress).toHaveBeenNthCalledWith(1, 25);
    expect(onProgress).toHaveBeenNthCalledWith(2, 100);
    expect(onProgress).toHaveBeenNthCalledWith(3, 50); // 5/10
    void handle;
  });

  it('resolves with full metadata and a download URL on completion', async () => {
    const task = makeTask();
    vi.mocked(uploadBytesResumable).mockReturnValue(task as never);
    vi.mocked(getDownloadURL).mockResolvedValue('https://storage.example.com/signed-url' as never);

    const file = new File(['0123456789'], 'resume.pdf', { type: 'application/pdf' }); // 10 bytes
    const handle = uploadResume('user-1', file, vi.fn());

    const { complete } = getCallbacks(task);
    complete!();
    const result = await handle.promise;

    expect(result.fileName).toBe('resume.pdf');
    expect(result.fileSize).toBe(10);
    expect(result.uploadedAt).toBeTruthy();
    expect(result.storagePath).toMatch(/^users\/user-1\/resumes\//);
    expect(result.blobId).toBeTruthy();
    expect(result.downloadUrl).toBe('https://storage.example.com/signed-url');
    expect(getDownloadURL).toHaveBeenCalledWith(task.snapshot.ref);
  });

  it('rejects with the original error when the transfer fails', async () => {
    const task = makeTask();
    vi.mocked(uploadBytesResumable).mockReturnValue(task as never);

    const file = new File(['body'], 'resume.pdf', { type: 'application/pdf' });
    const handle = uploadResume('user-1', file, vi.fn());

    const { error } = getCallbacks(task);
    const failure = Object.assign(new Error('storage/unauthorized'), { code: 'storage/unauthorized' });
    error!(failure);

    await expect(handle.promise).rejects.toBe(failure);
  });

  it('cancel() aborts the underlying resumable task', () => {
    const task = makeTask();
    vi.mocked(uploadBytesResumable).mockReturnValue(task as never);

    const file = new File(['body'], 'resume.pdf', { type: 'application/pdf' });
    const handle = uploadResume('user-1', file, vi.fn());

    handle.cancel();
    expect(task.cancel).toHaveBeenCalledTimes(1);
  });

  it('deletes the stored object when the download URL cannot be resolved', async () => {
    const task = makeTask();
    vi.mocked(uploadBytesResumable).mockReturnValue(task as never);
    vi.mocked(getDownloadURL).mockRejectedValue(new Error('url unavailable') as never);

    const file = new File(['body'], 'resume.pdf', { type: 'application/pdf' });
    const handle = uploadResume('user-1', file, vi.fn());

    const { complete } = getCallbacks(task);
    complete!();

    await expect(handle.promise).rejects.toThrow('url unavailable');
    // The completed transfer must not be orphaned in storage
    expect(deleteObject).toHaveBeenCalledWith(task.snapshot.ref);
  });

  it('deleteResumeObject deletes the object at the given path', async () => {
    await deleteResumeObject('users/user-1/resumes/blob-9/cv.pdf');
    expect(ref).toHaveBeenCalledWith(expect.anything(), 'users/user-1/resumes/blob-9/cv.pdf');
    expect(deleteObject).toHaveBeenCalledTimes(1);
  });
});
