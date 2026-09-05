import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateRepository } from '../../src/lib/templateRepository';
import { LOCAL_STORAGE_KEYS } from '../../src/lib/constants';
import { FollowUpTemplate } from '../../src/types';

describe('TemplateRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Guest Mode Persistence', () => {
    it('seeds with default templates when localStorage is empty', () => {
      const templates = TemplateRepository.loadGuestTemplates();
      expect(templates.length).toBe(4);
      expect(templates[0].title).toBe('Post-Application Check-In');
      expect(templates[0].category).toBe('Post-Application');
      expect(templates[0].id).toBeDefined();

      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_TEMPLATES);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(4);
    });

    it('loads existing templates from localStorage if present', () => {
      const customTemplates: FollowUpTemplate[] = [
        {
          id: 'custom-1',
          title: 'Custom Follow Up',
          category: 'Custom',
          subject: 'Custom Subject',
          body: 'Custom Body',
          order: 1,
        },
      ];
      localStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_TEMPLATES, JSON.stringify(customTemplates));

      const loaded = TemplateRepository.loadGuestTemplates();
      expect(loaded.length).toBe(1);
      expect(loaded[0].title).toBe('Custom Follow Up');
    });

    it('saves a new template to localStorage', async () => {
      // Seed first
      TemplateRepository.loadGuestTemplates();

      const created = await TemplateRepository.saveTemplate({
        title: 'New Outreach',
        category: 'Networking',
        subject: 'Reaching out regarding {role}',
        body: 'Hello {contactName}',
      });

      expect(created.id).toBeDefined();
      expect(created.createdAt).toBeDefined();

      const all = TemplateRepository.loadGuestTemplates();
      expect(all.length).toBe(5);
      expect(all.some((t) => t.id === created.id)).toBe(true);
    });

    it('updates an existing template in localStorage', async () => {
      const templates = TemplateRepository.loadGuestTemplates();
      const target = templates[0];

      const updated = await TemplateRepository.saveTemplate({
        ...target,
        title: 'Updated Check-In Title',
      });

      expect(updated.title).toBe('Updated Check-In Title');
      const all = TemplateRepository.loadGuestTemplates();
      const found = all.find((t) => t.id === target.id);
      expect(found?.title).toBe('Updated Check-In Title');
      expect(all.length).toBe(4); // length remains unchanged
    });

    it('deletes a template by ID from localStorage', async () => {
      const templates = TemplateRepository.loadGuestTemplates();
      const targetId = templates[0].id;

      await TemplateRepository.deleteTemplate(targetId);

      const all = TemplateRepository.loadGuestTemplates();
      expect(all.length).toBe(3);
      expect(all.some((t) => t.id === targetId)).toBe(false);
    });

    it('resets templates back to default built-ins', async () => {
      // Add custom template and delete one
      const templates = TemplateRepository.loadGuestTemplates();
      await TemplateRepository.deleteTemplate(templates[0].id);
      await TemplateRepository.saveTemplate({
        title: 'Random',
        category: 'Custom',
        subject: 'Sub',
        body: 'Body',
      });

      expect(TemplateRepository.loadGuestTemplates().length).toBe(4);

      // Reset
      const reset = await TemplateRepository.resetDefaultTemplates();
      expect(reset.length).toBe(4);
      expect(reset.map((t) => t.title)).toContain('Post-Application Check-In');
      expect(reset.map((t) => t.title)).toContain('Post-Interview Thank You');
    });

    it('loadTemplates() defaults to guest templates when userId is undefined', async () => {
      const templates = await TemplateRepository.loadTemplates();
      expect(templates.length).toBe(4);
    });
  });
});
