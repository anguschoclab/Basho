import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phase03_progression } from '../phase03_progression';
import type { WorldState } from '../../../types/world';
import { mockRikishi } from '../../../__tests__/utils';
import * as TrainingMath from '../../../systems/training/TrainingMath';
import * as TrainingService from '../../../systems/training/TrainingService';

vi.mock('../../../systems/training/TrainingMath', () => ({
  calculateGains: vi.fn(),
  calculateFatigueDelta: vi.fn(),
}));

vi.mock('../../../systems/training/TrainingService', () => ({
  ensureHeyaTrainingState: vi.fn(),
}));

describe('Phase 3: Progression', () => {
  let world: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();
    world = {
      playerHeyaId: 'heya-1',
      heyas: new Map([
        ['heya-1', { id: 'heya-1', rikishiIds: ['r1', 'r2', 'r3'] }]
      ]),
      rikishi: new Map([
        ['r1', mockRikishi('r1', { injured: false, fatigue: 10, stats: { strength: 50, speed: 50 } as any })],
        ['r2', mockRikishi('r2', { injured: true, fatigue: 10 })], // injured, should be skipped
        ['r3', mockRikishi('r3', { isRetired: true })], // retired, should be skipped
      ]),
      transientContext: {
        activeModifiers: { trainingMultiplier: 1.2 },
        deltas: { statChanges: {} }
      }
    } as unknown as WorldState;

    (TrainingService.ensureHeyaTrainingState as any).mockReturnValue({
      activeProfile: 'standard',
      focusSlots: [{ rikishiId: 'r1', type: 'strength' }]
    });
  });

  it('returns world unchanged if playerHeyaId is missing', () => {
    world.playerHeyaId = undefined;
    const result = phase03_progression(world);
    expect(result).toBe(world);
  });

  it('returns world unchanged if transientContext activeModifiers are missing', () => {
    world.transientContext = undefined;
    const result = phase03_progression(world);
    expect(result).toBe(world);
  });

  it('applies gains and fatigue using TrainingMath to active non-injured rikishi', () => {
    (TrainingMath.calculateGains as any).mockReturnValue({ strength: 1.5, speed: 0.5, mental: 0 });
    (TrainingMath.calculateFatigueDelta as any).mockReturnValue(5);

    const result = phase03_progression(world);

    // Only called for 'r1'
    expect(TrainingMath.calculateGains).toHaveBeenCalledTimes(1);
    expect(TrainingMath.calculateGains).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1' }),
      { trainingMultiplier: 1.2 },
      'standard',
      { rikishiId: 'r1', type: 'strength' }
    );
    expect(TrainingMath.calculateFatigueDelta).toHaveBeenCalledTimes(1);
    expect(TrainingMath.calculateFatigueDelta).toHaveBeenCalledWith('standard', { rikishiId: 'r1', type: 'strength' });

    // R1 stats mutated
    const r1Next = result.rikishi.get('r1')!;
    expect((r1Next.stats as any).strength).toBe(51.5);
    expect((r1Next.stats as any).speed).toBe(50.5);
    expect(r1Next.fatigue).toBe(15);

    // Deltas updated
    expect(result.transientContext!.deltas.statChanges['r1']).toEqual([
      { stat: 'strength', amount: 1.5 },
      { stat: 'speed', amount: 0.5 }
    ]);
  });

  it('caps stats between 0 and 99, and fatigue between 0 and 100', () => {
    (TrainingMath.calculateGains as any).mockReturnValue({ strength: 100, speed: -100 });
    (TrainingMath.calculateFatigueDelta as any).mockReturnValue(200);

    const result = phase03_progression(world);
    const r1Next = result.rikishi.get('r1')!;

    expect((r1Next.stats as any).strength).toBe(99);
    expect((r1Next.stats as any).speed).toBe(0);
    expect(r1Next.fatigue).toBe(100);
  });
});
