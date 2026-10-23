import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateRepository } from '../../src/lib/templateRepository';
import { FollowUpTemplate } from '../../src/types';

const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments[segments.length - 1],
}));
const mockCollection = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  doc: (_db: any, ...segments: string[]) => mockDoc(_db, ...segments),
  collection: (_db: any, ...segments: string[]) => mockCollection(_db, ...segments),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  writeBatch: () => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../src/lib/firestoreUtils', () => ({
  sanitizeForFirestore: (obj: any) => obj,
  commitInChunks: async (items: any[], cb: any) => {
    const batch = {
      set: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    for (const item of items) {
      cb(batch, item);
    }
  },
}));

describe('TemplateRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDefaultTemplates', () => {
    it('generates 4 default templates with stable IDs and timestamps', () => {
      const templates = TemplateRepository.generateDefaultTemplates('user-1');
      expect(templates.length).toBe(4);
      expect(templates[0].id).toBe('tpl-default-1');
      expect(templates[0].userId).toBe('user-1');
      expect(templates[0].title).toBe('Post-Application Check-In');
      expect(templates[0].category).toBe('Post-Application');
      expect(templates[0].createdAt).toBeDefined();
      expect(templates[0].updatedAt).toBeDefined();
    });

    it('works without userId', () => {
      const templates = TemplateRepository.generateDefaultTemplates();
      expect(templates.length).toBe(4);
      expect(templates[0].userId).toBeUndefined();
    });
  });

  describe('loadTemplates', () => {
    it('returns default templates when userId is undefined', async () => {
      const templates = await TemplateRepository.loadTemplates();
      expect(templates.length).toBe(4);
      expect(templates[0].id).toBe('tpl-default-1');
    });

    it('seeds and returns default templates when Firestore collection is empty', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const templates = await TemplateRepository.loadTemplates('user-1');
      expect(templates.length).toBe(4);
      expect(templates[0].userId).toBe('user-1');
    });

    it('returns sorted templates from Firestore when present', async () => {
      const mockTemplates: Partial<FollowUpTemplate>[] = [
        { title: 'Template B', category: 'Interview', order: 2 },
        { title: 'Template A', category: 'Post-Application', order: 1 },
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        forEach: (cb: (doc: any) => void) => {
          mockTemplates.forEach((t, i) =>
            cb({
              id: `tpl-${i + 1}`,
              data: () => t,
            })
          );
        },
      });

      const templates = await TemplateRepository.loadTemplates('user-1');
      expect(templates.length).toBe(2);
      expect(templates[0].title).toBe('Template A');
      expect(templates[1].title).toBe('Template B');
    });

    it('catches Firestore errors and returns default templates gracefully', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Network error'));

      const templates = await TemplateRepository.loadTemplates('user-1');
      expect(templates.length).toBe(4);
      expect(templates[0].id).toBe('tpl-default-1');
    });
  });

  describe('saveTemplate', () => {
    it('throws when userId is missing', async () => {
      await expect(
        TemplateRepository.saveTemplate({
          title: 'New Outreach',
          category: 'Networking',
          subject: 'Hello',
          body: 'World',
        })
      ).rejects.toThrow('User must be authenticated to save templates');
    });

    it('saves template to Firestore for authenticated user', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      const saved = await TemplateRepository.saveTemplate(
        {
          title: 'New Outreach',
          category: 'Networking',
          subject: 'Hello',
          body: 'World',
        },
        'user-1'
      );

      expect(saved.id).toBeDefined();
      expect(saved.userId).toBe('user-1');
      expect(saved.title).toBe('New Outreach');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteTemplate', () => {
    it('does nothing when userId is missing', async () => {
      await TemplateRepository.deleteTemplate('tpl-1');
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('deletes template from Firestore for authenticated user', async () => {
      mockDeleteDoc.mockResolvedValueOnce(undefined);

      await TemplateRepository.deleteTemplate('tpl-1', 'user-1');
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetDefaultTemplates', () => {
    it('returns default templates when userId is undefined', async () => {
      const reset = await TemplateRepository.resetDefaultTemplates();
      expect(reset.length).toBe(4);
    });

    it('resets built-in templates while preserving custom templates in Firestore', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'tpl-default-1',
            ref: { id: 'tpl-default-1' },
            data: () => ({ id: 'tpl-default-1', title: 'Default', isBuiltIn: true }),
          },
          {
            id: 'tpl-custom-1',
            ref: { id: 'tpl-custom-1' },
            data: () => ({ id: 'tpl-custom-1', title: 'My Custom Template', isBuiltIn: false }),
          },
        ],
      });

      const reset = await TemplateRepository.resetDefaultTemplates('user-1');
      expect(reset.length).toBe(5); // 4 factory defaults + 1 custom
      expect(reset.some((t) => t.title === 'My Custom Template')).toBe(true);
    });

    it('rethrows when Firestore batch operations fail', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore batch failure'));

      await expect(TemplateRepository.resetDefaultTemplates('user-1')).rejects.toThrow(
        'Firestore batch failure'
      );
    });
  });
});