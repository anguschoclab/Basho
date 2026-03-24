import { describe, it, expect } from 'vitest';
import { getSalaryBreakdown, generateSanshoLedgerEntry, KINBOSHI_STIPEND_PER_BOSHI, SANSHO_PRIZE_MONEY } from '../economics_awards';

describe('Economics & Awards Logic', () => {
  describe('getSalaryBreakdown', () => {
    it('should return only base salary for a rikishi with no kinboshi', () => {
      const breakdown = getSalaryBreakdown(1400000, 'makuuchi', 0);
      expect(breakdown.base).toBe(1400000);
      expect(breakdown.kinboshiBonus).toBe(0);
      expect(breakdown.total).toBe(1400000);
    });

    it('should apply kinboshi stipend for Makuuchi rikishi', () => {
      const kinboshiCount = 2;
      const breakdown = getSalaryBreakdown(1400000, 'makuuchi', kinboshiCount);
      const expectedBonus = kinboshiCount * KINBOSHI_STIPEND_PER_BOSHI;
      
      expect(breakdown.base).toBe(1400000);
      expect(breakdown.kinboshiBonus).toBe(expectedBonus);
      expect(breakdown.total).toBe(1400000 + expectedBonus);
    });

    it('should NOT apply kinboshi stipend if rikishi is NOT in Makuuchi', () => {
      const kinboshiCount = 2;
      // Even if they have historical kinboshi, they don't get the stipend in Juryo
      const breakdown = getSalaryBreakdown(1100000, 'juryo', kinboshiCount);
      
      expect(breakdown.base).toBe(1100000);
      expect(breakdown.kinboshiBonus).toBe(0);
      expect(breakdown.total).toBe(1100000);
    });

    it('should be case-insensitive for division names', () => {
      const breakdown = getSalaryBreakdown(1400000, 'MAKUUCHI', 1);
      expect(breakdown.kinboshiBonus).toBe(KINBOSHI_STIPEND_PER_BOSHI);
    });
  });

  describe('generateSanshoLedgerEntry', () => {
    it('should generate a correct ledger entry for Shukun-sho', () => {
      const entry = generateSanshoLedgerEntry('Terunofuji', 'Shukun');
      expect(entry.amount).toBe(SANSHO_PRIZE_MONEY);
      expect(entry.description).toContain('Outstanding Performance');
      expect(entry.description).toContain('Terunofuji');
      expect(entry.category).toBe('Prize Money');
    });

    it('should generate a correct ledger entry for Kanto-sho', () => {
      const entry = generateSanshoLedgerEntry('Ura', 'Kanto');
      expect(entry.description).toContain('Fighting Spirit');
    });

    it('should generate a correct ledger entry for Gino-sho', () => {
      const entry = generateSanshoLedgerEntry('Wakatakakage', 'Gino');
      expect(entry.description).toContain('Technique');
    });
  });
});
