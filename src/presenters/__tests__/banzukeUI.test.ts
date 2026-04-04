import { describe, it, expect } from 'vitest';
import { buildBanzukeRows, UIRankRow, buildPrevRankScores } from '../banzukeUI';
import { UIRosterEntry } from '../rikishiUI';

describe('banzukeUI', () => {

  describe('buildBanzukeRows', () => {

    const mockEntries: Partial<UIRosterEntry>[] = [
      { id: '1', shikona: 'A_East', division: 'makuuchi', rank: 'yokozuna', rankNumber: 1, side: 'east' },
      { id: '2', shikona: 'B_West', division: 'makuuchi', rank: 'yokozuna', rankNumber: 1, side: 'west' },
      { id: '3', shikona: 'C_East', division: 'makuuchi', rank: 'ozeki', rankNumber: 1, side: 'east' },
      { id: '4', shikona: 'D_East', division: 'juryo', rank: 'juryo', rankNumber: 1, side: 'east' },
      { id: '5', shikona: 'E_West', division: 'makuuchi', rank: 'maegashira', rankNumber: 15, side: 'west' },
      { id: '6', shikona: 'F_East', division: 'makuuchi', rank: 'sekiwake', rankNumber: 1, side: 'east' },
      { id: '7', shikona: 'G_East', division: 'makuuchi', rank: 'komusubi', rankNumber: 1, side: 'east' }
    ];

    it('should group entries into rows by rank and rankNumber for a specific division', () => {
      const rows = buildBanzukeRows(mockEntries as UIRosterEntry[], 'makuuchi', '');

      expect(rows).toHaveLength(5); // yokozuna 1, ozeki 1, sekiwake 1, komusubi 1, maegashira 15

      const yokozunaRow = rows.find(r => r.rankKey === 'yokozuna_1');
      expect(yokozunaRow?.east?.shikona).toBe('A_East');
      expect(yokozunaRow?.west?.shikona).toBe('B_West');
      expect(yokozunaRow?.rankLabel).toBe('Yokozuna'); // Sanyaku shouldn't have number appended
      expect(yokozunaRow?.rankTierClass).toContain('gold');

      const ozekiRow = rows.find(r => r.rankKey === 'ozeki_1');
      expect(ozekiRow?.east?.shikona).toBe('C_East');
      expect(ozekiRow?.west).toBeNull();
      expect(ozekiRow?.rankLabel).toBe('Ozeki');
      expect(ozekiRow?.rankTierClass).toContain('silver');

      const sekiwakeRow = rows.find(r => r.rankKey === 'sekiwake_1');
      expect(sekiwakeRow?.rankLabel).toBe('Sekiwake');
      expect(sekiwakeRow?.rankTierClass).toContain('bronze');

      const komusubiRow = rows.find(r => r.rankKey === 'komusubi_1');
      expect(komusubiRow?.rankLabel).toBe('Komusubi');
      expect(komusubiRow?.rankTierClass).toContain('bronze');

      const maegashiraRow = rows.find(r => r.rankKey === 'maegashira_15');
      expect(maegashiraRow?.east).toBeNull();
      expect(maegashiraRow?.west?.shikona).toBe('E_West');
      expect(maegashiraRow?.rankLabel).toBe('Maegashira #15');
      expect(maegashiraRow?.rankTierClass).toBe(''); // default empty
    });

    it('should only return entries for the specified division', () => {
      const rows = buildBanzukeRows(mockEntries as UIRosterEntry[], 'juryo', '');
      expect(rows).toHaveLength(1);
      expect(rows[0].east?.shikona).toBe('D_East');
    });

    it('should filter by search query (case-insensitive) across both sides', () => {
      // search 'east' matches A_East, C_East, D_East (in juryo), F_East, G_East
      const rows1 = buildBanzukeRows(mockEntries as UIRosterEntry[], 'makuuchi', 'east');
      expect(rows1).toHaveLength(4);

      const yRow = rows1.find(r => r.rankKey === 'yokozuna_1');
      // even if west didn't match, if east matched, both are included in row.
      expect(yRow?.east?.shikona).toBe('A_East');
      expect(yRow?.west?.shikona).toBe('B_West');

      // search for specific shikona
      const rows2 = buildBanzukeRows(mockEntries as UIRosterEntry[], 'makuuchi', 'B_WEST');
      expect(rows2).toHaveLength(1);
      expect(rows2[0].west?.shikona).toBe('B_West');
      // East is included since west matched
      expect(rows2[0].east?.shikona).toBe('A_East');
    });

    it('should handle empty search queries or unmatching queries', () => {
      const rows = buildBanzukeRows(mockEntries as UIRosterEntry[], 'makuuchi', 'nomatch');
      expect(rows).toHaveLength(0);
    });

    it('should sort rows correctly by rank tier and then rank number', () => {
       const entries: Partial<UIRosterEntry>[] = [
         { id: '1', division: 'makuuchi', rank: 'maegashira', rankNumber: 2, side: 'east' },
         { id: '2', division: 'makuuchi', rank: 'ozeki', rankNumber: 1, side: 'east' },
         { id: '3', division: 'makuuchi', rank: 'maegashira', rankNumber: 1, side: 'east' },
         { id: '4', division: 'makuuchi', rank: 'yokozuna', rankNumber: 1, side: 'east' },
       ];

       const rows = buildBanzukeRows(entries as UIRosterEntry[], 'makuuchi', '');
       expect(rows[0].rankKey).toBe('yokozuna_1');
       expect(rows[1].rankKey).toBe('ozeki_1');
       expect(rows[2].rankKey).toBe('maegashira_1');
       expect(rows[3].rankKey).toBe('maegashira_2');
    });

    it('should handle edge cases like unknown rank', () => {
        const entries: Partial<UIRosterEntry>[] = [
            { id: '1', division: 'makuuchi', rank: 'unknown_rank' as any, rankNumber: undefined, side: 'east' }
        ];
        const rows = buildBanzukeRows(entries as UIRosterEntry[], 'makuuchi', '');
        expect(rows).toHaveLength(1);
        expect(rows[0].rankLabel).toBe('Unknown_rank #1'); // default to 1 if missing
        expect(rows[0].rankTierClass).toBe('');
    });
  });

  describe('buildPrevRankScores', () => {
    it('should return an empty map if history is empty', () => {
      const map = buildPrevRankScores([]);
      expect(map.size).toBe(0);
    });

    it('should return an empty map if no history entries have nextBanzuke', () => {
      const history = [{}, { otherData: true }];
      const map = buildPrevRankScores(history as any[]);
      expect(map.size).toBe(0);
    });

    it('should build a map of rikishi IDs to rank scores from the most recent valid nextBanzuke', () => {
      const history = [
        {
          nextBanzuke: {
             divisions: {
               makuuchi: {
                 assignments: [
                   { rikishiId: 'r1', position: { rank: 'yokozuna', rankNumber: 1, side: 'east' } }
                 ]
               }
             }
          }
        },
        {
           // this one does not have nextBanzuke
        },
        {
          nextBanzuke: {
             divisions: {
               makuuchi: {
                 assignments: [
                   { rikishiId: 'r1', position: { rank: 'yokozuna', rankNumber: 1, side: 'east' } }, // score = 1*1000 + 1*2 + 0 = 1002
                   { rikishiId: 'r2', position: { rank: 'ozeki', rankNumber: 1, side: 'west' } } // score = 2*1000 + 1*2 + 0.5 = 2002.5
                 ]
               },
               juryo: {
                 assignments: [
                   { rikishiId: 'r3', position: { rank: 'juryo', rankNumber: 5, side: 'east' } } // score = 6*1000 + 5*2 + 0 = 6010
                 ]
               }
             }
          }
        },
        {
          // Older history entry, should be ignored (actually recent entry in array end)
          // Wait, history array in code iterates backwards length-1.
          // So the LAST entry in the array is considered the MOST RECENT valid one?
          // No, usually in history, length - 1 is the most recent. The test was flawed.
          // In the function it iterates from length - 1 down to 0, stopping at the first one it finds.
          // So the LAST one in the array with nextBanzuke is picked.
        }
      ];

      const map = buildPrevRankScores(history as any[]);

      expect(map.size).toBe(3);
      expect(map.get('r1')).toBe(1002);
      expect(map.get('r2')).toBe(2002.5);
      expect(map.get('r3')).toBe(6010);
    });
  });

});
