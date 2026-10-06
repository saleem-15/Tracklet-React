import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Application } from '../../src/types';
import {
  MAX_RESUME_SIZE_BYTES,
  ALLOWED_RESUME_EXTENSIONS,
  formatResumeFileSize,
  sanitizeResumeFileName,
  validateResumeFile,
} from '../../src/lib/tailoredCvUtils';

// Also import the extension IIFE script to ensure it defines globalThis.TrackletResumeStorage
import '../../extension/indexedDbResumeStorage.js';

describe('Tailored CV Metadata, Validation & Storage (US5 / T030)', () => {
  const extensionStorage = (globalThis as any).TrackletResumeStorage;

  describe('File Size & Extension Limits', () => {
    it('enforces maximum 10MB size limit constant', () => {
      expect(MAX_RESUME_SIZE_BYTES).toBe(10 * 1024 * 1024);
      expect(ALLOWED_RESUME_EXTENSIONS).toContain('.pdf');
      expect(ALLOWED_RESUME_EXTENSIONS).toContain('.docx');
      expect(ALLOWED_RESUME_EXTENSIONS).toContain('.doc');
      expect(ALLOWED_RESUME_EXTENSIONS).toContain('.txt');
    });

    it('formats file sizes accurately for display', () => {
      expect(formatResumeFileSize(0)).toBe('0 B');
      expect(formatResumeFileSize(512)).toBe('512 B');
      expect(formatResumeFileSize(1024)).toBe('1 KB');
      expect(formatResumeFileSize(250 * 1024)).toBe('250 KB');
      expect(formatResumeFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
      expect(formatResumeFileSize(10 * 1024 * 1024)).toBe('10 MB');
    });

    it('sanitizes unsafe characters and trims long file names', () => {
      expect(sanitizeResumeFileName('my<bad>:name/file?.pdf')).toBe('my_bad__name_file_.pdf');
      expect(sanitizeResumeFileName('   resume   senior   dev.pdf  ')).toBe('resume senior dev.pdf');
      
      const veryLongName = 'a'.repeat(200) + '.pdf';
      const sanitized = sanitizeResumeFileName(veryLongName);
      expect(sanitized.length).toBeLessThanOrEqual(120);
      expect(sanitized.endsWith('.pdf')).toBe(true);
    });

    it('validates and accepts valid PDF, Word, and text resumes within 10MB', () => {
      const validPdf = { name: 'Saleem_Senior_Frontend_CV.pdf', size: 350 * 1024, type: 'application/pdf' };
      const res = validateResumeFile(validPdf);
      expect(res.valid).toBe(true);
      expect(res.sanitizedName).toBe('Saleem_Senior_Frontend_CV.pdf');
      expect(res.formattedSize).toBe('350 KB');

      const validDocx = { name: 'resume_google_tailored.docx', size: 1.2 * 1024 * 1024, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      expect(validateResumeFile(validDocx).valid).toBe(true);

      const validTxt = { name: 'plain_cv.txt', size: 12 * 1024, type: 'text/plain' };
      expect(validateResumeFile(validTxt).valid).toBe(true);
    });

    it('rejects files exceeding the 10MB limit with a friendly error', () => {
      const oversizedFile = {
        name: 'Huge_Portfolio_Resume.pdf',
        size: 11 * 1024 * 1024, // 11MB
        type: 'application/pdf'
      };
      const res = validateResumeFile(oversizedFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum limit of 10 MB');
    });

    it('rejects empty (0 byte) files and missing payloads', () => {
      expect(validateResumeFile(null as any).valid).toBe(false);
      const emptyFile = { name: 'empty.pdf', size: 0, type: 'application/pdf' };
      const res = validateResumeFile(emptyFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('empty');
    });

    it('rejects unsupported file formats (executable, images, archives)', () => {
      const exeFile = { name: 'virus.exe', size: 50000, type: 'application/x-msdownload' };
      expect(validateResumeFile(exeFile).valid).toBe(false);

      const imageFile = { name: 'resume_photo.jpg', size: 150000, type: 'image/jpeg' };
      const res = validateResumeFile(imageFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported file type');

      const zipFile = { name: 'all_cvs.zip', size: 200000, type: 'application/zip' };
      expect(validateResumeFile(zipFile).valid).toBe(false);
    });
  });

  describe('Extension TrackletResumeStorage Module & IndexedDB Operations', () => {
    let mockStore: Map<string, any>;
    const origIndexedDB = (globalThis as any).indexedDB;

    beforeEach(() => {
      expect(extensionStorage).toBeDefined();
      mockStore = new Map();

      const mockDbInstance = {
        close: vi.fn(),
        objectStoreNames: { contains: vi.fn(() => true) },
        transaction: vi.fn(() => {
          const tx: any = {
            oncomplete: null,
            onerror: null,
            onabort: null,
            objectStore: vi.fn(() => ({
              put: vi.fn((record: any) => {
                mockStore.set(record.blobId, record);
                const req: any = { onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (req.onsuccess) req.onsuccess();
                  if (tx.oncomplete) tx.oncomplete();
                }, 0);
                return req;
              }),
              get: vi.fn((key: string) => {
                const result = mockStore.get(key) || null;
                const req: any = { result, onsuccess: null, onerror: null };
                setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
                return req;
              }),
              delete: vi.fn((key: string) => {
                mockStore.delete(key);
                const req: any = { onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (req.onsuccess) req.onsuccess();
                  if (tx.oncomplete) tx.oncomplete();
                }, 0);
                return req;
              })
            }))
          };
          return tx;
        })
      };

      (globalThis as any).indexedDB = {
        open: vi.fn(() => {
          const req: any = {
            result: mockDbInstance,
            onsuccess: null,
            onerror: null,
            onupgradeneeded: null,
          };
          setTimeout(() => {
            if (req.onsuccess) req.onsuccess({ target: { result: mockDbInstance } });
          }, 0);
          return req;
        })
      };
    });

    afterEach(() => {
      (globalThis as any).indexedDB = origIndexedDB;
    });

    it('exports matching constants and validation methods on TrackletResumeStorage', () => {
      expect(extensionStorage.MAX_RESUME_SIZE_BYTES).toBe(10 * 1024 * 1024);
      expect(extensionStorage.validateResumeFile).toBeTypeOf('function');
      expect(extensionStorage.formatResumeFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('saves a resume record and returns a unique blobId', async () => {
      const mockBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      const blobId = await extensionStorage.saveResumeBlob({
        fileName: 'Senior_Engineer_Google.pdf',
        fileSize: mockBlob.size,
        mimeType: 'application/pdf',
        fileData: mockBlob
      });

      expect(blobId).toMatch(/^res_blob_/);
      expect(mockStore.has(blobId)).toBe(true);

      const record = await extensionStorage.getResumeBlob(blobId);
      expect(record).not.toBeNull();
      expect(record.fileName).toBe('Senior_Engineer_Google.pdf');
      expect(record.fileSize).toBe(mockBlob.size);
      expect(record.mimeType).toBe('application/pdf');
    });

    it('rejects saving when fileData blob is missing', async () => {
      await expect(extensionStorage.saveResumeBlob({ fileName: 'no_blob.pdf', fileSize: 100 } as any)).rejects.toThrow(
        /missing fileData/
      );
    });

    it('deletes a stored resume blob by blobId', async () => {
      const mockBlob = new Blob(['sample content'], { type: 'text/plain' });
      const blobId = await extensionStorage.saveResumeBlob({
        fileName: 'temp.txt',
        fileSize: 14,
        fileData: mockBlob
      });

      expect(mockStore.has(blobId)).toBe(true);
      const deleted = await extensionStorage.deleteResumeBlob(blobId);
      expect(deleted).toBe(true);
      expect(mockStore.has(blobId)).toBe(false);

      const retrieved = await extensionStorage.getResumeBlob(blobId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Integration with Application Model', () => {
    it('shapes tailored CV fields compatible with Application interface', () => {
      const app: Partial<Application> = {
        id: 'app_123',
        company: 'Stripe',
        role: 'Staff Frontend Engineer',
        status: 'Applied',
        platform: 'Company Site',
        dateApplied: '2026-10-05',
        resumeFileName: 'Saleem_Stripe_Tailored_CV.pdf',
        resumeFileSize: 420000,
        resumeBlobId: 'res_blob_stripe_001',
        resumeUploadedAt: '2026-10-05T14:30:00.000Z'
      };

      expect(app.resumeFileName).toBe('Saleem_Stripe_Tailored_CV.pdf');
      expect(app.resumeFileSize).toBe(420000);
      expect(app.resumeBlobId).toBe('res_blob_stripe_001');
      expect(new Date(app.resumeUploadedAt!).toISOString()).toBe('2026-10-05T14:30:00.000Z');
    });
  });
});
