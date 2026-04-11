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
import { 
  processYearEndInduction 
} from "../../hallOfFame";
import * as npcAI from "../../npcAI";
import { EventBus } from "../../events";
import { RNGRegistry } from "../../core/RNGRegistry";
import type { CombatArchetype, Style } from "../../types/combat";
import type { TalentCandidate } from "../../types/talent";
import { generateRikishiName } from "../../shikona";

export function phase06_yearly_boundary(world: WorldState): WorldState {
  const boundaries = world.transientContext?.boundaries;
  if (!boundaries?.yearBoundary) return world;

  let nextWorld = { ...world, year: world.calendar.year };
  
  // 1. Hall of Fame Inductions
  // Note: hallOfFame.ts is currently mutative on world.hallOfFame.
  // We'll clone the hallOfFame state first.
  if (nextWorld.hallOfFame) {
    nextWorld.hallOfFame = {
      ...nextWorld.hallOfFame,
      inductees: [...nextWorld.hallOfFame.inductees],
      inducted: { ...nextWorld.hallOfFame.inducted }
    };
  }

  const inductees = processYearEndInduction(nextWorld);
  const hofInductees = inductees.map((i) => i.shikona);

  for (const inductee of inductees) {
    EventBus.lifecycleEvent(nextWorld, {
      rikishiId: inductee.rikishiId,
      shikona: inductee.shikona,
      status: "hof_induction",
      reason: inductee.category,
      score: inductee.stats.yushoCount ?? 0
    });
  }

  // 2. Talent Pool Refresh
  // Generate new candidates yearly and age out old unrecruited candidates
  if (nextWorld.talentPool) {
    const rng = RNGRegistry.getSystemRNG(nextWorld, "scouting", `year-${nextWorld.year}`);
    const candidates = { ...nextWorld.talentPool.candidates };
    
    // Age out candidates who weren't recruited (keep for 3 years max)
    const currentYear = nextWorld.year;
    for (const [id, candidate] of Object.entries(candidates)) {
      const age = currentYear - candidate.birthYear;
      // Remove if too old (25+) or been in pool for 3+ years
      if (age >= 25 || candidate.availabilityState === "withdrawn") {
        delete candidates[id];
      }
    }
    
    // Generate 5-10 new candidates per year
    const newCandidateCount = 5 + rng.int(0, 6);
    const archetypes: CombatArchetype[] = ["oshi", "yotsu", "tsuppari", "giant", "trickster", "hybrid", "speedster", "defensive"];
    const styles: Style[] = ["oshi", "yotsu", "hybrid"];
    const origins = ["Tokyo", "Osaka", "Fukuoka", "Hokkaido", "Aichi", "Mongolia", "Georgia", "USA", "Estonia"];
    
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
            push: archetype === "oshi" || archetype === "tsuppari" || archetype === "giant" ? 0.6 : 0.2,
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
          }
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
        EventBus.recruitDiscovered(nextWorld, {
          rikishiId: candidateId,
          shikona: candidate.name,
          origin: candidate.originRegion,
          archetype: candidate.archetype,
        });
      }
    }
    
    nextWorld.talentPool = {
      ...nextWorld.talentPool,
      candidates,
      lastYearlyRefreshYear: currentYear,
    };
  }

  // 3. NPC Yearly Logic
  npcAI.tickYear(nextWorld);

  // 4. Staff Aging
  if (nextWorld.staff) {
    const nextStaff = new Map(nextWorld.staff);
    for (const [id, staff] of nextWorld.staff) {
      const s = { ...staff };
      s.age += 1;
      s.yearsAtBeya += 1;
      
      if (s.careerPhase === "apprentice" && s.age >= 30) s.careerPhase = "established";
      else if (s.careerPhase === "established" && s.age >= 45) s.careerPhase = "senior";
      else if (s.careerPhase === "senior" && s.age >= 55) s.careerPhase = "declining";
      else if (s.careerPhase === "declining" && s.age >= 65) s.careerPhase = "retired";
      
      nextStaff.set(id, s);
    }
    nextWorld.staff = nextStaff;
  }

  // 5. Logging & Era Check
  const newYear = nextWorld.year;
  const isDecadeBoundary = newYear % 10 === 0;
  EventBus.bashoStatus(nextWorld, {
    status: "meta_shift",
    incident: isDecadeBoundary ? "decade_boundary" : "year_boundary",
    day: newYear,
    score: hofInductees.length,
    reason: hofInductees.length > 0 ? hofInductees.join("|") : "None"
  });

  return nextWorld;
}
