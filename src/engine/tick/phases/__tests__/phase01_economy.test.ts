import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phase01_economy } from '../phase01_economy';
import type { WorldState } from '../../../types/world';
import { mockRikishi } from '../../../__tests__/utils';
import * as SponsorshipService from '../../../systems/economics/SponsorshipService';

vi.mock('../../../systems/economics/SponsorshipService', () => ({
  calculateKoenkaiIncome: vi.fn(),
}));

describe('Phase 1: Economy', () => {
  let world: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();
    world = {
      heyas: new Map([
        ['heya-1', {
          id: 'heya-1',
          funds: 100000,
          koenkaiBand: 'modest',
          rikishiIds: ['r1', 'r2'],
          facilities: { training: 10, recovery: 10, nutrition: 10 },
          staffIds: ['s1']
        } as any]
      ]),
      rikishi: new Map([
        ['r1', mockRikishi('r1', { rank: 'yokozuna' })], // sekitori, high salary
        ['r2', mockRikishi('r2', { rank: 'jonokuchi' })], // non-sekitori allowance
      ]),
    } as unknown as WorldState;
  });

  it('calculates revenue and expenses and updates heya funds', () => {
    // mock monthly koenkai = 4_000_000 => weekly = 1_000_000
    (SponsorshipService.calculateKoenkaiIncome as any).mockReturnValue(4_000_000);

    const result = phase01_economy(world);

    // Revenue: 1_000_000
    // Expenses calculation:
    // r1 (yokozuna): salary 3_000_000 / 4 = 750_000
    // r2 (jonokuchi): NON_SEKITORI_ALLOWANCE = 15_000
    // facilities: 10*1000 + 10*1000 + 10*2000 = 40_000
    // staff: 1 * 6_000 = 6_000
    // oyakata: 1_200_000 / 4 = 300_000
    // recruitment budget: 100_000
    // Total burn = 750000 + 15000 + 40000 + 6000 + 300000 + 100000 = 1_211_000

    // Since income 1_000_000 < totalBurn 1_211_000:
    // Income > 28_000 so effectiveBurn = effectiveIncome = 1_000_000

    expect(result.transientContext!.deltas.revenue).toBe(1_000_000);
    expect(result.transientContext!.deltas.expenses).toBe(1_000_000);
    expect(result.heyas.get('heya-1')!.funds).toBe(100000); // Net 0
  });

  it('caps income at KOENKAI_SURVIVAL_FLOOR and sets burn appropriately', () => {
    // 0 koenkai
    (SponsorshipService.calculateKoenkaiIncome as any).mockReturnValue(0);

    // baseBurn = 750000 + 15000 + 40000 + 6000 = 811_000
    const result = phase01_economy(world);

    // effectiveIncome = max(0, 28000) = 28000
    // effectiveBurn = max(baseBurn, 28000) = baseBurn = 811_000
    // Net = 28000 - 811000 = -783_000

    expect(result.transientContext!.deltas.revenue).toBe(28_000);
    expect(result.transientContext!.deltas.expenses).toBe(811_000);
    expect(result.heyas.get('heya-1')!.funds).toBe(100000 - 783000); // Negative funds
  });
});
