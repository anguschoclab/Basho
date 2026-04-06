import { describe, it, expect } from 'vitest';
import { isForeign, isCollegeRecruit } from '../../../../src/engine/utils/identity';

describe('Identity Utilities', () => {
  describe('isForeign', () => {
    it('should return true if nationality is not Japan or JP', () => {
      expect(isForeign({ nationality: 'USA' })).toBe(true);
      expect(isForeign({ nationality: 'Mongolia' })).toBe(true);
    });

    it('should return false if nationality is Japan or JP', () => {
      expect(isForeign({ nationality: 'Japan' })).toBe(false);
      expect(isForeign({ nationality: 'JP' })).toBe(false);
      expect(isForeign({ nationality: 'japan' })).toBe(false);
      expect(isForeign({ nationality: 'jp' })).toBe(false);
    });

    it('should return false if nationality is missing', () => {
      expect(isForeign({ nationality: undefined })).toBe(false);
      expect(isForeign({ nationality: '' })).toBe(false);
    });
  });

  describe('isCollegeRecruit', () => {
    it('should return true if origin includes university, univ, or college', () => {
      expect(isCollegeRecruit({ origin: 'Tokyo University' })).toBe(true);
      expect(isCollegeRecruit({ origin: 'Waseda Univ' })).toBe(true);
      expect(isCollegeRecruit({ origin: 'Sports College' })).toBe(true);
      expect(isCollegeRecruit({ origin: 'tokyo university' })).toBe(true);
    });

    it('should return false if origin does not include university, univ, or college', () => {
      expect(isCollegeRecruit({ origin: 'High School' })).toBe(false);
      expect(isCollegeRecruit({ origin: 'Tokyo' })).toBe(false);
    });

    it('should return false if origin is missing', () => {
      expect(isCollegeRecruit({ origin: undefined })).toBe(false);
      expect(isCollegeRecruit({ origin: '' })).toBe(false);
    });
  });
});
