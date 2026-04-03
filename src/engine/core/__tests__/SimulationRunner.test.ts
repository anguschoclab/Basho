import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPostBashoResolution } from '../SimulationRunner';
import * as MediaService from '../../systems/media/MediaService';
import type { WorldState } from '../../types/world';

// Mock the MediaService dependency
vi.mock('../../systems/media/MediaService', () => ({
  processWeeklyMediaBoundary: vi.fn(),
}));

describe('SimulationRunner', () => {
  describe('runPostBashoResolution', () => {
    it('should process all post basho resolution steps successfully', () => {
      const mockWorld = {
        mediaState: { dummy: 'data' }
      } as unknown as WorldState;

      // Ensure that calling this function doesn't throw and that internal
      // MediaService.processWeeklyMediaBoundary is called properly.
      expect(() => runPostBashoResolution(mockWorld)).not.toThrow();

      expect(MediaService.processWeeklyMediaBoundary).toHaveBeenCalledWith(mockWorld.mediaState);
    });

    it('should catch and log errors in resolution steps gracefully', () => {
      const mockWorld = {
        mediaState: { dummy: 'data' }
      } as unknown as WorldState;

      // Mock console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Force an error in MediaService
      vi.mocked(MediaService.processWeeklyMediaBoundary).mockImplementationOnce(() => {
        throw new Error('Test Error');
      });

      // SimulationRunner catches errors instead of throwing them out
      expect(() => runPostBashoResolution(mockWorld)).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'SimulationRunner: Error in Media Snapshot',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
