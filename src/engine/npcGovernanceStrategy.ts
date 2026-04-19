import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { EventBus } from "./events";
import { trySpendResource } from "./strategy/NPCStrategyFramework";

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

    // Helper: spend capital and return true if successful

    // 1. Reduce scandal score if it's high and oyakata is ambitious or compassionate
    if (scandalScore >= 20 && (isAmbitious || isCompassionate)) {
      const spendAmount = Math.min(20, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 5);

        const reason = isAmbitious
          ? "Ambitious oyakata spent political capital to protect reputation"
          : "Compassionate oyakata spent political capital to protect heya members";

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "reduce_scandal",
            spent: spendAmount,
            reasoning: reason,
          },
          "minor"
        );
        return;
      }
    }

    // 2. Traditionalists spend political capital to maintain standing
    if (isTraditionalist && scandalScore >= 10) {
      const spendAmount = Math.min(15, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 3);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "maintain_standing",
            spent: spendAmount,
            reasoning: "Traditionalist oyakata spent political capital to maintain good standing",
          },
          "minor"
        );
        return;
      }
    }

    // 3. Risk-takers might hoard political capital for future opportunities
    if (isRiskTaker && politicalCapital < 80) {
      return;
    }

    // 4. Default: small maintenance spend if scandal is present
    if (scandalScore >= 15 && politicalCapital >= 25) {
      if (trySpendResource(heya, "politicalCapital", 10)) {
        heya.scandalScore = Math.max(0, scandalScore - 2);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "maintenance_spend",
            spent: 10,
            reasoning: "Standard political capital maintenance",
          },
          "minor"
        );
      }
    }
  },
};

export const TraditionalistGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 25) return;

    // Traditionalists aggressively maintain standing to preserve tradition
    if (scandalScore >= 5) {
      const spendAmount = Math.min(20, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 4);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "maintain_standing",
            spent: spendAmount,
            reasoning: "Traditionalist spent political capital to preserve traditional standing",
          },
          "minor"
        );
      }
    }
  },
};

export const ScientistGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 20) return;

    // Scientists spend efficiently, only when scandal is significant
    if (scandalScore >= 25) {
      const spendAmount = Math.min(15, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 6);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "efficient_scandal_reduction",
            spent: spendAmount,
            reasoning: "Scientist spent political capital efficiently to reduce scandal",
          },
          "minor"
        );
      }
    }
  },
};

export const GamblerGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 15) return;

    // Gamblers take risks - they might spend large amounts to fix scandals quickly
    if (scandalScore >= 15 && oyakata.traits.risk > 60) {
      const spendAmount = Math.min(30, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 8);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "high_risk_scandal_fix",
            spent: spendAmount,
            reasoning: "Gambler spent political capital aggressively to fix scandal",
          },
          "minor"
        );
      }
    }
  },
};

export const NurturerGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 20) return;

    // Nurturers spend to protect heya members from scandal fallout
    if (scandalScore >= 10 && oyakata.traits.compassion > 60) {
      const spendAmount = Math.min(18, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 5);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "protect_members",
            spent: spendAmount,
            reasoning: "Nurturer spent political capital to protect heya members",
          },
          "minor"
        );
      }
    }
  },
};

export const TyrantGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 30) return;

    // Tyrants spend aggressively to maintain power
    if (scandalScore >= 5) {
      let spendAmount = Math.min(25, politicalCapital);
      // Old-School Stickler quirk increases spending to maintain traditional authority
      if (oyakata.quirks?.includes("Old-School Stickler")) {
        spendAmount = Math.min(40, politicalCapital);
      }
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 7);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "maintain_power",
            spent: spendAmount,
            reasoning: "Tyrant spent political capital aggressively to maintain power",
          },
          "minor"
        );
      }
    }

    // Discipline Hawk quirk causes tyrants to spend capital to enforce discipline
    if (oyakata.quirks?.includes("Discipline Hawk") && politicalCapital > 40) {
      if (trySpendResource(heya, "politicalCapital", 15)) {
        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "enforce_discipline",
            spent: 15,
            reasoning: "Tyrant spent political capital to enforce discipline",
          },
          "minor"
        );
      }
    }
  },
};

export const StrategistGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 20) return;

    // Strategists time their spending for maximum efficiency
    if (scandalScore >= 20) {
      const spendAmount = Math.min(22, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 7);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "strategic_spend",
            spent: spendAmount,
            reasoning: "Strategist timed political capital spend for maximum efficiency",
          },
          "minor"
        );
      }
    }
  },
};

export const StrictGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 25) return;

    // Strict spend to maintain discipline and avoid any scandal
    // High patience leads to more calculated spending (only when necessary)
    let scandalThreshold = 8;
    if (oyakata.traits.patience > 70) {
      scandalThreshold = 12; // More patient strict oyakata tolerate more scandal before acting
    }

    // Mood affects political spending
    if (oyakata.mood === "anxious") {
      scandalThreshold += 2; // Anxious strict oyakata are more hesitant to spend political capital
    } else if (oyakata.mood === "obsessed") {
      scandalThreshold = Math.max(6, scandalThreshold - 2); // Obsessed strict oyakata spend more aggressively
    }

    if (scandalScore >= scandalThreshold) {
      const spendAmount = Math.min(20, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 5);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "maintain_discipline",
            spent: spendAmount,
            reasoning: "Strict spent political capital to maintain discipline",
          },
          "minor"
        );
      }
    }
  },
};

export const IndulgentGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 15) return;

    // Indulgent are more lenient, only spend when scandal is severe
    if (scandalScore >= 30) {
      const spendAmount = Math.min(25, politicalCapital);
      if (trySpendResource(heya, "politicalCapital", spendAmount)) {
        heya.scandalScore = Math.max(0, scandalScore - 10);

        EventBus.managementDecision(
          world,
          heya.id,
          {
            archetype: oyakata.archetype,
            action: "lenient_response",
            spent: spendAmount,
            reasoning: "Indulgent spent political capital when scandal became severe",
          },
          "minor"
        );
      }
    }
  },
};

export function getGovernanceStrategy(archetype: OyakataArchetype): GovernanceStrategy {
  switch (archetype) {
    case "traditionalist":
      return TraditionalistGovernanceStrategy;
    case "scientist":
      return ScientistGovernanceStrategy;
    case "gambler":
      return GamblerGovernanceStrategy;
    case "nurturer":
      return NurturerGovernanceStrategy;
    case "tyrant":
      return TyrantGovernanceStrategy;
    case "strategist":
      return StrategistGovernanceStrategy;
    case "strict":
      return StrictGovernanceStrategy;
    case "indulgent":
      return IndulgentGovernanceStrategy;
    default:
      return DefaultGovernanceStrategy;
  }
}
