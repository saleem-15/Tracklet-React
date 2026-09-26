import { 
  db, 
  collection, 
  getDocs, 
  setDoc,
  deleteDoc, 
  doc 
} from './firebase';
import { FollowUpTemplate } from '../types';
import { DEFAULT_FOLLOWUP_TEMPLATES, LOCAL_STORAGE_KEYS } from './constants';
import { sanitizeForFirestore, commitInChunks } from './firestoreUtils';

export class TemplateRepository {
  /**
   * Generates default templates with stable IDs and timestamps.
   */
  static generateDefaultTemplates(userId?: string): FollowUpTemplate[] {
    const now = new Date().toISOString();
    return DEFAULT_FOLLOWUP_TEMPLATES.map((tmpl, idx) => ({
      ...tmpl,
      id: `tpl-default-${idx + 1}`,
      userId,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Load templates from Firestore if authenticated (/users/{userId}/templates), or localStorage if guest.
   * Automatically seeds with default templates if none exist.
   */
  static async loadTemplates(userId?: string): Promise<FollowUpTemplate[]> {
    if (userId) {
      try {
        const userTplCol = collection(db, 'users', userId, 'templates');
        const querySnapshot = await getDocs(userTplCol);
        
        if (querySnapshot.empty) {
          // First time user: seed default templates into Firestore
          const defaults = this.generateDefaultTemplates(userId);
          await commitInChunks(defaults, (batch, item) => {
            const docRef = doc(db, 'users', userId, 'templates', item.id);
            batch.set(docRef, sanitizeForFirestore({ ...item } as Record<string, unknown>));
          });
          return defaults;
        }

        const docsData: FollowUpTemplate[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<FollowUpTemplate, 'id'>;
          docsData.push({
            ...data,
            id: docSnap.id,
          });
        });

        // Sort by order or createdAt
        return docsData.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      } catch (err) {
        console.warn('Could not fetch Firestore templates (falling back to local cache):', err);
        return this.loadGuestTemplates();
      }
    } else {
      return this.loadGuestTemplates();
    }
  }

  /**
   * Load templates from localStorage for guest users.
   * If none exist, seeds with DEFAULT_FOLLOWUP_TEMPLATES.
   */
  static loadGuestTemplates(): FollowUpTemplate[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_TEMPLATES);
      if (stored !== null) {
        const parsed: FollowUpTemplate[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        }
      }
    } catch {
      // ignore
    }

    // Seed defaults for guest
    const defaults = this.generateDefaultTemplates();
    this.saveGuestTemplates(defaults);
    return defaults;
  }

  /**
   * Persist template array to localStorage (guest mode).
   */
  static saveGuestTemplates(templates: FollowUpTemplate[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_TEMPLATES, JSON.stringify(templates));
    } catch (e) {
      console.error('Failed to save templates to localStorage:', e);
    }
  }

  /**
   * Add or update a template.
   */
  static async saveTemplate(
    template: Omit<FollowUpTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string },
    userId?: string
  ): Promise<FollowUpTemplate> {
    const now = new Date().toISOString();
    const templateId = template.id || `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    const templateToSave: FollowUpTemplate = {
      ...template,
      id: templateId,
      userId,
      createdAt: template.createdAt || now,
      updatedAt: now,
    };

    // Update local cache first
    const current = this.loadGuestTemplates();
    const existingIndex = current.findIndex((t) => t.id === templateId);
    let updated: FollowUpTemplate[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = templateToSave;
    } else {
      updated = [...current, templateToSave];
    }
    this.saveGuestTemplates(updated);

    if (userId) {
      try {
        const docRef = doc(db, 'users', userId, 'templates', templateId);
        await setDoc(docRef, sanitizeForFirestore({ ...templateToSave } as Record<string, unknown>));
      } catch (err) {
        console.warn('Error saving template to Firestore, persisting locally:', err);
        throw err;
      }
    }

    return templateToSave;
  }

  /**
   * Delete a template by ID.
   */
  static async deleteTemplate(templateId: string, userId?: string): Promise<void> {
    const current = this.loadGuestTemplates();
    const filtered = current.filter((t) => t.id !== templateId);
    this.saveGuestTemplates(filtered);

    if (userId) {
      try {
        const docRef = doc(db, 'users', userId, 'templates', templateId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Error deleting template from Firestore:', err);
        throw err;
      }
    }
  }

  /**
   * Reset built-in templates to factory defaults while preserving custom templates.
   */
  static async resetDefaultTemplates(userId?: string): Promise<FollowUpTemplate[]> {
    const defaults = this.generateDefaultTemplates(userId);
    let customTemplates: FollowUpTemplate[] = [];

    if (userId) {
      try {
        const userTplCol = collection(db, 'users', userId, 'templates');
        const querySnapshot = await getDocs(userTplCol);
        
        const toDelete: Array<{ delete: () => Promise<void> } | any> = [];
        querySnapshot.docs.forEach((d) => {
          const data = d.data() as FollowUpTemplate;
          if (data.isBuiltIn) {
            toDelete.push(d.ref);
          } else {
            customTemplates.push({ ...data, id: d.id });
          }
        });
        
        if (toDelete.length > 0) {
          await commitInChunks(toDelete, (batch, docRef) => {
            batch.delete(docRef);
          });
        }

        // Add fresh defaults
        await commitInChunks(defaults, (batch, item) => {
          const docRef = doc(db, 'users', userId, 'templates', item.id);
          batch.set(docRef, sanitizeForFirestore({ ...item } as Record<string, unknown>));
        });
      } catch (err) {
        console.warn('Error resetting templates in Firestore:', err);
      }
    } else {
      const current = this.loadGuestTemplates();
      customTemplates = current.filter((t) => !t.isBuiltIn);
    }

    const merged = [...defaults, ...customTemplates];
    this.saveGuestTemplates(merged);
    return merged;
  }
}
