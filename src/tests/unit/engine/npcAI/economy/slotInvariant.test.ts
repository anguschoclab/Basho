/**
 * WS6 — Foreign-slot invariant across ALL NPC recruitment paths.
 *
 * Canon §5.4: when the slot is occupied, foreign-slot candidates must not
 * be signed; dual citizens are always allowed. This must hold in
 * `fillVacanciesForNPCWithBidding` (the gap-controller + monthly tick path)
 * AND `fillVacanciesForNPC` (registry/overflow path).
 */
import { describe, it, expect } from "vitest";
import {
  fillVacanciesForNPC,
  fillVacanciesForNPCWithBidding,
} from "@/engine/systems/generation/TalentPoolNPCRecruitment";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { perceivedTalentSeed } from "@/engine/systems/recruitment/perceivedTalent";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { executeMerger } from "@/engine/mergers";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "@/constants/engine/recruitment";
import { makeMockWorld, makeMockHeya } from "../../utils";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";
import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";

const HEYA = "heya-a" as Id;

function seedHeyaAndOyakata(world: WorldState, rikishiIds: string[] = []): void {
  world.heyas.set(
    HEYA,
    // Deep pockets: with a surplus the talent multiplier actually differentiates
    // bids, so a high-perceived foreigner outbids natives — the slot check must
    // still fire (pool ordering alone must not be the thing protecting it).
    makeMockHeya(HEYA, { rikishiIds, reputation: 60, oyakataId: "o-a", funds: 50_000_000 })
  );
  world.oyakata.set(
    "o-a",
    MockFactory.createOyakata("o-a", { heyaId: HEYA })
  );
}

function worldWithOccupiedForeignSlot(): WorldState {
  const world = makeMockWorld({ week: 1, year: 2030 });
  seedHeyaAndOyakata(world, ["r-foreign"]);
  world.rikishi.set(
    "r-foreign",
    MockFactory.createRikishi({
      id: "r-foreign",
      heyaId: HEYA,
      nationality: "Mongolia",
      citizenshipStatus: "foreign",
      joinedHeyaDate: "2029",
    } as never)
  );
  world.talentPool = MockFactory.createTalentPool();
  return world;
}

function addCandidate(
  world: WorldState,
  pool: "foreign" | "high_school",
  c: TalentCandidate
): void {
  world.talentPool!.candidates[c.candidateId] = c;
  world.talentPool!.pools[pool].candidatesVisible.push(c.candidateId);
}

function signedRikishiIds(world: WorldState, impact: StateImpact): Set<string> {
  const resolved = resolveImpacts(world, [impact]);
  const ids = new Set<string>();
  for (const r of resolved.rikishi.values()) {
    if (r.heyaId === HEYA && r.id !== "r-foreign") ids.add(r.id);
  }
  return ids;
}

describe("fillVacanciesForNPCWithBidding — slot invariant", () => {
  it("never signs a slot-consuming foreign candidate while the slot is occupied — even when it outbids", () => {
    const world = worldWithOccupiedForeignSlot();
    // Find a candidateId whose PERCEIVED talent for this stable is high enough
    // to outbid the native decoy — the slot check must fire even when the
    // foreign prospect is the stable's top-ranked target.
    let foreignCand: TalentCandidate | undefined;
    for (let i = 0; i < 50 && !foreignCand; i++) {
      const cId = `fc${i}`;
      const c = MockFactory.createCandidate(cId, {
        candidateId: cId,
        nationality: "Georgia",
        originRegion: "Georgia",
        talentSeed: 100,
        availabilityState: "available",
      });
      if (perceivedTalentSeed(world, HEYA, c) >= 95) foreignCand = c;
    }
    if (!foreignCand) throw new Error("fixture: no high-perceived foreign candidate found");
    const nativeCand = MockFactory.createCandidate("nc1", {
      candidateId: "nc1",
      nationality: "Japan",
      talentSeed: 50,
      availabilityState: "available",
    });
    addCandidate(world, "foreign", foreignCand);
    addCandidate(world, "high_school", nativeCand);

    const impact = fillVacanciesForNPCWithBidding(world, { [HEYA]: 1 });
    const ids = signedRikishiIds(world, impact);

    expect(ids.has(foreignCand.personId)).toBe(false);
    expect(ids.has(nativeCand.personId)).toBe(true);
  });

  it("a dual-citizen foreign candidate CAN be signed with the slot occupied (§5.3)", () => {
    const world = worldWithOccupiedForeignSlot();
    const dualCand = MockFactory.createCandidate("dc1", {
      candidateId: "dc1",
      nationality: "Mongolia",
      originRegion: "Mongolia",
      dualCitizen: true,
      talentSeed: 90,
      availabilityState: "available",
    });
    addCandidate(world, "foreign", dualCand);

    const impact = fillVacanciesForNPCWithBidding(world, { [HEYA]: 1 });
    const ids = signedRikishiIds(world, impact);
    expect(ids.has(dualCand.personId)).toBe(true);
  });

  it("with a free slot, a foreign candidate can be signed", () => {
    const world = makeMockWorld({ week: 1, year: 2030 });
    seedHeyaAndOyakata(world, []);
    world.talentPool = MockFactory.createTalentPool();
    const foreignCand = MockFactory.createCandidate("fc2", {
      candidateId: "fc2",
      nationality: "Georgia",
      originRegion: "Georgia",
      talentSeed: 80,
      availabilityState: "available",
    });
    addCandidate(world, "foreign", foreignCand);

    const impact = fillVacanciesForNPCWithBidding(world, { [HEYA]: 1 });
    expect(signedRikishiIds(world, impact).has(foreignCand.personId)).toBe(true);
  });
});

