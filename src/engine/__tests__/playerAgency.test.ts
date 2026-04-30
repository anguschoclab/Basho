import { describe, it, expect } from 'vitest';
import { generateInitialWorld } from '../systems/generation/WorldFactory';
import { resolveBout } from '../bout/boutResolver';
import { EntityCollection } from '../core/EntityCollection';
import { phase01_week_training } from '../tick/phases/phase01_week_training';
import { resolveImpacts } from '../core/ImpactResolver';
import { ensureHeyaTrainingState } from '../systems/training/TrainingService';
import type { BoutContext } from '../bout/boutPhysics';
import type { BashoState } from '../types/basho';

describe('Player Agency Integration', () => {
  const world = generateInitialWorld('agency-test-seed');
  const rikishiList = EntityCollection.getActiveRikishi(world);
  
  // Use a rikishi with high technique for the Henka test to ensure it's effective
  const east = { ...rikishiList[0], technique: 90 };
  const west = rikishiList[1];
  
  // Ensure the world has the updated rikishi so resolver finds it if it does lookups
  world.rikishi.set(east.id, east);

  describe('Bout Tactics', () => {
    it('MUST change bout outcomes or physics based on tactic selection (Deterministic)', () => {
      const basho: BashoState = {
        id: 'test-basho',
        year: 2025,
        day: 1,
        bashoName: 'hatsu',
        bashoNumber: 1,
        matches: [],
        standings: new Map(),
        isActive: true,
      };

      const bout: BoutContext = {
        id: 'bout-1',
        day: 1,
        rikishiEastId: east.id,
        rikishiWestId: west.id,
        playerSide: 'east',
      };

      // Scenario 1: Standard Tactic
      const resStandard = resolveBout(bout, east, west, basho, 'STANDARD', world);
      
      // Scenario 2: Henka Tactic (Same seed, different tactic)
      const resHenka = resolveBout(bout, east, west, basho, 'HENKA', world);

      // Verify that the tactic selection matters
      const standardWinner = resStandard.result.winner;
      const henkaWinner = resHenka.result.winner;
      const standardKimarite = resStandard.result.kimarite;
      const henkaKimarite = resHenka.result.kimarite;

      // Log results for visibility in case of failure
      console.log(`Standard: ${standardWinner} via ${standardKimarite}`);
      console.log(`Henka: ${henkaWinner} via ${henkaKimarite}`);

      const resultsDiffer = standardWinner !== henkaWinner || standardKimarite !== henkaKimarite;
      expect(resultsDiffer).toBe(true);
    });
  });

  describe('Training Intensity', () => {
    it('MUST result in different stat growth after one week of training', () => {
      const lowIntensityProfile = {
        id: 'low',
        name: 'Low',
        focus: 'neutral' as const,
        intensity: 'conservative' as const,
        recovery: 'normal' as const,
        styleBias: 'neutral' as const,
      };

      const highIntensityProfile = {
        id: 'high',
        name: 'High',
        focus: 'neutral' as const,
        intensity: 'punishing' as const,
        recovery: 'normal' as const,
        styleBias: 'neutral' as const,
      };

      // Scenario 1: Low Intensity
      const worldLow = { ...world };
      const heyaStateLow = ensureHeyaTrainingState(worldLow, east.heyaId);
      heyaStateLow.activeProfile = lowIntensityProfile;
      
      const impactLow = phase01_week_training(worldLow);
      const worldLowAfter = resolveImpacts(worldLow, [impactLow]);
      const eastLow = worldLowAfter.rikishi.get(east.id)!;

      // Scenario 2: High Intensity
      const worldHigh = { ...world };
      const heyaStateHigh = ensureHeyaTrainingState(worldHigh, east.heyaId);
      heyaStateHigh.activeProfile = highIntensityProfile;
      
      const impactHigh = phase01_week_training(worldHigh);
      const worldHighAfter = resolveImpacts(worldHigh, [impactHigh]);
      const eastHigh = worldHighAfter.rikishi.get(east.id)!;

      // Assert that high intensity resulted in more power growth (or at least different fatigue)
      expect(eastHigh.power).toBeGreaterThanOrEqual(eastLow.power); // growth might be same depending on RNG/ceiling
      expect(eastHigh.fatigue).toBeGreaterThan(eastLow.fatigue);
    });
  });
});
