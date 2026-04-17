/**
 * dramaGenerator.ts
 * ==================
 * Generates "Drama Events" (Scandals, Grudges, Crises) based on world state.
 * Triggered during the daily tick.
 */

import type { WorldState } from "../types/world";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { mergeImpacts } from "../core/ImpactResolver";
import { rngForWorld } from "../rng";
import { stableSort } from "../utils/sort";
import type { ActiveCrisis, CrisisType } from "../types/crises";

export interface DramaEvent {
  id: string;
  type: "SCANDAL" | "GRUDGE_BATTLE" | "CRISIS";
  severity: "minor" | "major" | "critical";
  title: string;
  summary: string;
  rikishiId?: string;
  heyaId?: string;
}

/**
 * Main entry point for drama generation during a tick.
 * Returns StateImpact describing drama generation instead of mutating directly.
 */
export function processDramaTick(world: WorldState): StateImpact {
  const builder = createImpactBuilder("processDramaTick");
  const rng = rngForWorld(world, "narrative", "drama");

  // Daily chance for drama
  if (rng.next() > 0.95) {
    generateRandomDrama(world);
  }

  // Specific triggers (e.g., high debt, low compliance)
  const triggeredImpact = checkTriggeredDrama(world);

  return mergeImpacts([builder.build(), triggeredImpact]);
}

function generateRandomDrama(world: WorldState): StateImpact {
  const builder = createImpactBuilder("generateRandomDrama");
  const rng = rngForWorld(world, "narrative", "drama_random");
  const eventType = rng.int(0, 2);

  if (eventType === 0) {
    // Scandal
    const rikishis = stableSort(world.rikishi.values(), (x) => x.id);
    const target = rikishis[rng.int(0, rikishis.length - 1)];
    if (target) {
      builder.logEvent(
        "GOVERNANCE_RULING",
        "discipline",
        {
          rikishiId: target.id,
          shikona: target.shikona,
          incident: "curfew_violation",
        },
        { heyaId: target.heyaId, importance: "notable" }
      );
    }
  } else if (eventType === 1) {
    // Grudge formation
    const oyakatas = stableSort(world.oyakata.values(), (x) => x.id);
    if (oyakatas.length < 2) return builder.build();
    const a = oyakatas[rng.int(0, oyakatas.length - 1)];
    const b = oyakatas[rng.int(0, oyakatas.length - 1)];
    if (a.id !== b.id) {
      if (!a.grudges) a.grudges = [];
      if (!a.grudges.includes(b.heyaId)) {
        const newGrudges = [...a.grudges, b.heyaId];
        // Note: oyakata updates are not directly supported by ImpactBuilder yet
        // For now, we'll update them directly as oyakata is a Map, not a standard entity
        a.grudges = newGrudges;

        builder.logEvent(
          "RIVALRY_HEAT_SPIKE",
          "rivalry",
          {
            winnerRikishiId: a.id,
            loserRikishiId: b.id,
            winner: a.name,
            loser: b.name,
            status: "formed",
            heat: 15,
          },
          { heyaId: a.heyaId }
        );
      }
    }
  }

  return builder.build();
}

function checkTriggeredDrama(world: WorldState): StateImpact {
  const builder = createImpactBuilder("checkTriggeredDrama");

  // Check for financial crisis
  for (const heya of stableSort(world.heyas.values(), (x) => x.id)) {
    if (heya.funds < 0 && !heya.riskIndicators?.financial) {
      builder.logEvent(
        "FINANCIAL_ALERT",
        "economy",
        {
          heyaname: heya.name,
          incident: "insolvency",
          money: heya.funds,
        },
        { heyaId: heya.id }
      );
      if (heya.isPlayerOwned) {
        // This triggers a CrisisModal in the UI by attaching an ActiveCrisis to the heya
        const crisisImpact = triggerCrisis(world, heya.id, "financial_insolvency");
        return mergeImpacts([builder.build(), crisisImpact]);
      }
    }
  }

  return builder.build();
}

function triggerCrisis(world: WorldState, heyaId: string, type: CrisisType): StateImpact {
  const builder = createImpactBuilder("triggerCrisis");
  const rng = rngForWorld(world, "narrative", `crisis_${heyaId}_${world.week}`);

  let crisis: ActiveCrisis | undefined;

  if (type === "financial_insolvency") {
    crisis = {
      id: rng.uuid("CRISIS"),
      type: "financial_insolvency",
      title: "Imminent Bankruptcy",
      description:
        "The stable's funds are dangerously close to zero. Creditors are demanding immediate action before forcing liquidation.",
      severity: "critical",
      generatedAtWeek: world.week,
      options: [
        {
          id: "seek_pardon",
          label: "Plead with JSA",
          description: "Beg the JSA for a grace period. High risk of prestige loss and sanctions.",
          prestigeCost: 15,
          consequences: {
            resolutionSuccess: true,
            narrativeText:
              "The JSA grants a temporary reprieve, but the stable's reputation suffers greatly.",
          },
        },
        {
          id: "emergency_loan",
          label: "Take Predatory Loan",
          description: "Borrow ¥10,000,000 from loan sharks at exorbitant interest rates.",
          consequences: {
            resolutionSuccess: true,
            narrativeText: "You secure the funds, but the stable's future is heavily mortgaged.",
          },
        },
      ],
    };
  }

  if (crisis) {
    builder.updateHeya(heyaId, { activeCrisis: crisis });
    builder.logEvent(
      "GOVERNANCE_RULING",
      "narrative",
      {
        incident: "crisis_triggered",
        reason: crisis.type,
      },
      { heyaId, importance: "headline" }
    );
  }

  return builder.build();
}
