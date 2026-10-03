import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactRepository } from '../../src/lib/contactRepository';
import * as firebaseModule from '../../src/lib/firebase';
import { Contact } from '../../src/types';

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
        // app-1 exists with c-1; app-2 does not exist (concurrently deleted)
        const isApp1 = ref.path ? ref.path.includes('app-1') : true;
        return {
          exists: () => isApp1,
          data: () => ({ contactIds: ['c-1'] }),
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

  it('in large-operation path, filters applications to only those with matching contacts and uses per-application IDs', async () => {
    const largeIds = Array.from({ length: 451 }, (_, i) => `c-${i}`);
    const linkedAppIds = ['app-with-links', 'app-without-links'];

    vi.spyOn(firebaseModule, 'getDoc').mockImplementation(async (ref: any) => {
      const isWithLinks = ref.path && ref.path.includes('app-with-links');
      return {
        exists: () => true,
        data: () => ({
          contactIds: isWithLinks ? ['c-0', 'c-1', 'other-contact'] : ['unrelated-contact'],
        }),
      } as any;
    });

    const updateCalls: any[] = [];
    vi.spyOn(firebaseModule, 'writeBatch').mockImplementation(() => {
      return {
        update: vi.fn().mockImplementation((ref: any, data: any) => {
          updateCalls.push({ ref, data });
        }),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      } as any;
    });

    await ContactRepository.batchDelete(largeIds, 'user-123', linkedAppIds);

    // Only app-with-links should be updated
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0].ref.path).toContain('app-with-links');
  });

  it('in large-operation path, compensates by restoring committed application links if a later chunk fails', async () => {
    // 451 contacts + 500 apps total (2 application chunks)
    const largeIds = Array.from({ length: 451 }, (_, i) => `c-${i}`);
    const linkedAppIds = Array.from({ length: 500 }, (_, i) => `app-${i}`);

    vi.spyOn(firebaseModule, 'getDoc').mockResolvedValue({
      exists: () => true,
      data: () => ({ contactIds: ['c-0'] }),
    } as any);

    let batchCount = 0;
    const updateCalls: any[] = [];
    vi.spyOn(firebaseModule, 'writeBatch').mockImplementation(() => {
      const currentBatchId = ++batchCount;
      const batchUpdatePaths: string[] = [];
      return {
        update: vi.fn().mockImplementation((ref: any, data: any) => {
          batchUpdatePaths.push(ref.path || '');
          updateCalls.push({ batchId: currentBatchId, ref, data });
        }),
        delete: vi.fn(),
        commit: vi.fn().mockImplementation(async () => {
          if (batchUpdatePaths.some((p) => p.includes('app-450'))) {
            throw new Error('Network timeout on chunk 2');
          }
        }),
      } as any;
    });

    await expect(
      ContactRepository.batchDelete(largeIds, 'user-123', linkedAppIds)
    ).rejects.toThrow('Network timeout on chunk 2');

    // Verify compensation: rollback batch 5 should have performed rollback on the 450 apps from batch 1
    const rollbackUpdates = updateCalls.filter((u) => u.batchId === 5);
    expect(rollbackUpdates.length).toBe(450);
  });

  it('in large-operation path, restores deleted contacts and application links when contact deletion fails midway', async () => {
    // 500 contacts (2 chunks: 450 and 50) + 1 linked app
    const contacts: Contact[] = Array.from({ length: 500 }, (_, i) => ({
      id: `c-${i}`,
      name: `Contact ${i}`,
      applicationIds: ['app-1'],
    }));
    const ids = contacts.map((c) => c.id);

    vi.spyOn(firebaseModule, 'getDoc').mockImplementation(async (ref: any) => {
      return {
        exists: () => true,
        data: () => ({ contactIds: ['c-0', 'c-450'] }),
      } as any;
    });

    let batchCount = 0;
    const setCalls: any[] = [];
    const updateCalls: any[] = [];
    vi.spyOn(firebaseModule, 'writeBatch').mockImplementation(() => {
      const currentBatchId = ++batchCount;
      const batchDeletePaths: string[] = [];
      return {
        update: vi.fn().mockImplementation((ref: any, data: any) => {
          updateCalls.push({ batchId: currentBatchId, ref, data });
        }),
        delete: vi.fn().mockImplementation((ref: any) => {
          batchDeletePaths.push(ref.path || '');
        }),
        set: vi.fn().mockImplementation((ref: any, data: any) => {
          setCalls.push({ batchId: currentBatchId, ref, data });
        }),
        commit: vi.fn().mockImplementation(async () => {
          if (batchDeletePaths.some((p) => p.includes('c-450'))) {
            throw new Error('Firestore quota exceeded during contact deletion');
          }
        }),
      } as any;
    });

    await expect(
      ContactRepository.batchDelete(ids, 'user-123', ['app-1'], contacts)
    ).rejects.toThrow('Firestore quota exceeded during contact deletion');

    // Batch 6 must have restored the 450 contacts from Batch 2
    expect(setCalls.length).toBe(450);
    // Batch 7 must have restored the application links
    const rollbackAppUpdates = updateCalls.filter((u) => u.batchId === 7);
    expect(rollbackAppUpdates.length).toBe(1);
  });
});
