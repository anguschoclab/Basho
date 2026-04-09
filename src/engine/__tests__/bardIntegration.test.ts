import { describe, it, expect, vi } from 'vitest';
import * as TalentPoolService from '../systems/generation/TalentPoolService';
import * as RegistryService from '../lifecycle/RegistryService';
import * as NPCStrategyService from '../strategy/NPCStrategyService';
import { WorldState } from '../types/world';
import { logEngineEvent } from '../events';
import { SeededRNG } from '../rng';

vi.mock('../events', () => ({
  logEngineEvent: vi.fn(),
  EventBus: {
    recruitDiscovered: vi.fn(),
    lifecycleEvent: vi.fn(),
    bashoStatus: vi.fn(),
    financialAlert: vi.fn(),
    trainingUpdate: vi.fn(),
    medicalReportBase: vi.fn(),
    welfareCompliance: vi.fn(),
  }
}));

import { EventBus } from '../events';

describe('Bard Engine Integration', () => {
  it('TalentPoolService logs RECRUIT_DISCOVERED with high_talent_signed status', () => {
    const world = {
      week: 2,
      dayIndexGlobal: 1,
      heyas: new Map([['heya-1', { id: 'heya-1', name: 'Test Heya', reputation: 50 }]]),
      talentPool: { 
        candidates: { 
          'c1': { 
            candidateId: 'c1', 
            name: 'Prospect', 
            talentSeed: 95, 
            availabilityState: 'in_talks',
            competingSuitors: [{ heyaId: 'heya-1', interestBand: 'all_in', deadlineWeek: 1 }]
          } 
        },
        pools: {
          high_school: { candidatesVisible: ['c1'] },
          university: { candidatesVisible: [] },
          foreign: { candidatesVisible: [] }
        }
      }
    } as any;

    TalentPoolService.tickWeekTalentPool(world);

    expect(EventBus.recruitDiscovered).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        status: 'high_talent_signed',
        rikishiId: 'c1'
      })
    );
  });

  it('RegistryService logs LIFECYCLE_EVENT with wins_milestone status', () => {
    const world = {
      history: [{}],
      rikishi: new Map([['r1', { id: 'r1', shikona: 'Wrestler 1', careerWins: 99, currentBashoWins: 1 }]]),
    } as any;

    RegistryService.runCareerJournalUpdates(world);

    expect(EventBus.lifecycleEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        status: 'wins_milestone',
        rikishiId: 'r1'
      })
    );
  });

  it('NPCStrategyService resolves dynamic philosophy labels', () => {
    const perception = { 
      welfareRiskBand: 'safe',
      rikishiPerceptions: [],
      rosterSize: 0,
      fatigueRatio: 0
    } as any;
    const rng = new SeededRNG('test');
    
    // Correct order: (perception, riskAppetite, welfareDiscipline, mood, complianceCap, philosophy, providedRng)
    const result = NPCStrategyService.decideTrainingIntensity(
      perception, 
      0.5, 
      0.5, 
      undefined, 
      undefined, 
      'underdog_hunter', 
      rng
    );
    
    expect(result.reason).toContain('Experimental Training'); 
  });
});
