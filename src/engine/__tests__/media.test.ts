import { describe, it, expect } from 'vitest';
import { createDefaultMediaState, resetBashoMediaTracking } from '../media';
import type { MediaState } from '../types/media';

describe('Media System', () => {
  describe('resetBashoMediaTracking', () => {
    it('should reset basho-scoped tracking fields to empty objects', () => {
      // Setup base state
      const baseState = createDefaultMediaState();

      // Mutate state with some dummy data for tracking fields
      const mutatedState: MediaState = {
        ...baseState,
        headlines: [{
          id: 'h1',
          type: 'daily_bout',
          tone: 'hype',
          outlet: 'tokyo_sports',
          timestamp: 100,
          text: 'Huge win!',
          rikishiIds: ['r1'],
        }],
        mediaHeat: { 'r1': 50 },
        heyaPressure: { 'h1': 30 },

        // Fields that should be reset
        bashoStreaks: { 'r1': 5 },
        streakHeadlinesFired: { 'r1': [3, 5] },
        promoWatchFired: { 'r1': true },
        retirementWatchFired: { 'r2': true },
        titleRaceDayFired: { '10': true },
        injuryWithdrawalFired: { 'r3': true },
      };

      // Act
      const resetState = resetBashoMediaTracking(mutatedState);

      // Assert fields are reset
      expect(resetState.bashoStreaks).toEqual({});
      expect(resetState.streakHeadlinesFired).toEqual({});
      expect(resetState.promoWatchFired).toEqual({});
      expect(resetState.retirementWatchFired).toEqual({});
      expect(resetState.titleRaceDayFired).toEqual({});
      expect(resetState.injuryWithdrawalFired).toEqual({});

      // Assert other fields are NOT reset
      expect(resetState.headlines).toEqual(mutatedState.headlines);
      expect(resetState.mediaHeat).toEqual(mutatedState.mediaHeat);
      expect(resetState.heyaPressure).toEqual(mutatedState.heyaPressure);

      // Assert it does not mutate the original object
      expect(resetState).not.toBe(mutatedState);
      expect(mutatedState.bashoStreaks).toEqual({ 'r1': 5 }); // original preserved
    });
  });
});
