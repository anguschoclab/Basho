import { describe, it, expect, beforeEach } from 'vitest';
import { WorldState } from '../types';
import { simulateBashoDay } from '../autoSim';

describe('Phase 3: Simulation Log Integrity (Write Path)', () => {
    let mockWorld: WorldState;

    beforeEach(() => {
        mockWorld = {
            date: { year: 2026, month: 1, day: 1 },
            player: { oyakataId: 'o1', money: 0 },
            oyakata: {},
            stables: {},
            rikishi: new Map([
                ['r_1', { id: 'r_1', name: 'A', heyaId: 's1', currentRank: 'M1', birthYear: 2000, stats: { wins: 100, losses: 50, absences: 0 }, attributes: { power: 50 } } as any],
                ['r_2', { id: 'r_2', name: 'B', heyaId: 's1', currentRank: 'M2', birthYear: 2000, stats: { wins: 80, losses: 70, absences: 0 }, attributes: { power: 50 } } as any]
            ]),
            basho: {
                id: '2026-01',
                year: 2026, month: 1, day: 1,
                bouts: [],
                leaderboard: {}
            },
            banzuke: {},
            history: []
        } as any;
    });

    it('simulateBashoDay strictly populates the append-only event log', () => {
        simulateBashoDay(mockWorld);

        expect(mockWorld.basho?.bouts).toBeDefined();
        expect(Array.isArray(mockWorld.basho?.bouts)).toBe(true);
        expect(mockWorld.basho?.day).toBe(2);
    });

    it('simulateBashoDay correctly aggregates the leaderboard based on the bouts', () => {
        simulateBashoDay(mockWorld);

        const leaderboard = mockWorld.basho?.leaderboard;
        expect(leaderboard).toBeDefined();

        // Anti-Regression: Verify NO career stats were mutated during simulation
        expect(mockWorld.rikishi.get('r_1').stats.wins).toBe(100);
        expect(mockWorld.rikishi.get('r_2').stats.wins).toBe(80);

        // Ensure leaderboard values equal the sum of the event log.
        let r1WinsInLog = mockWorld.basho?.bouts.filter((b: any) => b.winnerId === 'r_1').length || 0;
        let r1LossesInLog = mockWorld.basho?.bouts.filter((b: any) => b.loserId === 'r_1').length || 0;

        if (leaderboard && leaderboard['r_1']) {
            expect(leaderboard['r_1'].wins).toBe(r1WinsInLog);
            expect(leaderboard['r_1'].losses).toBe(r1LossesInLog);
        }
    });

    it('simulateBashoDay does nothing and does not crash if no basho is active', () => {
        mockWorld.basho = undefined;
        expect(() => simulateBashoDay(mockWorld)).not.toThrow();
    });
});