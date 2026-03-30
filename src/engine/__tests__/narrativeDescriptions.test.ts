import { describe, it, expect } from 'vitest';
import { describeExperience } from '../narrativeDescriptions';

describe('narrativeDescriptions', () => {
  describe('describeExperience', () => {
    it('returns "Veteran" for values >= 80', () => {
      expect(describeExperience(80)).toBe('Veteran');
      expect(describeExperience(100)).toBe('Veteran');
      expect(describeExperience(999)).toBe('Veteran');
    });

    it('returns "Experienced" for values 60-79', () => {
      expect(describeExperience(60)).toBe('Experienced');
      expect(describeExperience(79)).toBe('Experienced');
      expect(describeExperience(79.9)).toBe('Experienced');
    });

    it('returns "Established" for values 40-59', () => {
      expect(describeExperience(40)).toBe('Established');
      expect(describeExperience(59)).toBe('Established');
    });

    it('returns "Developing" for values 20-39', () => {
      expect(describeExperience(20)).toBe('Developing');
      expect(describeExperience(39)).toBe('Developing');
    });

    it('returns "Green" for values 10-19', () => {
      expect(describeExperience(10)).toBe('Green');
      expect(describeExperience(19)).toBe('Green');
    });

    it('returns "Novice" for values < 10', () => {
      expect(describeExperience(9)).toBe('Novice');
      expect(describeExperience(0)).toBe('Novice');
      expect(describeExperience(-10)).toBe('Novice'); // Negative values are clamped to 0
    });

    it('handles floating point numbers gracefully by flooring them', () => {
      expect(describeExperience(79.9)).toBe('Experienced'); // floors to 79
      expect(describeExperience(19.9)).toBe('Green'); // floors to 19
      expect(describeExperience(9.9)).toBe('Novice'); // floors to 9
    });

    it('handles invalid inputs gracefully by falling back to 0', () => {
      // @ts-expect-error Testing invalid input types
      expect(describeExperience(NaN)).toBe('Novice');
      // @ts-expect-error Testing invalid input types
      expect(describeExperience(undefined)).toBe('Novice');
      // @ts-expect-error Testing invalid input types
      expect(describeExperience(null)).toBe('Novice');
      // @ts-expect-error Testing invalid input types
      expect(describeExperience('invalid')).toBe('Novice');

      // valid string numbers are converted correctly
      // @ts-expect-error Testing string numbers
      expect(describeExperience('85')).toBe('Veteran');
    });
  });
});
