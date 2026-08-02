import { describe, it, expect, vi, beforeEach } from 'vitest';
import { phase01_week_governance } from '../../../../engine/tick/phases/phase01_week_governance';
import { MockFactory } from '../../../helpers/utils/MockFactory';
import { resolveImpacts } from '../../../../engine/core/ImpactResolver';
import { generateGovernanceHeadline } from '../../../../engine/systems/media/MediaService';
import { ELECTION_WEEK, ELECTION_YEAR_INTERVAL, SCANDAL_SCORE_ALERT_THRESHOLD, SCANDAL_SCORE_HIGH_THRESHOLD } from '../../../../constants/engine/governanceExtended';
import { ELECTION_POLITICAL_CAPITAL_GAIN } from '../../../../constants/engine/governance';

vi.mock('../../../../engine/systems/governance/YokozunaService', () => ({
  YokozunaService: { processYDCCouncil: vi.fn(() => ({ events: [], entities: {} })) },
}));

vi.mock('../../../../engine/lifecycle/CareerService', () => ({
  CareerService: { processRetirements: vi.fn(() => ({ events: [], entities: {} })) },
}));

vi.mock('../../../../engine/systems/media/MediaService', () => ({
  generateGovernanceHeadline: vi.fn(() => ({ events: [], entities: {} })),
  evaluateScandals: vi.fn(() => ({ events: [], entities: {} })),
}));

describe('phase01_week_governance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decays scandal score by 1 each week', () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya('heya_1', { scandalScore: 5 });
    world.heyas.set('heya_1', heya);

    const impact = phase01_week_governance(world);
    const resolved = resolveImpacts(world, [impact]);

    expect(resolved.heyas.get('heya_1')?.scandalScore).toBe(4);
  });

  it('logs alert when player heya crosses critical threshold', () => {
    const world = MockFactory.createWorld({ playerHeyaId: 'player_heya' });
    const heya = MockFactory.createHeya('player_heya', { scandalScore: SCANDAL_SCORE_ALERT_THRESHOLD + 1 });
    world.heyas.set('player_heya', heya);

    const impact = phase01_week_governance(world);
    const events = impact.impacts?.[0]?.events || impact.events || [];

    expect(events.some(e => e.type === 'GOVERNANCE_RULING' && e.heyaId === 'player_heya')).toBeTruthy();
  });

  it('updates governance status based on thresholds and logs headlines', () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya('heya_1', { scandalScore: SCANDAL_SCORE_HIGH_THRESHOLD + 1, governanceStatus: 'good_standing' });
    world.heyas.set('heya_1', heya);

    const impact = phase01_week_governance(world);
    const resolved = resolveImpacts(world, [impact]);

    expect(resolved.heyas.get('heya_1')?.governanceStatus).toBe('sanctioned');
    expect(generateGovernanceHeadline).toHaveBeenCalled();
  });

  it('increases political capital during election week for heya with ichimon', () => {
    const world = MockFactory.createWorld({ week: ELECTION_WEEK, year: ELECTION_YEAR_INTERVAL });
    const heya = MockFactory.createHeya('heya_1', { ichimon: 'Dewanoumi', politicalCapital: 10 });
    world.heyas.set('heya_1', heya);

    const impact = phase01_week_governance(world);
    const resolved = resolveImpacts(world, [impact]);

    expect(resolved.heyas.get('heya_1')?.politicalCapital).toBe(10 + ELECTION_POLITICAL_CAPITAL_GAIN);
  });
});
