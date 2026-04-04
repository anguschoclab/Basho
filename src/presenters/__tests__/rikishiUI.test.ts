import { describe, it, expect } from 'vitest';
import { rankScore } from '../rikishiUI';

describe('rikishiUI - rankScore', () => {
  it('should calculate correct score for yokozuna 1 east', () => {
    // tier 1 * 1000 + 1 * 2 + 0 = 1002
    expect(rankScore('yokozuna', 1, 'east')).toBe(1002);
  });

  it('should calculate correct score for yokozuna 1 west', () => {
    // tier 1 * 1000 + 1 * 2 + 0.5 = 1002.5
    expect(rankScore('yokozuna', 1, 'west')).toBe(1002.5);
  });

  it('should calculate correct score for ozeki 1 east', () => {
    // tier 2 * 1000 + 1 * 2 + 0 = 2002
    expect(rankScore('ozeki', 1, 'east')).toBe(2002);
  });

  it('should calculate correct score for maegashira 5 west', () => {
    // tier 5 * 1000 + 5 * 2 + 0.5 = 5010.5
    expect(rankScore('maegashira', 5, 'west')).toBe(5010.5);
  });

  it('should handle missing side (defaults to 0.5)', () => {
    // tier 5 * 1000 + 5 * 2 + 0.5 = 5010.5
    expect(rankScore('maegashira', 5)).toBe(5010.5);
  });

  it('should handle missing rankNumber (defaults to 0)', () => {
    // tier 3 * 1000 + 0 * 2 + 0 = 3000
    expect(rankScore('sekiwake', undefined, 'east')).toBe(3000);
  });

  it('should handle missing rankNumber and side', () => {
    // tier 4 * 1000 + 0 * 2 + 0.5 = 4000.5
    expect(rankScore('komusubi')).toBe(4000.5);
  });

  it('should handle unknown ranks (defaults to tier 99)', () => {
    // tier 99 * 1000 + 2 * 2 + 0 = 99004
    expect(rankScore('unknown_rank', 2, 'east')).toBe(99004);
  });

  it('should return lowest score (highest rank) for yokozuna 1 east', () => {
    const yokozuna1East = rankScore('yokozuna', 1, 'east');
    const yokozuna1West = rankScore('yokozuna', 1, 'west');
    const ozeki1East = rankScore('ozeki', 1, 'east');

    expect(yokozuna1East).toBeLessThan(yokozuna1West);
    expect(yokozuna1West).toBeLessThan(ozeki1East);
  });
});
