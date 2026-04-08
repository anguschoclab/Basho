import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phase06_narrative } from '../phase06_narrative';
import type { WorldState } from '../../../types/world';
import { mockRikishi } from '../../../__tests__/utils';
import * as Events from '../../../events';

vi.mock('../../../events', () => ({
  logEngineEvent: vi.fn(),
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
    expect(Events.logEngineEvent).not.toHaveBeenCalled();
  });

  it('logs INJURY_SUSTAINED event for new injuries', () => {
    world.transientContext!.deltas.injuriesSustained = ['r1'];

    phase06_narrative(world);

    expect(Events.logEngineEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: 'INJURY_SUSTAINED',
        rikishiId: 'r1',
        title: 'Wrestler 1 injured',
      })
    );
  });

  it('logs FINANCIAL_CRISIS event if expenses > revenue AND funds < 0', () => {
    world.transientContext!.deltas.revenue = 500;
    world.transientContext!.deltas.expenses = 1000;
    world.heyas.get('heya-1')!.funds = -100;

    phase06_narrative(world);

    expect(Events.logEngineEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: 'FINANCIAL_CRISIS',
        heyaId: 'heya-1',
      })
    );
  });

  it('does NOT log FINANCIAL_CRISIS if expenses > revenue but funds >= 0', () => {
    world.transientContext!.deltas.revenue = 500;
    world.transientContext!.deltas.expenses = 1000;
    world.heyas.get('heya-1')!.funds = 100; // Positive funds

    phase06_narrative(world);

    expect(Events.logEngineEvent).not.toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: 'FINANCIAL_CRISIS'
      })
    );
  });

  it('logs TRAINING_MILESTONE for stat changes >= 1.0', () => {
    world.transientContext!.deltas.statChanges = {
      'r1': [{ stat: 'strength', amount: 1.5 }, { stat: 'speed', amount: 0.5 }], // 1 milestone
      'r2': [{ stat: 'strength', amount: 0.9 }], // No milestone
    };

    phase06_narrative(world);

    expect(Events.logEngineEvent).toHaveBeenCalledTimes(1);
    expect(Events.logEngineEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: 'TRAINING_MILESTONE',
        rikishiId: 'r1',
        title: 'Wrestler 1 made notable gains',
      })
    );
  });
});
