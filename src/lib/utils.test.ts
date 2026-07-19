import { describe, expect, it } from 'vitest';

import { calculateDaysLeft, generateId, getTaipeiToday } from './utils';

describe('utils', () => {
  describe('generateId', () => {
    it('generates unique IDs with prefix', () => {
      const id1 = generateId('t');
      const id2 = generateId('s');
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^t_/);
      expect(id2).toMatch(/^s_/);
    });
  });

  describe('getTaipeiToday', () => {
    it('returns YYYY-MM-DD format', () => {
      const today = getTaipeiToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('calculateDaysLeft', () => {
    it('calculates days correctly', () => {
      const today = getTaipeiToday();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      // Allow tolerance for timezone edge cases
      const result = calculateDaysLeft(tomorrowStr);
      expect([0, 1]).toContain(result);
      expect(calculateDaysLeft(today)).toBe(0);
    });
  });
});
