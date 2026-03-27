import { describe, it, expect } from 'vitest';
import { generateWorld } from '../worldgen';

describe('Phase 1: Domain State Normalization & Factories', () => {
    it('createInitialWorld should return a strictly typed, normalized state container', () => {
        const world = generateWorld();

        expect(world).toBeDefined();
        expect(world.calendar).toBeDefined();


        // Anti-Regression: The player state MUST NOT contain a stableId directly.
        expect((world as any).player?.stableId).toBeUndefined();
    });

    it('generateInitialEntities should establish relations via foreign keys exclusively', () => {
        const world = generateWorld();


        const playerOyakataId = world.heyas.get(world.playerHeyaId!)?.oyakataId;
        const oyakata = world.oyakata.get(playerOyakataId as string);

        expect(oyakata).toBeDefined();
        expect(oyakata?.heyaId).toBeDefined();

        const stable = world.heyas.get(oyakata!.heyaId!);
        expect(stable).toBeDefined();

        // Anti-Regression: Stables MUST NOT maintain arrays of Rikishi IDs.
        expect((stable as any).rikishiIds).toBeUndefined();

        // Verification: The Rikishi themselves must hold the foreign key.
        const rikishiList = Array.from(world.rikishi.values());
        expect(rikishiList.length).toBeGreaterThan(0);

        const rikishiInStable = rikishiList.filter(r => r.heyaId === stable?.id);
        expect(rikishiInStable.length).toBeGreaterThan(0);

        // Anti-Regression: Rikishi MUST NOT have temporary tournament stat counters
        const sampleRikishi = rikishiInStable[0];
        expect((sampleRikishi as any).currentBashoWins).toBeUndefined();
        expect((sampleRikishi as any).currentBashoLosses).toBeUndefined();
    });
});