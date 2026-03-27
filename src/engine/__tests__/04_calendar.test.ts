import { describe, it, expect, beforeEach } from 'vitest';
import { WorldState } from '../types';
import { endBasho } from '../calendar';

describe('Phase 4: Lifecycle & Archival (endBasho)', () => {
    let mockWorld: WorldState;

    beforeEach(() => {
        mockWorld = {
            id: "test",
            seed: "test",
            year: 2026, week: 1, dayIndexGlobal: 1, cyclePhase: "active_basho",
            playerHeyaId: 's1',
            oyakata: new Map(),
            heyas: new Map(),
            rikishi: new Map([
                ['r_1', { id: 'r_1', name: 'A', heyaId: 's1', currentRank: 'M1', birthYear: 2000, stats: { wins: 100, losses: 50, absences: 5 }, attributes: { power: 50 } } as any],
                ['r_2', { id: 'r_2', name: 'B', heyaId: 's1', currentRank: 'M2', birthYear: 2000, stats: { wins: 80, losses: 70, absences: 0 }, attributes: { power: 50 } } as any]
            ]),
            basho: {
                id: '2026-01',
                year: 2026, month: 1, day: 15,
                bouts: [],
                leaderboard: {
                    'r_1': { wins: 10, losses: 5, absences: 0 },
                    'r_2': { wins: 7, losses: 3, absences: 5 } // 5 days absent
                }
            },
            banzuke: {},
            history: [],
            events: {},
            ftue: {},
            staff: new Map(),
            historicalRikishi: new Map(),
            calendar: { year: 2026, month: 1, currentWeek: 1, currentDay: 1 },
            records: { bashoLog: [], hallOfFame: [] },
            settings: { archiveMode: "standard" }
        } as any;
    });

    it('endBasho successfully flushes leaderboard data into persistent career stats', () => {
        endBasho(mockWorld);

        // r_1: 100 wins + 10 basho wins = 110
        expect(mockWorld.rikishi.get('r_1').stats.wins).toBe(110);
        expect(mockWorld.rikishi.get('r_1').stats.losses).toBe(55);
        expect(mockWorld.rikishi.get('r_1').stats.absences).toBe(5);

        // r_2: 80 wins + 7 basho wins = 87
        expect(mockWorld.rikishi.get('r_2').stats.wins).toBe(87);
        expect(mockWorld.rikishi.get('r_2').stats.losses).toBe(73);
        expect(mockWorld.rikishi.get('r_2').stats.absences).toBe(5);
    });

    it('endBasho completely clears the active basho pointer', () => {
        endBasho(mockWorld);
        expect(mockWorld.basho).toBeUndefined();
    });

    it('endBasho archives the tournament leaderboard strictly to world.history', () => {
        endBasho(mockWorld);

        expect(mockWorld.history.length).toBe(1);

        const historicalEvent = mockWorld.history[0];
        expect(historicalEvent.type).toBe('BASHO_CONCLUDED');
        expect(historicalEvent.bashoId).toBe('2026-01');

        // Deep copy validation (the history shouldn't point to a mutated object)
        expect(historicalEvent.leaderboard['r_1'].wins).toBe(10);
    });

    it('endBasho gracefully handles rikishi missing from the world object', () => {
        // Simulating a deleted rikishi (e.g. retired mid-basho) that is still on the board
        mockWorld.basho!.leaderboard['r_phantom'] = { wins: 15, losses: 0, absences: 0 };

        expect(() => endBasho(mockWorld)).not.toThrow();
    });
});
