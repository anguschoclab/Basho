import { describe, expect, it } from 'vitest';
import { toRankPosition, type Rank, type Side } from '../banzuke';

describe('toRankPosition', () => {
  describe('Unnumbered ranks', () => {
    it('should correctly format unnumbered ranks', () => {
      expect(toRankPosition({ rank: 'yokozuna', side: 'east' })).toEqual({
        rank: 'yokozuna',
        side: 'east',
      });
      expect(toRankPosition({ rank: 'ozeki', side: 'west' })).toEqual({
        rank: 'ozeki',
        side: 'west',
      });
      expect(toRankPosition({ rank: 'sekiwake', side: 'east' })).toEqual({
        rank: 'sekiwake',
        side: 'east',
      });
      expect(toRankPosition({ rank: 'komusubi', side: 'west' })).toEqual({
        rank: 'komusubi',
        side: 'west',
      });
    });

    it('should ignore rankNumber for unnumbered ranks', () => {
      expect(toRankPosition({ rank: 'yokozuna', side: 'east', rankNumber: 5 })).toEqual({
        rank: 'yokozuna',
        side: 'east',
      });
    });
  });

  describe('Numbered ranks', () => {
    it('should correctly format numbered ranks with valid rankNumber', () => {
      expect(toRankPosition({ rank: 'maegashira', side: 'east', rankNumber: 1 })).toEqual({
        rank: 'maegashira',
        side: 'east',
        rankNumber: 1,
      });
      expect(toRankPosition({ rank: 'juryo', side: 'west', rankNumber: 14 })).toEqual({
        rank: 'juryo',
        side: 'west',
        rankNumber: 14,
      });
      expect(toRankPosition({ rank: 'makushita', side: 'east', rankNumber: 60 })).toEqual({
        rank: 'makushita',
        side: 'east',
        rankNumber: 60,
      });
      expect(toRankPosition({ rank: 'sandanme', side: 'west', rankNumber: 100 })).toEqual({
        rank: 'sandanme',
        side: 'west',
        rankNumber: 100,
      });
      expect(toRankPosition({ rank: 'jonidan', side: 'east', rankNumber: 120 })).toEqual({
        rank: 'jonidan',
        side: 'east',
        rankNumber: 120,
      });
      expect(toRankPosition({ rank: 'jonokuchi', side: 'west', rankNumber: 30 })).toEqual({
        rank: 'jonokuchi',
        side: 'west',
        rankNumber: 30,
      });
    });

    it('should throw an error if rankNumber is not provided for numbered ranks', () => {
      expect(() => toRankPosition({ rank: 'maegashira', side: 'east' } as unknown as { rank: Rank; side: Side; rankNumber?: number })).toThrow(
        'Rank maegashira requires rankNumber >= 1'
      );
    });

    it('should throw an error if rankNumber is less than 1 for numbered ranks', () => {
      expect(() => toRankPosition({ rank: 'juryo', side: 'west', rankNumber: 0 })).toThrow(
        'Rank juryo requires rankNumber >= 1'
      );
      expect(() => toRankPosition({ rank: 'makushita', side: 'east', rankNumber: -5 })).toThrow(
        'Rank makushita requires rankNumber >= 1'
      );
    });
  });
});
