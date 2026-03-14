import { describe, it, expect, beforeEach } from "vitest";
import { enforceHardCapRosterOverflow, HARD_CAP_ROSTER_SIZE } from "../overflow";
import { generateWorld } from "../worldgen";
import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import { ensureTalentPools } from "../talentpool";

describe("Hard-Cap Roster Overflow Resolution (C4.3)", () => {
  let world: WorldState;
  let testHeyaId: string;

  beforeEach(() => {
    world = generateWorld("overflow-test-seed");
    ensureTalentPools(world);
    testHeyaId = Array.from(world.heyas.keys())[0];
  });

  function createMockRikishi(id: string, heyaId: string, overrides: Partial<Rikishi> = {}): Rikishi {
    return {
      id,
      shikona: `Rikishi ${id}`,
      heyaId,
      nationality: "Japan",
      birthYear: world.year - 20,
      height: 180,
      weight: 150,
      power: 50,
      speed: 50,
      balance: 50,
      technique: 50,
      aggression: 50,
      experience: 50,
      adaptability: 50,
      momentum: 50,
      stamina: 50,
      fatigue: 0,
      injured: false,
      injuryWeeksRemaining: 0,
      style: "oshi",
      archetype: "oshi_specialist",
      division: "jonokuchi",
      rank: "jonokuchi",
      side: "east",
      careerWins: 0,
      careerLosses: 0,
      currentBashoWins: 0,
      currentBashoLosses: 0,
      h2h: {},
      history: [],
      favoredKimarite: [],
      weakAgainstStyles: [],
      stats: {
        strength: 50, technique: 50, speed: 50, weight: 150, stamina: 50, mental: 50, adaptability: 50, balance: 50
      },
      personalityTraits: [],
      condition: 100,
      motivation: 100,
      ...overrides
    };
  }

  it("should not release any rikishi if the roster is exactly the hard cap", () => {
    const heya = world.heyas.get(testHeyaId)!;
    heya.rikishiIds = [];

    for (let i = 0; i < HARD_CAP_ROSTER_SIZE; i++) {
      const r = createMockRikishi(`r-${i}`, testHeyaId);
      world.rikishi.set(r.id, r);
      heya.rikishiIds.push(r.id);
    }

    const released = enforceHardCapRosterOverflow(world);
    expect(released).toBe(0);
    expect(heya.rikishiIds.length).toBe(HARD_CAP_ROSTER_SIZE);
  });

  it("should release exact overflow amount if the roster exceeds the hard cap", () => {
    const heya = world.heyas.get(testHeyaId)!;
    heya.rikishiIds = [];

    const targetCount = HARD_CAP_ROSTER_SIZE + 5;
    for (let i = 0; i < targetCount; i++) {
      const r = createMockRikishi(`r-${i}`, testHeyaId);
      world.rikishi.set(r.id, r);
      heya.rikishiIds.push(r.id);
    }

    const released = enforceHardCapRosterOverflow(world);
    expect(released).toBe(5);
    expect(heya.rikishiIds.length).toBe(HARD_CAP_ROSTER_SIZE);
  });

  it("should release the worst performing rikishi first (lowest potential, lowest wins, highest injuries)", () => {
    const heya = world.heyas.get(testHeyaId)!;
    heya.rikishiIds = [];

    // Create 30 normal rikishi
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE; i++) {
      const r = createMockRikishi(`r-normal-${i}`, testHeyaId, { talentSeed: 80, currentBashoWins: 10, currentBashoLosses: 5 });
      world.rikishi.set(r.id, r);
      heya.rikishiIds.push(r.id);
    }

    // Create 2 "bad" rikishi that should be dropped
    const bad1 = createMockRikishi(`r-bad-1`, testHeyaId, {
      talentSeed: 20,
      currentBashoWins: 0,
      currentBashoLosses: 15,
      injured: true,
      injuryWeeksRemaining: 10
    });

    const bad2 = createMockRikishi(`r-bad-2`, testHeyaId, {
      talentSeed: 30,
      currentBashoWins: 2,
      currentBashoLosses: 13,
      injured: true,
      injuryWeeksRemaining: 5
    });

    world.rikishi.set(bad1.id, bad1);
    heya.rikishiIds.push(bad1.id);
    world.rikishi.set(bad2.id, bad2);
    heya.rikishiIds.push(bad2.id);

    // We have 32 rikishi. 2 should be released.
    const released = enforceHardCapRosterOverflow(world);
    expect(released).toBe(2);
    expect(heya.rikishiIds.length).toBe(HARD_CAP_ROSTER_SIZE);

    // Bad1 and Bad2 should be the ones removed from the stable
    expect(heya.rikishiIds).not.toContain(bad1.id);
    expect(heya.rikishiIds).not.toContain(bad2.id);

    // They should now be unattached
    expect(bad1.heyaId).toBe("");
    expect(bad2.heyaId).toBe("");
  });

  it("should protect foreign rikishi due to retention bias over slightly better domestic ones", () => {
    const heya = world.heyas.get(testHeyaId)!;
    heya.rikishiIds = [];

    // Create 29 normal rikishi
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE - 1; i++) {
      const r = createMockRikishi(`r-normal-${i}`, testHeyaId, { talentSeed: 80, currentBashoWins: 10 });
      world.rikishi.set(r.id, r);
      heya.rikishiIds.push(r.id);
    }

    // Create a mediocre domestic rikishi
    const domestic = createMockRikishi(`r-domestic`, testHeyaId, {
      nationality: "Japan",
      talentSeed: 40,
      currentBashoWins: 5,
      currentBashoLosses: 10
    });

    // Create a worse foreign rikishi
    const foreign = createMockRikishi(`r-foreign`, testHeyaId, {
      nationality: "Mongolia",
      talentSeed: 35, // Worse potential
      currentBashoWins: 4, // Worse wins
      currentBashoLosses: 11
    });

    world.rikishi.set(domestic.id, domestic);
    heya.rikishiIds.push(domestic.id);
    world.rikishi.set(foreign.id, foreign);
    heya.rikishiIds.push(foreign.id);

    // We have 31 rikishi. 1 should be released.
    const released = enforceHardCapRosterOverflow(world);
    expect(released).toBe(1);

    // The domestic one should be dropped because the foreign one gets +30 retention bias
    expect(heya.rikishiIds).not.toContain(domestic.id);
    expect(heya.rikishiIds).toContain(foreign.id);
  });
});
