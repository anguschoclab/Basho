import { describe, it, expect, beforeEach } from 'vitest';
import { WorldState } from '../types';
import {
    getPlayerStable,
    getStableRikishi,
    getRikishiBashoStats,
    getPlayerOyakata
} from '../world';

describe('Phase 2: Canonical Selectors (Read Path)', () => {
    let mockWorld: WorldState;

    beforeEach(() => {
        mockWorld = {
            id: "test",
            seed: "test",
            year: 2026, week: 1, dayIndexGlobal: 1, cyclePhase: "interim",
            playerHeyaId: 's_1',
            oyakata: new Map([
                ['o_1', { id: 'o_1', name: 'Test Oyakata', heyaId: 's_1' } as any]
            ]),
            heyas: new Map([
                ['s_1', { id: 's_1', name: 'Test Beya', oyakataId: 'o_1', reputation: 50, prestige: 10, money: 100, facilities: 1 } as any]
            ]),
            rikishi: new Map([
                ['r_1', { id: 'r_1', name: 'Rikishi A', heyaId: 's_1', currentRank: 'M1', birthYear: 2000, stats: { wins: 0, losses: 0, absences: 0 }, attributes: { power: 50 } } as any],
                ['r_2', { id: 'r_2', name: 'Rikishi B', heyaId: 's_1', currentRank: 'M2', birthYear: 2000, stats: { wins: 0, losses: 0, absences: 0 }, attributes: { power: 50 } } as any],
                ['r_3', { id: 'r_3', name: 'Rikishi C', heyaId: 's_2', currentRank: 'M3', birthYear: 2000, stats: { wins: 0, losses: 0, absences: 0 }, attributes: { power: 50 } } as any]
            ]),
            basho: {
                id: '2026-01',
                year: 2026, month: 1, day: 1,
                bouts: [],
                leaderboard: {}
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

    it('getPlayerOyakata should resolve the Oyakata entity from the PlayerState ID', () => {
        const oyakata = getPlayerOyakata(mockWorld);
        expect(oyakata).toBeDefined();
        expect(oyakata?.id).toBe('o_1');
    });

    it('getPlayerStable should traverse Player -> Oyakata -> Stable to find the correct entity', () => {
        const stable = getPlayerStable(mockWorld);
        expect(stable).toBeDefined();
        expect(stable?.id).toBe('s_1');
    });

    it('getPlayerStable should return undefined gracefully if relation is broken', () => {
        mockWorld.playerHeyaId = undefined;
        const stable = getPlayerStable(mockWorld);
        expect(stable).toBeUndefined();
    });

    it('getStableRikishi should filter rikishi by foreign key dynamically', () => {
        const roster = getStableRikishi(mockWorld, 's_1');
        expect(roster.length).toBe(2);
        expect(roster.some(r => r.id === 'r_1')).toBe(true);
        expect(roster.some(r => r.id === 'r_2')).toBe(true);
        expect(roster.some(r => r.id === 'r_3')).toBe(false);
    });

    it('getRikishiBashoStats should return a pristine 0-0-0 object if no basho is active', () => {
        const stats = getRikishiBashoStats(mockWorld, 'r_1');
        expect(stats).toEqual({ wins: 0, losses: 0, absences: 0 });
    });

    it('getRikishiBashoStats should pull live data from the BashoState leaderboard when active', () => {
        mockWorld.basho = {
            id: 'b_1', year: 2026, month: 1, day: 5, bouts: [],
            leaderboard: {
                'r_1': { wins: 4, losses: 1, absences: 0 }
            }
        } as any;

        const statsR1 = getRikishiBashoStats(mockWorld, 'r_1');
        expect(statsR1).toEqual({ wins: 4, losses: 1, absences: 0 });

        // Uninitialized rikishi on the board should default safely
        const statsR2 = getRikishiBashoStats(mockWorld, 'r_2');
        expect(statsR2).toEqual({ wins: 0, losses: 0, absences: 0 });
    });
});
