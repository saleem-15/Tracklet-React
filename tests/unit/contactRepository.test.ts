import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactRepository } from '../../src/lib/contactRepository';
import * as firebaseModule from '../../src/lib/firebase';

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
    const largeIds = Array.from({ length: 451 }, (_, i) => `c-${i}`);
    const linkedAppIds = ['app-1'];

    vi.spyOn(firebaseModule, 'getDoc').mockResolvedValue({
      exists: () => true,
    } as any);

    const callOrder: string[] = [];
    vi.spyOn(firebaseModule, 'writeBatch').mockImplementation(() => {
      const ops: string[] = [];
      return {
        update: vi.fn().mockImplementation(() => ops.push('update')),
        delete: vi.fn().mockImplementation(() => ops.push('delete')),
        commit: vi.fn().mockImplementation(async () => {
          if (ops.includes('update')) callOrder.push('app-cleanup');
          if (ops.includes('delete')) callOrder.push('contact-delete');
        }),
      } as any;
    });

    await ContactRepository.batchDelete(largeIds, 'user-123', linkedAppIds);

    expect(callOrder[0]).toBe('app-cleanup');
    expect(callOrder.slice(1)).toContain('contact-delete');
  });

  it('in large-operation path, compensates by restoring committed application links if a later chunk fails', async () => {
    // 451 contacts + 2 application chunks (500 apps total)
    const largeIds = Array.from({ length: 451 }, (_, i) => `c-${i}`);
    const linkedAppIds = Array.from({ length: 500 }, (_, i) => `app-${i}`);

    vi.spyOn(firebaseModule, 'getDoc').mockResolvedValue({
      exists: () => true,
    } as any);

    let batchCount = 0;
    const updateCalls: any[] = [];
    vi.spyOn(firebaseModule, 'writeBatch').mockImplementation(() => {
      const currentBatchId = ++batchCount;
      return {
        update: vi.fn().mockImplementation((ref: any, data: any) => {
          updateCalls.push({ batchId: currentBatchId, ref, data });
        }),
        delete: vi.fn(),
        commit: vi.fn().mockImplementation(async () => {
          // Batch 1 (apps 0-449) succeeds
          // Batch 2 (apps 450-499) fails even after retries
          if (currentBatchId === 2) {
            throw new Error('Network timeout on chunk 2');
          }
          // Batch 3 (rollback compensation) succeeds
        }),
      } as any;
    });

    await expect(
      ContactRepository.batchDelete(largeIds, 'user-123', linkedAppIds)
    ).rejects.toThrow('Network timeout on chunk 2');

    // Verify compensation: batch 3 should have performed arrayUnion rollback on the 450 apps from batch 1
    const rollbackUpdates = updateCalls.filter((u) => u.batchId === 3);
    expect(rollbackUpdates.length).toBe(450);
  });
});
