// @ts-nocheck
/**
 * DynastyService.ts
 * =================
 * Orchestrates multi-generational stable succession.
 * (Phase 5: The Legacy Engine)
 *
 * Design decisions applied:
 * - Successor can be designated at any time (no age lock)
 * - Succession is forced when Oyakata age >= 70
 * - "Dynasty" legacyTier grants +5% training multiplier
 */

import type { WorldState } from "../../types/world";
import type { DynastyRecord } from "../../types/dynasty";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { TrainingPhilosophyService } from "./TrainingPhilosophyService";

export const DynastyService = {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Succession Readiness
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Weekly check: updates successionReadiness on each Oyakata.
   * Returns warnings for the player as they approach the age 60 retirement cliff.
   */
  tickSuccessionCheck(world: WorldState): StateImpact {
    const builder = createImpactBuilder("tickSuccessionCheck");

    for (const [heyaId, heya] of world.heyas) {
      const oyakata = world.oyakata?.get(heya.oyakataId || "");
      if (!oyakata) continue;

      const age = oyakata.age;

      // 1. Soft Readiness (60-65)
      // Readiness reaches 100 at age 65 (JSA Rules)
      const readinessValue = Math.max(0, Math.min(100, (age - 55) * 10));
      const readiness: "stable" | "transitioning" | "mandatory" =
        age >= 65 ? "mandatory" : age >= 60 ? "transitioning" : "stable";

      if (oyakata.successionReadiness !== readiness) {
        builder.updateOyakata(oyakata.id, { successionReadiness: readiness });
        builder.logEvent(
          "GOVERNANCE_RULING",
          "discipline",
          {
            incident: "succession_readiness_update",
            status: age >= 62 ? "warning" : "info",
            reason: `${oyakata.name} is ${age} years old. Mandatory retirement at 65 (JSA).`,
            score: readinessValue,
          },
          { heyaId: heya.id }
        );
      }

      // Forced succession at 65
      if (age >= 65 && !oyakata.retirementYear) {
        const eligible = this.findEligibleSuccessors(world, heya.id);
        if (eligible.length > 0) {
          const successorId = eligible[0]; // Pick the top eligible candidate
          builder.merge(this.triggerSuccession(world, heya.id, successorId));
        } else {
          // Fallback: Generate a generic oyakata if no rikishi is eligible
          const dummyId = `oyakata_trustee_${heya.id}_${world.year}`;
          builder.merge(this.triggerSuccessionWithGeneric(world, heya.id, dummyId));
        }
      }
    }

    return builder.build();
  },

  /**
   * Finds eligible successors for a stable.
   * Includes:
   * 1. Current roster members (Sekitori rank preferred).
   * 2. Alumni (formerly trained at this stable) who are currently retired or at other stables.
   */
  findEligibleSuccessors(world: WorldState, heyaId: string): string[] {
    const eligible: string[] = [];

    // 1. Current roster & alumni
    for (const rikishi of world.rikishi.values()) {
      const isSekitori = rikishi.division === "makuuchi" || rikishi.division === "juryo";
      // Elite candidates: Current sekitori or high-performing alumni
      if (rikishi.heyaId === heyaId && isSekitori) {
        eligible.push(rikishi.id);
        continue;
      }

      const wasAlumnus = rikishi.heyaHistory?.some((h) => h.heyaId === heyaId);
      if (wasAlumnus && isSekitori && (rikishi.makuuchiWins > 0 || rikishi.rank === "yokozuna")) {
        eligible.push(rikishi.id);
      }
    }

    // 1.5. Drought Fallback: Senior Makushita from current roster
    if (eligible.length === 0) {
      for (const rikishi of world.rikishi.values()) {
        if (
          rikishi.heyaId === heyaId &&
          rikishi.division === "makushita" &&
          (rikishi.rankNumber || 99) <= 10
        ) {
          eligible.push(rikishi.id);
        }
      }
    }

    // 2. Fallback: Check historical rikishi (retired legends)
    if (eligible.length === 0 && world.historicalRikishi) {
      for (const [id, r] of world.historicalRikishi) {
        if (r.highestRank === "yokozuna" || r.highestRank === "ozeki") {
          eligible.push(id);
        }
      }
    }

    return eligible;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Succession Execution
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retires the current Oyakata and promotes the designated successor.
   * Writes a DynastyRecord and mutates the stable's TrainingPhilosophy.
   */
  triggerSuccession(world: WorldState, heyaId: string, successorRikishiId: string): StateImpact {
    const builder = createImpactBuilder("triggerSuccession");
    const heya = world.heyas.get(heyaId);
    const currentOyakata = world.oyakata?.get(heya?.oyakataId ?? "");
    const successorIsActive = world.rikishi.has(successorRikishiId);
    const successorRikishi =
      world.rikishi.get(successorRikishiId) ?? world.historicalRikishi?.get(successorRikishiId);

    if (!heya || !currentOyakata || !successorRikishi) return builder.build();

    // 1. Write the dynasty record for the retiring Oyakata
    const record: DynastyRecord = {
      era: (heya.dynasty?.length ?? 0) + 1,
      oyakataId: currentOyakata.id,
      oyakataName: currentOyakata.name,
      reignFrom: world.year - (currentOyakata.yearsInCharge ?? 0),
      reignTo: world.year,
      achievementsInReign: {
        yushoCount: heya.historicalYusho ?? 0,
        globalCupWins: 0,
        hofInductees: [],
        boardSeatsWon: 0,
      },
      trainingPhilosophyAtReign: heya.trainingPhilosophy ?? TrainingPhilosophyService.getDefault(),
    };

    // 2. Evolve the Training Philosophy under the successor's archetype
    const evolvedPhilosophy = TrainingPhilosophyService.evolveForSuccessor(
      heya.trainingPhilosophy ?? TrainingPhilosophyService.getDefault(),
      currentOyakata
    );

    // 3. Update legacy tier
    const newEra = record.era;
    const newTier = this.deriveLegacyTier(heya, newEra);

    // 4. Create the new Oyakata entity
    const newOyakataId = `oyakata_promoted_${successorRikishiId}`;
    const newOyakata = {
      id: newOyakataId,
      heyaId: heyaId,
      name: `${successorRikishi.shikona} Oyakata`,
      shikona: successorRikishi.shikona,
      formerShikona: successorRikishi.shikona,
      highestRank: successorRikishi.rank,
      age: world.year - successorRikishi.birthYear,
      yearsInCharge: 0,
      archetype: "traditionalist", // Default or derived from rikishi archetype
      traits: {
        ambition: 50,
        patience: 50,
        risk: 50,
        tradition: 50,
        compassion: 50,
      },
      successionReadiness: 0,
      avatarConfig: successorRikishi.avatarConfig,
      formerRikishiId: successorRikishiId,
    };

    builder.addOyakata(newOyakata as any);

    // 5. Retire the rikishi (only if still active) and assign the new Oyakata to the stable
    if (successorIsActive) {
      builder.retireRikishi(successorRikishiId, world.year, "Promoted to Oyakata");
    }
    builder.updateHeya(heyaId, {
      dynasty: [...(heya.dynasty ?? []), record],
      trainingPhilosophy: evolvedPhilosophy,
      legacyTier: newTier,
      oyakataId: newOyakataId,
    });

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "narrative",
      {
        rikishiId: successorRikishiId,
        shikona: successorRikishi.shikona,
        status: "oyakata_promotion",
        reason: `${currentOyakata.name} has reached the JSA retirement age of 65. ${successorRikishi.shikona} takes command.`,
        incident: `A new era begins at ${heya.name}.`,
      },
      { heyaId, importance: "headline" }
    );

    return builder.build();
  },

  /**
   * Fallback for when no eligible rikishi exists. JSA appoints a trustee.
   */
  triggerSuccessionWithGeneric(world: WorldState, heyaId: string, dummyId: string): StateImpact {
    const builder = createImpactBuilder("triggerSuccessionWithGeneric");
    const heya = world.heyas.get(heyaId);
    const currentOyakata = world.oyakata?.get(heya?.oyakataId ?? "");

    if (!heya || !currentOyakata) return builder.build();

    const name = `JSA Trustee (${currentOyakata.shikona} lineage)`;

    const newOyakata: any = {
      id: dummyId,
      heyaId,
      name,
      shikona: "Trustee",
      age: 45,
      yearsInCharge: 0,
      archetype: "traditionalist",
      traits: { ambition: 30, patience: 50, risk: 20, tradition: 80, compassion: 50 },
      successionReadiness: 0,
    };

    builder.addOyakata(newOyakata);
    builder.updateHeya(heyaId, { oyakataId: dummyId });
    builder.removeOyakata(currentOyakata.id);

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "narrative",
      {
        status: "oyakata_promotion",
        reason: `${currentOyakata.name} has retired. JSA has appointed a trustee for ${heya.name}.`,
      },
      { heyaId, importance: "headline" }
    );

    return builder.build();
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Legacy Tier Assessment
  // ──────────────────────────────────────────────────────────────────────────

  deriveLegacyTier(
    heya: ReturnType<WorldState["heyas"]["get"]> & object,
    successionCount: number
  ): "emerging" | "established" | "dynasty" | "legend" {
    const yusho = heya.historicalYusho ?? 0;
    if (successionCount >= 5 && yusho >= 20) return "legend";
    if (successionCount >= 3 && yusho >= 10) return "dynasty";
    if (successionCount >= 1 && yusho >= 3) return "established";
    return "emerging";
  },

  /**
   * Returns the training multiplier bonus granted by a stable's legacy tier.
   * Dynasty tier gives +5% as per the design decision.
   */
  getLegacyTierTrainingBonus(tier: string | undefined): number {
    switch (tier) {
      case "legend":
        return 1.1; // +10%
      case "dynasty":
        return 1.05; // +5%
      case "established":
        return 1.02;
      default:
        return 1.0;
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Chronicle Room Data
  // ──────────────────────────────────────────────────────────────────────────

  generateDynastyReport(world: WorldState, heyaId: string) {
    const heya = world.heyas.get(heyaId);
    if (!heya?.dynasty) return null;

    // Bankrupt stables get a "Scholarship Quota" of at least 1 (A6.2)
    if (heya.funds < 0) return 1;

    return {
      eras: heya.dynasty,
      currentEra: heya.dynasty.length + 1,
      totalYusho: heya.historicalYusho ?? 0,
      legacyTier: heya.legacyTier ?? "emerging",
      trainingPhilosophy: heya.trainingPhilosophy ?? TrainingPhilosophyService.getDefault(),
      trainingBonus: this.getLegacyTierTrainingBonus(heya.legacyTier),
    };
  },
};
