/**
 * Lifecycle avatar continuity — a person's stored AvatarIdentity must transfer
 * pixel-exact through every entity conversion:
 *   - talent candidate → rikishi (convertCandidateToRikishi)
 *   - academy prospect → rikishi (promoteIntake)
 *   - rikishi → oyakata (already covered by retireeOyakataConversion tests)
 */

import { describe, it, expect } from "vitest";
import { convertCandidateToRikishi } from "@/engine/systems/generation/CandidateBuilder";
import { rngFromSeed } from "@/engine/rng";
import { buildCombatProfile } from "@/engine/archetype";
import { generateAvatarIdentity } from "@/engine/avatarGenerator";
import type { TalentCandidate } from "@/engine/types/talent";
import {
  buildYouthAcademy,
  generateYearlyIntake,
  promoteIntake,
  getYouthAcademy,
} from "@/engine/systems/recruitment/YouthAcademyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

function makeCandidate(personId: string): TalentCandidate {
  return {
    candidateId: `${personId}-cand`,
    personId,
    name: "Continuity Test",
    birthYear: 2005,
    originRegion: "Tokyo",
    nationality: "Japan",
    visibilityBand: "partial",
    reputationSeed: 90,
    tags: [],
    combatProfile: buildCombatProfile("oshi"),
    availabilityState: "available",
    competingSuitors: [],
    archetype: "oshi",
    style: "oshi",
    heightPotentialCm: 180,
    weightPotentialKg: 130,
    talentSeed: 12345,
    temperament: { discipline: 70, volatility: 30 },
    avatarConfig: generateAvatarIdentity({
      seed: personId,
      nationality: "Japan",
      role: "prospect",
    }),
  } as unknown as TalentCandidate;
}

describe("convertCandidateToRikishi — identity continuity", () => {
  it("carries the candidate's stored AvatarIdentity onto the rikishi, pixel-exact", () => {
    const candidate = makeCandidate("PS-CONTINUITY1");
    const rikishi = convertCandidateToRikishi({
      candidate,
      rng: rngFromSeed("test", "candidate", "continuity"),
      currentYear: 2025,
      heyaId: "heya-001",
    });

    expect(rikishi.id).toBe(candidate.personId);
    expect(rikishi.avatarConfig).toEqual(candidate.avatarConfig);
  });

  it("backfills identity when the candidate lacks one (old saves)", () => {
    const candidate = makeCandidate("PS-NOAVATAR1");
    delete candidate.avatarConfig;
    const rikishi = convertCandidateToRikishi({
      candidate,
      rng: rngFromSeed("test", "candidate", "noavatar"),
      currentYear: 2025,
      heyaId: "heya-001",
    });

    expect(rikishi.avatarConfig?.version).toBe(2);
    expect(rikishi.avatarConfig?.seed).toBe(candidate.personId);
  });
});

describe("promoteIntake — identity continuity", () => {
  function academyWorld(): WorldState {
    return MockFactory.createWorld({
      seed: "academy-continuity",
      year: 2026,
      week: 1,
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1", { name: "Test Heya", funds: 10_000_000 })],
      ]),
      playerHeyaId: "h1",
    });
  }

  it("carries the prospect's stored AvatarIdentity onto the new rikishi, pixel-exact", () => {
    const world = academyWorld();
    const w1 = resolveImpacts(world, [buildYouthAcademy(world, "h1")]);
    const w2 = resolveImpacts(w1, [generateYearlyIntake(w1, "h1")]);
    const prospect = getYouthAcademy(w2.heyas.get("h1")!)!.prospects[0];
    expect(prospect.avatarConfig?.version).toBe(2);

    const w3 = resolveImpacts(w2, [promoteIntake(w2, "h1", prospect.id)]);
    const rikishi = w3.rikishi.get(prospect.id);

    expect(rikishi).toBeDefined();
    expect(rikishi!.avatarConfig).toEqual(prospect.avatarConfig);
  });
});
