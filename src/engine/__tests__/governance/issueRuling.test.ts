import { describe, it, expect, beforeEach } from 'vitest';
import { issueGovernanceRuling } from '../../governance/GovernanceService';
import type { WorldState } from '../../types/world';

describe('issueGovernanceRuling', () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    mockWorld = {
      heyas: new Map([
        ['heya1', { id: 'heya1', name: 'Heya 1', scandalScore: 20, politicalCapital: 50 } as any]
      ]),
      governanceLog: [
        {
          id: 'ruling1',
          heyaId: 'heya1',
          reason: 'Test event',
          type: 'warning',
          severity: 'medium',
          effects: { scandalScoreDelta: 10 }
        }
      ]
    } as any;
  });

  it('updates the ruling with the player severity and response', () => {
    issueGovernanceRuling(mockWorld, 'ruling1', 'harsh');

    const ruling = mockWorld.governanceLog![0];
    expect(ruling.playerSeverity).toBe('harsh');
    expect(ruling.playerResponse).toBe('Player issued harsh ruling');
  });

  it('adjusts scandal score and political capital when lenient', () => {
    // originalDelta is 10. lenient multiplier is 0.5.
    // adjustedDelta = 5
    // current scandalScore is 20
    // new score = Math.max(0, 20 - (10 - 5)) = 15
    issueGovernanceRuling(mockWorld, 'ruling1', 'lenient');

    const heya = mockWorld.heyas.get('heya1');
    expect(heya!.scandalScore).toBe(15);

    // capital 50 - 10 = 40
    expect(heya!.politicalCapital).toBe(40);

    const ruling = mockWorld.governanceLog![0];
    expect(ruling.effects.scandalScoreDelta).toBe(5);
  });

  it('adjusts scandal score and political capital when standard', () => {
    // originalDelta is 10. standard multiplier is 1.0.
    // adjustedDelta = 10
    // new score = Math.max(0, 20 - (10 - 10)) = 20
    issueGovernanceRuling(mockWorld, 'ruling1', 'standard');

    const heya = mockWorld.heyas.get('heya1');
    expect(heya!.scandalScore).toBe(20);

    // capital unchanged for standard? Wait, code only has:
    // if (severity === 'lenient') ... else if (severity === 'harsh') ...
    expect(heya!.politicalCapital).toBe(50);

    const ruling = mockWorld.governanceLog![0];
    expect(ruling.effects.scandalScoreDelta).toBe(10);
  });

  it('adjusts scandal score and political capital when harsh', () => {
    // originalDelta is 10. harsh multiplier is 1.5.
    // adjustedDelta = 15
    // new score = Math.max(0, 20 - (10 - 15)) = 25
    issueGovernanceRuling(mockWorld, 'ruling1', 'harsh');

    const heya = mockWorld.heyas.get('heya1');
    expect(heya!.scandalScore).toBe(25);

    // capital 50 + 5 = 55
    expect(heya!.politicalCapital).toBe(55);

    const ruling = mockWorld.governanceLog![0];
    expect(ruling.effects.scandalScoreDelta).toBe(15);
  });

  it('does not reduce political capital below 0 when lenient', () => {
    mockWorld.heyas.get('heya1')!.politicalCapital = 5;
    issueGovernanceRuling(mockWorld, 'ruling1', 'lenient');
    expect(mockWorld.heyas.get('heya1')!.politicalCapital).toBe(0);
  });

  it('does not increase political capital above 100 when harsh', () => {
    mockWorld.heyas.get('heya1')!.politicalCapital = 98;
    issueGovernanceRuling(mockWorld, 'ruling1', 'harsh');
    expect(mockWorld.heyas.get('heya1')!.politicalCapital).toBe(100);
  });

  it('does not reduce scandal score below 0', () => {
    mockWorld.heyas.get('heya1')!.scandalScore = 2;
    issueGovernanceRuling(mockWorld, 'ruling1', 'lenient');
    // new score Math.max(0, 2 - (10 - 5)) = Math.max(0, -3) = 0
    expect(mockWorld.heyas.get('heya1')!.scandalScore).toBe(0);
  });
});
