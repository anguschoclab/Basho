import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import { spendPoliticalCapital } from "./governance/GovernanceService";
import { EventBus } from "./events";

interface GovernanceStrategy {
  evaluateGovernanceDecisions: (world: WorldState, heya: Heya, oyakata: Oyakata) => void;
}

export const DefaultGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world: WorldState, heya: Heya, oyakata: Oyakata) {
    // Personality-driven governance decisions
    const isAmbitious = oyakata.traits.ambition > 70;
    const isTraditionalist = oyakata.traits.tradition > 70;
    const isRiskTaker = oyakata.traits.risk > 60;
    const isCompassionate = oyakata.traits.compassion > 70;

    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    // Only spend political capital if we have enough (minimum 20)
    if (politicalCapital < 20) return;

    // Decision scenarios where political capital might be spent

    // 1. Reduce scandal score if it's high and oyakata is ambitious or compassionate
    if (scandalScore >= 20 && (isAmbitious || isCompassionate)) {
      // Spend political capital to reduce scandal impact
      const spendAmount = Math.min(20, politicalCapital);
      const success = spendPoliticalCapital(world, heya.id, spendAmount);
      
      if (success) {
        // Reduce scandal score as a result
        heya.scandalScore = Math.max(0, scandalScore - 5);
        
        const reason = isAmbitious
          ? "Ambitious oyakata spent political capital to protect reputation"
          : "Compassionate oyakata spent political capital to protect heya members";
        
        EventBus.managementDecision(world, heya.id, {
          archetype: oyakata.archetype,
          action: "reduce_scandal",
          spent: spendAmount,
          reasoning: reason
        }, "minor");
        return;
      }
    }

    // 2. Traditionalists spend political capital to maintain standing
    if (isTraditionalist && scandalScore >= 10) {
      const spendAmount = Math.min(15, politicalCapital);
      const success = spendPoliticalCapital(world, heya.id, spendAmount);
      
      if (success) {
        heya.scandalScore = Math.max(0, scandalScore - 3);
        
        EventBus.managementDecision(world, heya.id, {
          archetype: oyakata.archetype,
          action: "maintain_standing",
          spent: spendAmount,
          reasoning: "Traditionalist oyakata spent political capital to maintain good standing"
        }, "minor");
        return;
      }
    }

    // 3. Risk-takers might hoard political capital for future opportunities
    if (isRiskTaker && politicalCapital < 80) {
      // Don't spend, just hoard for future use
      return;
    }

    // 4. Default: small maintenance spend if scandal is present
    if (scandalScore >= 15 && politicalCapital >= 25) {
      const spendAmount = 10;
      const success = spendPoliticalCapital(world, heya.id, spendAmount);
      
      if (success) {
        heya.scandalScore = Math.max(0, scandalScore - 2);
        
        EventBus.managementDecision(world, heya.id, {
          archetype: oyakata.archetype,
          action: "maintenance_spend",
          spent: spendAmount,
          reasoning: "Standard political capital maintenance"
        }, "minor");
      }
    }
  }
};

export function getGovernanceStrategy(archetype: string): GovernanceStrategy {
  return DefaultGovernanceStrategy;
}
