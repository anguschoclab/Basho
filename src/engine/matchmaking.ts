// Matchmaking utilities
import { MinutePlan, FightingStyle, WarriorMeta, defaultPlanForWarrior } from './stub';

type Matchup = {
  planA: MinutePlan;
  planD: MinutePlan;
};

// Placeholder matchmaking - returns empty array until roster is wired
export function pickWeeklyMatchups(): Matchup[] {
  // In a real implementation, this would pull from the roster
  // and prevent stablemates from fighting in regular weeks
  return [];
}

export function createMatchup(warriorA: WarriorMeta, warriorD: WarriorMeta): Matchup {
  return {
    planA: defaultPlanForWarrior(warriorA),
    planD: defaultPlanForWarrior(warriorD),
  };
}
