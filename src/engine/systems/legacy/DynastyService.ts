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

    for (const heya of world.heyas.values()) {
      const oyakata = world.oyakata?.get(heya.oyakataId);
      if (!oyakata) continue;

      const age = oyakata.age;
      // Readiness reaches 100 at age 60
      const readinessValue = Math.max(0, Math.min(100, (age - 50) * 10));
      const readiness: "stable" | "transitioning" | "mandatory" =
        age >= 60 ? "mandatory" : age >= 55 ? "transitioning" : "stable";

      if (oyakata.successionReadiness !== readiness) {
        builder.updateOyakata(oyakata.id, { successionReadiness: readiness });
        builder.logEvent(
          "GOVERNANCE_RULING",
          "discipline",
          {
            incident: "succession_readiness_update",
            status: age >= 57 ? "warning" : "info",
            reason: `${oyakata.name} is ${age} years old. Mandatory retirement at 60.`,
            score: readinessValue,
          },
          { heyaId: heya.id }
        );
      }

      // Forced succession at 60
      if (age >= 60 && !oyakata.retirementYear) {
        let successorId = oyakata.successorCandidateId;

        // Phase 5 Depth: NPC Auto-Succession
        if (!successorId && !heya.isPlayerOwned) {
          const candidates = this.findEligibleSuccessors(world, heya.id);
          if (candidates.length > 0) {
            successorId = candidates[0].id; // Pick the top eligible candidate
          }
        }

        if (successorId) {
          builder.merge(this.triggerSuccession(world, heya.id, successorId));
        } else {
          // Identify potential alumni/roster successors for player warning
          const candidates = this.findEligibleSuccessors(world, heya.id);
          if (candidates.length > 0 && heya.isPlayerOwned) {
            builder.logEvent(
              "GOVERNANCE_RULING",
              "discipline",
              {
                incident: "succession_overdue",
                status: "critical",
                reason: `${oyakata.name} has reached 60. A successor must be chosen from alumni or current roster.`,
                candidateCount: candidates.length,
              },
              { heyaId: heya.id, importance: "headline" }
            );
          }
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

    for (const rikishi of world.rikishi.values()) {
      // 1. Current roster sekitori (Makuuchi + Juryo)
      const isSekitori = rikishi.division === "makuuchi" || rikishi.division === "juryo";
      if (rikishi.heyaId === heyaId && isSekitori) {
        eligible.push(rikishi.id);
        continue;
      }

      // 2. Alumni tracking (Phase 5)
      const wasAlumnus = rikishi.heyaHistory?.some((h) => h.heyaId === heyaId);
      if (wasAlumnus && isSekitori) {
        // Must be a Sekitori to be eligible for Master status
        if (rikishi.makuuchiWins > 0 || rikishi.rank === "yokozuna") {
          eligible.push(rikishi.id);
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
    const successorRikishi = world.rikishi.get(successorRikishiId);

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

    builder.updateHeya(heyaId, {
      dynasty: [...(heya.dynasty ?? []), record],
      trainingPhilosophy: evolvedPhilosophy,
      legacyTier: newTier,
      oyakataId: successorRikishiId, // Successor becomes the new Oyakata
    });

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "career",
      {
        rikishiId: successorRikishiId,
        shikona: successorRikishi.shikona,
        status: "oyakata_promotion",
        reason: `${currentOyakata.name} has retired. ${successorRikishi.shikona} takes command.`,
        incident: `A new era begins at ${heya.name}.`,
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