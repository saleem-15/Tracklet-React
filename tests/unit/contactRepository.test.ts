import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactRepository } from '../../src/lib/contactRepository';
import * as firebaseModule from '../../src/lib/firebase';
import * as firestoreUtils from '../../src/lib/firestoreUtils';

describe('ContactRepository.batchDelete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exits early without performing Firestore calls if userId is undefined or ids are empty', async () => {
    const runTransactionSpy = vi.spyOn(firebaseModule, 'runTransaction');
    const writeBatchSpy = vi.spyOn(firebaseModule, 'writeBatch');

    await ContactRepository.batchDelete([], 'user-123', ['app-1']);
    await ContactRepository.batchDelete(['c-1'], undefined, ['app-1']);

    expect(runTransactionSpy).not.toHaveBeenCalled();
    expect(writeBatchSpy).not.toHaveBeenCalled();
  });

  it('uses writeBatch directly when there are no linked applications to cascade', async () => {
    const mockBatch = {
      delete: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(firebaseModule, 'writeBatch').mockReturnValue(mockBatch as any);
    const runTransactionSpy = vi.spyOn(firebaseModule, 'runTransaction');

    await ContactRepository.batchDelete(['c-1', 'c-2'], 'user-123', []);

    expect(runTransactionSpy).not.toHaveBeenCalled();
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it('uses runTransaction for race-safe atomic cleanup when total operations fit within batch limit', async () => {
    const mockTransaction = {
      get: vi.fn().mockImplementation(async (ref: any) => {
        // app-1 exists, app-2 does not exist (concurrently deleted)
        const isApp1 = ref.path ? ref.path.includes('app-1') : true;
        return {
          exists: () => isApp1,
          ref,
        };
      }),
      update: vi.fn(),
      delete: vi.fn(),
    };

    vi.spyOn(firebaseModule, 'runTransaction').mockImplementation(async (_db: any, updateFunction: any) => {
      return updateFunction(mockTransaction);
    });

    await ContactRepository.batchDelete(['c-1', 'c-2'], 'user-123', ['app-1', 'app-2']);

    expect(mockTransaction.get).toHaveBeenCalledTimes(2);
    // Only app-1 should be updated since app-2 does not exist
    expect(mockTransaction.update).toHaveBeenCalledTimes(1);
    // Both contacts should be deleted
    expect(mockTransaction.delete).toHaveBeenCalledTimes(2);
  });

  it('in large-operation path, executes application link cleanup before contact deletions', async () => {
    // Generate 451 ids to trigger large-operation path
    const largeIds = Array.from({ length: 451 }, (_, i) => `c-${i}`);
    const linkedAppIds = ['app-1'];

    vi.spyOn(firebaseModule, 'getDoc').mockResolvedValue({
      exists: () => true,
    } as any);

    const callOrder: string[] = [];
    vi.spyOn(firestoreUtils, 'commitInChunks').mockImplementation(async (items: any[], callback: any) => {
      if (items === linkedAppIds || (items.length === 1 && items[0] === 'app-1')) {
        callOrder.push('app-cleanup');
      } else {
        callOrder.push('contact-delete');
      }
    });

    await ContactRepository.batchDelete(largeIds, 'user-123', linkedAppIds);

    expect(callOrder).toEqual(['app-cleanup', 'contact-delete']);
  });
});
