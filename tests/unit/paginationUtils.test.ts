import { describe, it, expect } from 'vitest';
import {
  calculatePagination,
  paginateSlice,
  DEFAULT_PAGE_SIZE,
} from '../../src/lib/paginationUtils';

describe('paginationUtils', () => {
  describe('calculatePagination', () => {
    it('handles empty datasets (0 items)', () => {
      const res = calculatePagination(0, 1, 25);
      expect(res).toEqual({
        currentPage: 1,
        pageSize: 25,
        totalPages: 1,
        totalItems: 0,
        startIndex: 0,
        endIndex: 0,
        displayStart: 0,
        displayEnd: 0,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('handles negative or invalid items and page numbers gracefully', () => {
      const res = calculatePagination(-10, -5, -25);
      expect(res.currentPage).toBe(1);
      expect(res.pageSize).toBe(DEFAULT_PAGE_SIZE);
      expect(res.totalItems).toBe(0);
      expect(res.totalPages).toBe(1);
    });

    it('calculates first page for exact multiples of pageSize', () => {
      const res = calculatePagination(50, 1, 25);
      expect(res.currentPage).toBe(1);
      expect(res.pageSize).toBe(25);
      expect(res.totalPages).toBe(2);
      expect(res.totalItems).toBe(50);
      expect(res.startIndex).toBe(0);
      expect(res.endIndex).toBe(25);
      expect(res.displayStart).toBe(1);
      expect(res.displayEnd).toBe(25);
      expect(res.hasNextPage).toBe(true);
      expect(res.hasPrevPage).toBe(false);
    });

    it('calculates second page for exact multiples of pageSize', () => {
      const res = calculatePagination(50, 2, 25);
      expect(res.currentPage).toBe(2);
      expect(res.totalPages).toBe(2);
      expect(res.startIndex).toBe(25);
      expect(res.endIndex).toBe(50);
      expect(res.displayStart).toBe(26);
      expect(res.displayEnd).toBe(50);
      expect(res.hasNextPage).toBe(false);
      expect(res.hasPrevPage).toBe(true);
    });

    it('calculates remainder items on the final page correctly', () => {
      const res = calculatePagination(53, 3, 25);
      expect(res.currentPage).toBe(3);
      expect(res.totalPages).toBe(3);
      expect(res.startIndex).toBe(50);
      expect(res.endIndex).toBe(53);
      expect(res.displayStart).toBe(51);
      expect(res.displayEnd).toBe(53);
      expect(res.hasNextPage).toBe(false);
      expect(res.hasPrevPage).toBe(true);
    });

    it('clamps page index when requested page exceeds totalPages', () => {
      // 53 items = 3 pages. Requesting page 10 should clamp to page 3
      const res = calculatePagination(53, 10, 25);
      expect(res.currentPage).toBe(3);
      expect(res.totalPages).toBe(3);
      expect(res.startIndex).toBe(50);
      expect(res.endIndex).toBe(53);
    });
  });

  describe('paginateSlice', () => {
    it('returns empty array when items array is empty or undefined', () => {
      expect(paginateSlice([], 1, 25)).toEqual([]);
      expect(paginateSlice(undefined as unknown as number[], 1, 25)).toEqual([]);
    });

    it('slices array accurately across page boundaries', () => {
      const items = Array.from({ length: 70 }, (_, i) => i + 1);

      const page1 = paginateSlice(items, 1, 25);
      expect(page1.length).toBe(25);
      expect(page1[0]).toBe(1);
      expect(page1[24]).toBe(25);

      const page2 = paginateSlice(items, 2, 25);
      expect(page2.length).toBe(25);
      expect(page2[0]).toBe(26);
      expect(page2[24]).toBe(50);

      const page3 = paginateSlice(items, 3, 25);
      expect(page3.length).toBe(20);
      expect(page3[0]).toBe(51);
      expect(page3[19]).toBe(70);
    });
  });
});
