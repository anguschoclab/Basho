import { describe, it, expect, beforeEach } from 'vitest';
import { phase02_context } from '../phase02_context';
import type { WorldState } from '../../../types/world';

describe('Phase 2: Context', () => {
  let world: WorldState;

  beforeEach(() => {
    world = {
      playerHeyaId: 'heya-1',
      heyas: new Map([
        ['heya-1', { id: 'heya-1', funds: 1000, rikishiIds: ['r1', 'r2'], facilities: { training: 50, recovery: 50, nutrition: 50 } } as any]
      ]),
      history: [],
      transientContext: {
        deltas: { revenue: 500, expenses: 200 }
      }
    } as unknown as WorldState;
  });

  it('calculates baseline multipliers with default 50 level facilities', () => {
    const result = phase02_context(world);

    // Default 50 training => 0.85 + (50/100)*0.35 = 1.025
    // Default 50 recovery => 0.80 + (50/100)*0.40 = 1.00
    // Default 50 nutrition => 0.92 + (50/100)*0.16 = 1.00

    expect(result.transientContext!.activeModifiers.trainingMultiplier).toBeCloseTo(1.025);
    expect(result.transientContext!.activeModifiers.recoveryMultiplier).toBeCloseTo(1.00);
    expect(result.transientContext!.activeModifiers.financialPenalty).toBe(false);
    expect(result.transientContext!.activeModifiers.moraleBoost).toBe(false);
  });

  it('applies financial penalty if funds < 0', () => {
    world.heyas.get('heya-1')!.funds = -100;

    const result = phase02_context(world);

    expect(result.transientContext!.activeModifiers.financialPenalty).toBe(true);
    // Training multiplier halved
    expect(result.transientContext!.activeModifiers.trainingMultiplier).toBeCloseTo(1.025 * 0.5);
  });

  it('applies morale boost if a player rikishi won the last basho', () => {
    world.history = [{ yusho: 'r1' } as any];

    const result = phase02_context(world);

    expect(result.transientContext!.activeModifiers.moraleBoost).toBe(true);
    // +0.15 added before halving
    expect(result.transientContext!.activeModifiers.trainingMultiplier).toBeCloseTo(1.025 + 0.15);
  });

  it('calculates max and min facilities multipliers correctly', () => {
    world.heyas.get('heya-1')!.facilities = { training: 100, recovery: 100, nutrition: 100 } as any;
    const resultMax = phase02_context(world);

    // Max training = 0.85 + 0.35 = 1.2
    // Max recovery = 1.2 * 1.08 = 1.296
    expect(resultMax.transientContext!.activeModifiers.trainingMultiplier).toBeCloseTo(1.2);
    expect(resultMax.transientContext!.activeModifiers.recoveryMultiplier).toBeCloseTo(1.296);

    world.heyas.get('heya-1')!.facilities = { training: 0, recovery: 0, nutrition: 0 } as any;
    const resultMin = phase02_context(world);

    // Min training = 0.85
    // Min recovery = 0.8 * 0.92 = 0.736
    expect(resultMin.transientContext!.activeModifiers.trainingMultiplier).toBeCloseTo(0.85);
    expect(resultMin.transientContext!.activeModifiers.recoveryMultiplier).toBeCloseTo(0.736);
  });

  it('preserves revenue and expenses from phase01, resets other deltas', () => {
    (world.transientContext!.deltas as any).statChanges = { 'r1': [{ stat: 'strength', amount: 5 }] };
    (world.transientContext!.deltas as any).injuriesSustained = ['r1'];

    const result = phase02_context(world);

    expect(result.transientContext!.deltas.revenue).toBe(500);
    expect(result.transientContext!.deltas.expenses).toBe(200);
    expect(result.transientContext!.deltas.statChanges).toEqual({});
    expect(result.transientContext!.deltas.injuriesSustained).toEqual([]);
  });
});
