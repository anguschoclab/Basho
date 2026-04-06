import { describe, it, expect } from 'vitest';
import { capitalize, formatCurrency, formatShikona } from '../../../../src/engine/utils/string';

describe('String Utilities', () => {
  describe('capitalize', () => {
    it('should capitalize the first letter of a string', () => {
      expect(capitalize('test')).toBe('Test');
      expect(capitalize('hello world')).toBe('Hello world');
    });

    it('should return an empty string if given an empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should return an empty string for falsy values', () => {
      expect(capitalize(undefined as unknown as string)).toBe('');
      expect(capitalize(null as unknown as string)).toBe('');
    });
  });

  describe('formatCurrency', () => {
    it('should format a number as Japanese Yen', () => {
      expect(formatCurrency(1000)).toBe('￥1,000');
    });

    it('should format 0 as Japanese Yen', () => {
      expect(formatCurrency(0)).toBe('￥0');
    });

    it('should format negative numbers as Japanese Yen', () => {
      expect(formatCurrency(-1000)).toBe('-￥1,000');
    });
  });

  describe('formatShikona', () => {
    it('should return the shikona if present', () => {
      expect(formatShikona('Hakuho', 'Sho')).toBe('Hakuho');
    });

    it('should return the name if shikona is not present', () => {
      expect(formatShikona(undefined, 'Sho')).toBe('Sho');
      expect(formatShikona('', 'Sho')).toBe('Sho');
    });

    it('should return "Unknown Rikishi" if neither are present', () => {
      expect(formatShikona(undefined, '')).toBe('Unknown Rikishi');
    });
  });
});
