/**
 * phase06_yearly_boundary.ts
 * ==========================
 * Pipeline Phase: Yearly Institutional Updates.
 *
 * Responsibilities:
 * 1. Process Hall of Fame inductions.
 * 2. Refresh talent pool.
 * 3. Age staff members and advance career phases.
 * 4. Record era shifts and decade boundaries.
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { processYearEndInduction } from "../../hallOfFame";
import * as npcAI from "../../npcAI";
import { RNGRegistry } from "../../core/RNGRegistry";
import type { CombatArchetype, Style } from "../../types/combat";
import type { TalentCandidate } from "../../types/talent";
import { generateRikishiName } from "../../shikona";
import { updateAvatarForAging, updateHairstyleForPromotion } from "../../avatarGenerator";
import { processYearlyEraDrift } from "../../systems/meta/EraDriftService";
import { InfrastructureService } from "../../systems/economy/InfrastructureService";
import { GlobalCupService } from "../../systems/basho/GlobalCupService";
import { HistoryService } from "../../systems/meta/HistoryService";

export function phase06_yearly_boundary(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase06_yearly_boundary");
  const boundaries = world.transientContext?.boundaries;
  if (!boundaries?.yearBoundary) return builder.build();

  // 0. Era Drift & Meta Evolution (E6)
  const eraImpact = processYearlyEraDrift(world);
  builder.merge(eraImpact);

  // 0.1 Infrastructure Construction Tick (P2)
  const infraImpact = InfrastructureService.processCompletionTick(world);
  builder.merge(infraImpact);

  // 0.2 Global Cup & Worlds Exhibition (Phase 3)
  const cupImpact = GlobalCupService.processGlobalCup(world);
  builder.merge(cupImpact);

  // 0.3 All-Time Records & Legacy (Phase 3)
  // Update records for all active rikishi at year end
  for (const rikishi of world.rikishi.values()) {
    if (rikishi.careerWins > 100 || rikishi.rank === "yokozuna") {
      builder.merge(HistoryService.updateAllTimeRecords(world, rikishi));
    }
  }

  // 1. Hall of Fame Inductions
  // Note: hallOfFame.ts is currently mutative on world.hallOfFame.
  // We'll clone the hallOfFame state first.
  if (world.hallOfFame) {
    world.hallOfFame = {
      ...world.hallOfFame,
      inductees: [...world.hallOfFame.inductees],
      inducted: { ...world.hallOfFame.inducted },
    };
  }

  const inductees = processYearEndInduction(world);

  for (const inductee of inductees) {
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "career",
      {
        rikishiId: inductee.rikishiId,
        shikona: inductee.shikona,
        status: "hof_induction",
        reason: inductee.category,
        score: inductee.stats.yushoCount ?? 0,
      },
      { rikishiId: inductee.rikishiId }
    );
  }

  // 2. Talent Pool Refresh
  // Generate new candidates yearly and age out old unrecruited candidates
  if (world.talentPool) {
    const rng = RNGRegistry.getSystemRNG(world, "scouting", `year-${world.year}`);
    const candidates = { ...world.talentPool.candidates };

    // Age out candidates who weren't recruited (keep for 3 years max)
    const currentYear = world.year;
    const idsToDelete: string[] = [];
    for (const [id, candidate] of Object.entries(candidates)) {
      const cand = candidate as TalentCandidate;
      const age = currentYear - cand.birthYear;
      // Remove if too old (25+) or been in pool for 3+ years
      if (age >= 25 || cand.availabilityState === "withdrawn") {
        idsToDelete.push(id);
      }
    }
    // Reconstruct object without deleted keys
    const newCandidates: Record<string, TalentCandidate> = {};
    for (const [id, candidate] of Object.entries(candidates)) {
      if (!idsToDelete.includes(id)) {
        newCandidates[id] = candidate as TalentCandidate;
      }
    }
    Object.assign(candidates, newCandidates);

    // Generate 5-10 new candidates per year
    const newCandidateCount = 5 + rng.int(0, 6);
    const archetypes: CombatArchetype[] = [
      "oshi",
      "yotsu",
      "tsuppari",
      "giant",
      "trickster",
      "hybrid",
      "speedster",
      "defensive",
    ];
    const styles: Style[] = ["oshi", "yotsu", "hybrid"];
    const origins = [
      "Tokyo",
      "Osaka",
      "Fukuoka",
      "Hokkaido",
      "Aichi",
      "Mongolia",
      "Georgia",
      "USA",
      "Estonia",
    ];

    for (let i = 0; i < newCandidateCount; i++) {
      const candidateId = rng.uuid("CANDIDATE");
      const archetype = archetypes[rng.int(0, archetypes.length - 1)];
      const style = styles[rng.int(0, styles.length - 1)];
      const origin = origins[rng.int(0, origins.length - 1)];
      const isForeign = !["Tokyo", "Osaka", "Fukuoka", "Hokkaido", "Aichi"].includes(origin);

      const candidate: TalentCandidate = {
        candidateId,
        personId: rng.uuid("PERSON"),
        name: generateRikishiName(`${rng.seed}::${candidateId}`, rng),
        birthYear: currentYear - (15 + rng.int(0, 5)), // 15-20 years old
        originRegion: origin,
        nationality: isForeign ? origin : "Japan",
        visibilityBand: rng.next() < 0.3 ? "rumored" : "hidden",
        reputationSeed: rng.int(0, 1000000),
        tags: isForeign ? ["foreign", "prospect"] : ["prospect"],
        combatProfile: {
          archetype,
          familyPreferences: {
            push:
              archetype === "oshi" || archetype === "tsuppari" || archetype === "giant" ? 0.6 : 0.2,
            belt: archetype === "yotsu" ? 0.6 : 0.2,
            trick: archetype === "trickster" ? 0.6 : 0.1,
            speed: archetype === "speedster" ? 0.6 : 0.1,
          },
          preferredGrip: archetype === "yotsu" ? "migi" : "none",
          preferredGripDepth: archetype === "yotsu" ? "deep" : "standard",
          statModifiers: {
            strength: archetype === "oshi" || archetype === "giant" ? 1.2 : 1.0,
            technique: archetype === "trickster" || archetype === "yotsu" ? 1.2 : 1.0,
            speed: archetype === "tsuppari" || archetype === "speedster" ? 1.2 : 1.0,
            height: archetype === "giant" ? 1.15 : 1.0,
            weight: archetype === "giant" ? 1.2 : 1.0,
          },
        },
        availabilityState: "available",
        competingSuitors: [],
        archetype,
        style,
        heightPotentialCm: 170 + rng.int(0, 25),
        weightPotentialKg: 90 + rng.int(0, 80),
        talentSeed: rng.int(0, 1000000),
        temperament: {
          discipline: 40 + rng.int(0, 50),
          volatility: rng.int(0, 40),
        },
        isAmateurStar: rng.next() < 0.15, // 15% chance of being an amateur star
      };

      candidates[candidateId] = candidate;

      // Emit discovery event for high-potential candidates
      if (candidate.isAmateurStar || candidate.visibilityBand === "rumored") {
        builder.logEvent("RECRUIT_DISCOVERED", "narrative", {
          rikishiId: candidateId,
          shikona: candidate.name,
          origin: candidate.originRegion,
          archetype: candidate.archetype,
        });
      }
    }

    // Note: talentPool updates are not directly supported by ImpactBuilder yet
    world.talentPool = {
      ...world.talentPool,
      candidates,
      lastYearlyRefreshYear: currentYear,
    };
  }

  // 3. NPC Yearly Logic
  // Note: tickYear mutates world, we'll call it directly
  npcAI.tickYear(world);

  // 4. Staff Aging
  if (world.staff) {
    const nextStaff = new Map(world.staff);
    for (const [id, staff] of world.staff) {
      const s = { ...staff };
      s.age += 1;
      s.yearsAtBeya += 1;

      if (s.careerPhase === "apprentice" && s.age >= 30) s.careerPhase = "established";
      else if (s.careerPhase === "established" && s.age >= 45) s.careerPhase = "senior";
      else if (s.careerPhase === "senior" && s.age >= 55) s.careerPhase = "declining";
      else if (s.careerPhase === "declining" && s.age >= 65) s.careerPhase = "retired";

      nextStaff.set(id, s);
    }
    // Note: staff updates are not directly supported by ImpactBuilder yet
    world.staff = nextStaff;
  }

  // 5. Rikishi Avatar Aging
  if (world.rikishi) {
    const nextRikishi = new Map(world.rikishi);
    for (const [id, r] of world.rikishi) {
      const age = world.year - r.birthYear;
      const isSekitori = r.division === "makuuchi" || r.division === "juryo";

      if (r.avatarConfig) {
        const updated = updateAvatarForAging(r.avatarConfig, age);
        const withHairstyle = updateHairstyleForPromotion(updated, isSekitori);
        nextRikishi.set(id, { ...r, avatarConfig: withHairstyle });
      }
    }
    world.rikishi = nextRikishi;
  }

  // 6. Oyakata Avatar Aging
  if (world.oyakata) {
    const nextOyakata = new Map(world.oyakata);
    for (const [id, o] of world.oyakata) {
      if (o.avatarConfig) {
        const updated = updateAvatarForAging(o.avatarConfig, o.age);
        nextOyakata.set(id, { ...o, avatarConfig: updated });
      }
    }
    world.oyakata = nextOyakata;
  }

  // 7. Logging & Era Check
  const newYear = world.year;
  const isDecadeBoundary = newYear % 10 === 0;
  const hofInductees = inductees.map((i) => i.shikona);
  builder.logEvent("BASHO_STATUS", "narrative", {
    status: "meta_shift",
    incident: isDecadeBoundary ? "decade_boundary" : "year_boundary",
    day: newYear,
    score: hofInductees.length,
    reason: hofInductees.length > 0 ? hofInductees.join("|") : "None",
  });

  return builder.build();
}
