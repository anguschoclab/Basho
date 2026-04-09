import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phase06_narrative } from '../phase06_narrative';
import type { WorldState } from '../../../types/world';
import { mockRikishi } from '../../../__tests__/utils';
import { EventBus } from '../../../events';

vi.mock('../../../events', () => ({
  EventBus: {
    medicalEvent: vi.fn(),
    financialAlert: vi.fn(),
    trainingUpdate: vi.fn(),
  },
  logEngineEvent: vi.fn(), // Keep for robustness but we check EventBus
}));

describe('Phase 6: Narrative', () => {
  let world: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();
    world = {
      playerHeyaId: 'heya-1',
      heyas: new Map([
        ['heya-1', { id: 'heya-1', name: 'Test Heya', funds: 1000 } as any]
      ]),
      rikishi: new Map([
        ['r1', mockRikishi('r1', { shikona: 'Wrestler 1', injuryWeeksRemaining: 2, heyaId: 'heya-1' })],
        ['r2', mockRikishi('r2', { shikona: 'Wrestler 2', heyaId: 'heya-1' })],
      ]),
      transientContext: {
        deltas: {
          revenue: 1000,
          expenses: 500,
          injuriesSustained: [],
          statChanges: {}
        }
      }
    } as unknown as WorldState;
  });

  it('returns world unchanged if deltas are missing', () => {
    world.transientContext!.deltas = undefined as any;
    const result = phase06_narrative(world);
    expect(result).toBe(world);
    expect(EventBus.medicalEvent).not.toHaveBeenCalled();
  });

  it('logs INJURY_SUSTAINED event via medicalEvent factory', () => {
    world.transientContext!.deltas.injuriesSustained = ['r1'];

    phase06_narrative(world);

    expect(EventBus.medicalEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        rikishiId: 'r1',
        status: 'injury_sustained'
      })
    );
  });

  it('logs FINANCIAL_CRISIS event if expenses > revenue AND funds < 0', () => {
    world.transientContext!.deltas.revenue = 500;
    world.transientContext!.deltas.expenses = 1000;
    world.heyas.get('heya-1')!.funds = -100;

    phase06_narrative(world);

    expect(EventBus.financialAlert).toHaveBeenCalledWith(
      expect.any(Object),
      'heya-1',
      expect.objectContaining({
        incident: 'financial_crisis'
      }),
      'headline'
    );
  });

  it('does NOT log FINANCIAL_CRISIS if expenses > revenue but funds >= 0', () => {
    world.transientContext!.deltas.revenue = 500;
    world.transientContext!.deltas.expenses = 1000;
    world.heyas.get('heya-1')!.funds = 100; // Positive funds

    phase06_narrative(world);

    expect(EventBus.financialAlert).not.toHaveBeenCalled();
  });

  it('logs TRAINING_MILESTONE for stat changes >= 1.0', () => {
    world.transientContext!.deltas.statChanges = {
      'r1': [{ stat: 'strength', amount: 1.5 }, { stat: 'speed', amount: 0.5 }], // 1 milestone
      'r2': [{ stat: 'strength', amount: 0.9 }], // No milestone
    };

    phase06_narrative(world);

    expect(EventBus.trainingUpdate).toHaveBeenCalledTimes(1);
    expect(EventBus.trainingUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        rikishiId: 'r1',
        incident: 'milestone'
      })
    );
  });
});
