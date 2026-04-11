import { describe, it, expect, beforeEach } from 'vitest';
import { handleMediaEvent } from '../../systems/media/MediaService';
import type { WorldState } from '../../types/world';

describe('handleMediaEvent', () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    mockWorld = {
      mediaState: {
        mediaHeat: { 'rikishi1': 50, 'rikishi2': 20 },
        heyaPressure: { 'heya1': 60, 'heya2': 10 },
      },
      governanceLog: [
        {
          id: 'event1',
          heyaId: 'heya1',
          reason: 'Test event',
          type: 'warning',
          severity: 'medium',
          effects: {}
        }
      ]
    } as any;
  });

  it('updates governance log with player choice', () => {
    handleMediaEvent(mockWorld, 'event1', 'apologize');

    const ruling = mockWorld.governanceLog![0];
    expect(ruling.playerChoice).toBe('apologize');
    expect(ruling.playerResponse).toBe('Player chose: apologize');
  });

  it('decreases heat when apologizing', () => {
    handleMediaEvent(mockWorld, 'event1', 'apologize');

    expect(mockWorld.mediaState!.mediaHeat['rikishi1']).toBe(45);
    expect(mockWorld.mediaState!.mediaHeat['rikishi2']).toBe(15);
  });

  it('does not decrease heat below 0 when apologizing', () => {
    mockWorld.mediaState!.mediaHeat['rikishi1'] = 3;
    handleMediaEvent(mockWorld, 'event1', 'apologize');

    expect(mockWorld.mediaState!.mediaHeat['rikishi1']).toBe(0);
  });

  it('increases pressure when denying', () => {
    handleMediaEvent(mockWorld, 'event1', 'deny');

    expect(mockWorld.mediaState!.heyaPressure['heya1']).toBe(65);
    expect(mockWorld.mediaState!.heyaPressure['heya2']).toBe(15);
  });

  it('does not increase pressure above 100 when denying', () => {
    mockWorld.mediaState!.heyaPressure['heya1'] = 98;
    handleMediaEvent(mockWorld, 'event1', 'deny');

    expect(mockWorld.mediaState!.heyaPressure['heya1']).toBe(100);
  });

  it('does not immediately change heat or pressure when ignoring', () => {
    handleMediaEvent(mockWorld, 'event1', 'ignore');

    expect(mockWorld.mediaState!.mediaHeat['rikishi1']).toBe(50);
    expect(mockWorld.mediaState!.heyaPressure['heya1']).toBe(60);
  });
});
