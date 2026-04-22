import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

interface GovernanceStrategy {
  evaluateGovernanceDecisions: (world: WorldState, heya: Heya, oyakata: Oyakata) => StateImpact;
}

function evaluateGovernanceBase(
  world: WorldState,
  heya: Heya,
  oyakata: Oyakata,
  minCapital: number,
  scandalThreshold: number,
  spendAmountFn: (capital: number, scandal: number) => number,
  scandalReductionFn: (scandal: number) => number,
  actionName: string,
  reasoning: string,
  extraCondition: () => boolean = () => true
): StateImpact {
  const builder = createImpactBuilder("evaluateGovernanceDecisions");
  const politicalCapital = heya.politicalCapital ?? 50;
  const scandalScore = heya.scandalScore ?? 0;

  if (politicalCapital >= minCapital && scandalScore >= scandalThreshold && extraCondition()) {
    const spendAmount = spendAmountFn(politicalCapital, scandalScore);
    if (politicalCapital >= spendAmount) {
      builder.updateHeya(heya.id, {
        politicalCapital: politicalCapital - spendAmount,
        scandalScore: Math.max(0, scandalScore - scandalReductionFn(scandalScore)),
      });

      builder.logEvent(
        "NPC_MANAGER_DECISION",
        "narrative",
        {
          archetype: oyakata.archetype,
          action: actionName,
          spent: spendAmount,
          reasoning,
        },
        { heyaId: heya.id, importance: "minor" }
      );
    }
  }
  return builder.build();
}

export const DefaultGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const isAmbitious = oyakata.traits.ambition > 70;
    const isTraditionalist = oyakata.traits.tradition > 70;
    const isRiskTaker = oyakata.traits.risk > 60;
    const isCompassionate = oyakata.traits.compassion > 70;

    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 20) return createImpactBuilder("evaluateGovernanceDecisions").build();

    if (scandalScore >= 20 && (isAmbitious || isCompassionate)) {
      return evaluateGovernanceBase(world, heya, oyakata, 20, 20, (cap) => Math.min(20, cap), () => 5, "reduce_scandal",
        isAmbitious ? "Ambitious oyakata spent political capital to protect reputation" : "Compassionate oyakata spent political capital to protect heya members");
    }

    if (isTraditionalist && scandalScore >= 10) {
      return evaluateGovernanceBase(world, heya, oyakata, 15, 10, (cap) => Math.min(15, cap), () => 3, "maintain_standing", "Traditionalist oyakata spent political capital to maintain good standing");
    }

    if (isRiskTaker && politicalCapital < 80) return createImpactBuilder("evaluateGovernanceDecisions").build();

    if (scandalScore >= 15 && politicalCapital >= 25) {
      return evaluateGovernanceBase(world, heya, oyakata, 25, 15, () => 10, () => 2, "maintenance_spend", "Standard political capital maintenance");
    }

    return createImpactBuilder("evaluateGovernanceDecisions").build();
  },
};

export const TraditionalistGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    return evaluateGovernanceBase(world, heya, oyakata, 25, 5, (cap) => Math.min(20, cap), () => 4, "maintain_standing", "Traditionalist spent political capital to preserve traditional standing");
  },
};

export const ScientistGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    return evaluateGovernanceBase(world, heya, oyakata, 20, 25, (cap) => Math.min(15, cap), () => 6, "efficient_scandal_reduction", "Scientist spent political capital efficiently to reduce scandal");
  },
};

export const GamblerGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    return evaluateGovernanceBase(world, heya, oyakata, 15, 15, (cap) => Math.min(30, cap), () => 8, "high_risk_scandal_fix", "Gambler spent political capital aggressively to fix scandal", () => oyakata.traits.risk > 60);
  },
};

export const NurturerGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    return evaluateGovernanceBase(world, heya, oyakata, 20, 10, (cap) => Math.min(18, cap), () => 5, "protect_members", "Nurturer spent political capital to protect heya members", () => oyakata.traits.compassion > 60);
  },
};

export const TyrantGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    const builder = createImpactBuilder("evaluateGovernanceDecisions");
    const politicalCapital = heya.politicalCapital ?? 50;
    const scandalScore = heya.scandalScore ?? 0;

    if (politicalCapital < 30) return builder.build();

    if (scandalScore >= 5) {
      let spendAmount = Math.min(25, politicalCapital);
      if (oyakata.quirks?.includes("Old-School Stickler")) spendAmount = Math.min(40, politicalCapital);
      
      if (politicalCapital >= spendAmount) {
        builder.updateHeya(heya.id, {
          politicalCapital: politicalCapital - spendAmount,
          scandalScore: Math.max(0, scandalScore - 7),
        });
        builder.logEvent("NPC_MANAGER_DECISION", "narrative", { archetype: oyakata.archetype, action: "maintain_power", spent: spendAmount, reasoning: "Tyrant spent political capital aggressively to maintain power" }, { heyaId: heya.id, importance: "minor" });
      }
    }

    if (oyakata.quirks?.includes("Discipline Hawk") && politicalCapital > 40) {
      const remainingCap = (heya.politicalCapital ?? 50) - (scandalScore >= 5 ? Math.min(25, politicalCapital) : 0);
      if (remainingCap >= 15) {
        builder.updateHeya(heya.id, { politicalCapital: remainingCap - 15 });
        builder.logEvent("NPC_MANAGER_DECISION", "narrative", { archetype: oyakata.archetype, action: "enforce_discipline", spent: 15, reasoning: "Tyrant spent political capital to enforce discipline" }, { heyaId: heya.id, importance: "minor" });
      }
    }

    return builder.build();
  },
};

export const StrategistGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    return evaluateGovernanceBase(world, heya, oyakata, 20, 20, (cap) => Math.min(22, cap), () => 7, "strategic_spend", "Strategist timed political capital spend for maximum efficiency");
  },
};

export const StrictGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    let scandalThreshold = 8;
    if (oyakata.traits.patience > 70) scandalThreshold = 12;
    if (oyakata.mood === "anxious") scandalThreshold += 2;
    else if (oyakata.mood === "obsessed") scandalThreshold = Math.max(6, scandalThreshold - 2);

    return evaluateGovernanceBase(world, heya, oyakata, 25, scandalThreshold, (cap) => Math.min(20, cap), () => 5, "maintain_discipline", "Strict spent political capital to maintain discipline");
  },
};

export const IndulgentGovernanceStrategy: GovernanceStrategy = {
  evaluateGovernanceDecisions(world, heya, oyakata) {
    return evaluateGovernanceBase(world, heya, oyakata, 15, 30, (cap) => Math.min(25, cap), () => 10, "lenient_response", "Indulgent spent political capital when scandal became severe");
  },
};

export function getGovernanceStrategy(archetype: OyakataArchetype): GovernanceStrategy {
  switch (archetype) {
    case "traditionalist": return TraditionalistGovernanceStrategy;
    case "scientist": return ScientistGovernanceStrategy;
    case "gambler": return GamblerGovernanceStrategy;
    case "nurturer": return NurturerGovernanceStrategy;
    case "tyrant": return TyrantGovernanceStrategy;
    case "strategist": return StrategistGovernanceStrategy;
    case "strict": return StrictGovernanceStrategy;
    case "indulgent": return IndulgentGovernanceStrategy;
    default: return DefaultGovernanceStrategy;
  }
}
