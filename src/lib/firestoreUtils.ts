import { writeBatch, FieldValue } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Strips undefined properties recursively so Firestore does not reject document writes.
 * Preserves Firestore FieldValue sentinels (e.g. deleteField(), serverTimestamp()).
 * Supports nested objects, array elements, and primitive values.
 */
export function sanitizeForFirestore<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (value instanceof FieldValue) {
        result[key] = value;
      } else if (Array.isArray(value)) {
        result[key] = value
          .filter((item) => item !== undefined && item !== null)
          .map((item) => {
            if (typeof item === 'object' && !Array.isArray(item)) {
              return sanitizeForFirestore(item as Record<string, unknown>);
            }
            return item;
          });
      } else if (typeof value === 'object') {
        result[key] = sanitizeForFirestore(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Helper to commit Firestore batch operations in safe chunks (< 500 operations per batch).
 */
export async function commitInChunks<T>(
  items: T[],
  operation: (batch: ReturnType<typeof writeBatch>, item: T) => void
): Promise<void> {
  const CHUNK_SIZE = 450;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      operation(batch, item);
    }
    await batch.commit();
  }
}