describe("worldgen + merger — slot invariant beyond recruitment", () => {
  it("initial world generation never gives a heya more than one foreign-slot rikishi", () => {
    // Canon §5.1 is absolute: "at most ONE foreign-slot rikishi at any time" —
    // the freshly generated world must already satisfy it.
    const world = generateInitialWorld("slot-invariant-worldgen");
    const foreignByHeya = new Map<string, number>();
    for (const r of world.rikishi.values()) {
      if (r.isRetired || !r.heyaId) continue;
      if (countsAsForeign(r, world.year)) {
        foreignByHeya.set(r.heyaId, (foreignByHeya.get(r.heyaId) ?? 0) + 1);
      }
    }
    const violators = [...foreignByHeya.entries()].filter(
      ([, n]) => n > FOREIGN_RIKISHI_LIMIT_PER_HEYA
    );
    expect(violators).toEqual([]);
  });

  it("a merger disperses excess foreign rikishi instead of stacking the target", () => {
    const world = makeMockWorld({ week: 1, year: 2030 });
    const targetOya = MockFactory.createOyakata("o-t", { heyaId: "h-target" });
    const sourceOya = MockFactory.createOyakata("o-s", { heyaId: "h-source" });
    world.oyakata.set("o-t", targetOya);
    world.oyakata.set("o-s", sourceOya);
    world.heyas.set(
      "h-target",
      makeMockHeya("h-target", { rikishiIds: ["r-foreign-t"], oyakataId: "o-t" })
    );
    world.heyas.set(
      "h-source",
      makeMockHeya("h-source", { rikishiIds: ["r-foreign-s", "r-native-s"], oyakataId: "o-s" })
    );
    // A third stable with a free slot should absorb the excess foreigner.
    world.heyas.set("h-free", makeMockHeya("h-free", { rikishiIds: [], oyakataId: "o-f" }));
    world.rikishi.set(
      "r-foreign-t",
      MockFactory.createRikishi({
        id: "r-foreign-t",
        heyaId: "h-target",
        nationality: "Mongolia",
        citizenshipStatus: "foreign",
      } as never)
    );
    world.rikishi.set(
      "r-foreign-s",
      MockFactory.createRikishi({
        id: "r-foreign-s",
        heyaId: "h-source",
        nationality: "Georgia",
        citizenshipStatus: "foreign",
      } as never)
    );
    world.rikishi.set(
      "r-native-s",
      MockFactory.createRikishi({
        id: "r-native-s",
        heyaId: "h-source",
        nationality: "Japan",
      } as never)
    );

    const impact = executeMerger(world, "h-source", "h-target", "insolvency");
    const resolved = resolveImpacts(world, [impact]);

    // The target keeps its incumbent + all natives; the excess foreigner is
    // re-homed to a free-slot stable (or retired if none exists) — never
    // stacked past the cap.
    const foreignInTarget = [...resolved.rikishi.values()].filter(
      (r) => !r.isRetired && r.heyaId === "h-target" && countsAsForeign(r, resolved.year)
    );
    expect(foreignInTarget.length).toBeLessThanOrEqual(FOREIGN_RIKISHI_LIMIT_PER_HEYA);
    const foreignS = resolved.rikishi.get("r-foreign-s")!;
    expect(foreignS.heyaId === "h-free" || foreignS.isRetired).toBe(true);
    expect(resolved.rikishi.get("r-native-s")!.heyaId).toBe("h-target");
  });
});

describe("fillVacanciesForNPC — citizenship-aware slot check", () => {
  it("a naturalized incumbent frees the slot (replaces origin-string check)", () => {
    const world = makeMockWorld({ week: 1, year: 2030 });
    seedHeyaAndOyakata(world, ["r-nat"]);
    world.rikishi.set(
      "r-nat",
      MockFactory.createRikishi({
        id: "r-nat",
        heyaId: HEYA,
        nationality: "Mongolia",
        citizenshipStatus: "naturalized",
        joinedHeyaDate: "2024",
      } as never)
    );
    world.talentPool = MockFactory.createTalentPool();

    const foreignCand = MockFactory.createCandidate("fc3", {
      candidateId: "fc3",
      nationality: "Georgia",
      originRegion: "Georgia",
      talentSeed: 80,
      availabilityState: "available",
    });
    addCandidate(world, "foreign", foreignCand);

    const impact = fillVacanciesForNPC(world, { [HEYA]: 1 });
    const resolved = resolveImpacts(world, [impact]);
    const signed = [...resolved.rikishi.values()].filter(
      (r) => r.heyaId === HEYA && r.id !== "r-nat"
    );
    expect(signed.length).toBe(1);
  });
});
