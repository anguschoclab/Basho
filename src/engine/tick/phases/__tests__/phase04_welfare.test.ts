import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phase04_welfare } from '../phase04_welfare';
import type { WorldState } from '../../../types/world';
import { mockRikishi } from '../../../__tests__/utils';
import * as InjuryService from '../../../systems/health/InjuryService';
import { RNGRegistry } from '../../../core/RNGRegistry';

vi.mock('../../../systems/health/InjuryService', () => ({
  rollWeeklyInjury: vi.fn(),
}));

vi.mock('../../../core/RNGRegistry', () => ({
  RNGRegistry: {
    get: vi.fn().mockReturnValue({ random: () => 0.5 }),
  }
}));

describe('Phase 4: Welfare', () => {
  let world: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();
    world = {
      seed: 'test-seed',
      week: 5,
      playerHeyaId: 'heya-1',
      heyas: new Map([
        ['heya-1', { id: 'heya-1', rikishiIds: ['r1', 'r2', 'r3'] }]
      ]),
      rikishi: new Map([
        ['r1', mockRikishi('r1', { injured: false, fatigue: 50, stats: { stamina: 80 } as any })],
        ['r2', mockRikishi('r2', { injured: true, injuryWeeksRemaining: 2 })],
        ['r3', mockRikishi('r3', { injured: false, fatigue: 10, stats: { stamina: 90 } as any })],
      ]),
      transientContext: {
        activeModifiers: { recoveryMultiplier: 1.5 },
        deltas: { injuriesSustained: [] }
      }
    } as unknown as WorldState;
  });

  it('returns world unchanged if playerHeyaId is missing', () => {
    world.playerHeyaId = undefined;
    const result = phase04_welfare(world);
    expect(result).toBe(world);
  });

  it('returns world unchanged if transientContext activeModifiers are missing', () => {
    world.transientContext = undefined;
    const result = phase04_welfare(world);
    expect(result).toBe(world);
  });

  it('recovers stamina and reduces fatigue for uninjured rikishi', () => {
    (InjuryService.rollWeeklyInjury as any).mockReturnValue(null);

    const result = phase04_welfare(world);

    const r1Next = result.rikishi.get('r1')!;
    // 12 * 1.5 = 18 recovery
    expect((r1Next.stats as any).stamina).toBe(98); // 80 + 18
    expect(r1Next.fatigue).toBe(41); // 50 - 18/2
  });

  it('progresses healing for injured rikishi', () => {
    const result = phase04_welfare(world);

    const r2Next = result.rikishi.get('r2')!;
    // 2 - 1 * 1.5 = 0.5 -> ceil to 1
    expect(r2Next.injuryWeeksRemaining).toBe(1);
    expect(r2Next.injured).toBe(true);

    // One more tick should heal completely
    const world2 = { ...result, rikishi: new Map(result.rikishi) };
    const result2 = phase04_welfare(world2 as any);
    const r2Next2 = result2.rikishi.get('r2')!;
    expect(r2Next2.injuryWeeksRemaining).toBe(0);
    expect(r2Next2.injured).toBe(false);
  });

  it('records new injuries from rollWeeklyInjury', () => {
    (InjuryService.rollWeeklyInjury as any).mockImplementation(({ rikishi }: any) => {
      if (rikishi.id === 'r1') return { weeksOut: 3 };
      return null;
    });

    const result = phase04_welfare(world);

    const r1Next = result.rikishi.get('r1')!;
    expect(r1Next.injured).toBe(true);
    expect(r1Next.injuryWeeksRemaining).toBe(3);

    expect(result.transientContext!.deltas.injuriesSustained).toEqual(['r1']);
  });
});
