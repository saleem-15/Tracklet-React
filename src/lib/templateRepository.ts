import { 
  db, 
  collection, 
  getDocs, 
  setDoc,
  deleteDoc, 
  doc 
} from './firebase';
import { FollowUpTemplate } from '../types';
import { DEFAULT_FOLLOWUP_TEMPLATES } from './constants';
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
   * Load templates from Firestore for authenticated users (/users/{userId}/templates).
   * Automatically seeds with default templates if none exist.
   */
  static async loadTemplates(userId?: string): Promise<FollowUpTemplate[]> {
    if (!userId) {
      return this.generateDefaultTemplates();
    }

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
      console.warn('Could not fetch Firestore templates:', err);
      return this.generateDefaultTemplates(userId);
    }
  }

  /**
   * Add or update a template in Firestore.
   */
  static async saveTemplate(
    template: Omit<FollowUpTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string },
    userId?: string
  ): Promise<FollowUpTemplate> {
    if (!userId) {
      throw new Error('User must be authenticated to save templates');
    }

    const now = new Date().toISOString();
    const templateId = template.id || `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    const templateToSave: FollowUpTemplate = {
      ...template,
      id: templateId,
      userId,
      createdAt: template.createdAt || now,
      updatedAt: now,
    };

    try {
      const docRef = doc(db, 'users', userId, 'templates', templateId);
      await setDoc(docRef, sanitizeForFirestore({ ...templateToSave } as Record<string, unknown>));
    } catch (err) {
      console.error('Error saving template to Firestore:', err);
      throw err;
    }

    return templateToSave;
  }

  /**
   * Delete a template by ID from Firestore.
   */
  static async deleteTemplate(templateId: string, userId?: string): Promise<void> {
    if (!userId) return;

    try {
      const docRef = doc(db, 'users', userId, 'templates', templateId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Error deleting template from Firestore:', err);
      throw err;
    }
  }

  /**
   * Reset built-in templates to factory defaults while preserving custom templates.
   */
  static async resetDefaultTemplates(userId?: string): Promise<FollowUpTemplate[]> {
    if (!userId) {
      return this.generateDefaultTemplates();
    }

    const defaults = this.generateDefaultTemplates(userId);
    let customTemplates: FollowUpTemplate[] = [];

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

    return [...defaults, ...customTemplates];
  }
}
