import { describe, it, expect } from "vitest";
import { checkNaturalizations } from "@/engine/naturalization";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { NATURALIZATION_CAREER_WINS_THRESHOLD } from "@/constants/engine/generation";

describe("checkNaturalizations", () => {
  // RNG seed: nat_rikishi_24_2025 — deterministic, produces roll < 5 (passes 5% chance)
  it("naturalizes an eligible rikishi if the chance roll passes", () => {
    const world = MockFactory.createWorld();
    world.year = 2025;

    const heya = MockFactory.createHeya("heya_24");
    const rikishi = MockFactory.createRikishi({
      id: "rikishi_24",
      nationality: "Mongolia",
      careerWins: NATURALIZATION_CAREER_WINS_THRESHOLD + 1,
      heyaId: heya.id,
    });

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    world.activeRikishiIds = [rikishi.id] as any;

    const impact = checkNaturalizations(world);

    expect(impact.events).toBeDefined();
    expect(impact.events?.length).toBeGreaterThanOrEqual(1);
    expect(impact.events![0].category).toEqual("career");
    expect(impact.events![0].data.status).toEqual("naturalization");

    expect(impact.entities).toBeDefined();
    expect(impact.entities?.rikishiUpdates).toBeDefined();

    const updates = impact.entities?.rikishiUpdates?.get(rikishi.id);
    expect(updates).toBeDefined();
    expect(updates?.nationality).toEqual("Japan");
  });

  // RNG seed: nat_rikishi_fail_1_2025 — deterministic, produces roll >= 5 (fails 5% chance)
  it("does not naturalize an eligible rikishi if chance roll fails", () => {
    const world = MockFactory.createWorld();
    world.year = 2025;

    const heya = MockFactory.createHeya("heya_fail_1");
    const rikishi = MockFactory.createRikishi({
      id: "rikishi_fail_1",
      nationality: "Mongolia",
      careerWins: NATURALIZATION_CAREER_WINS_THRESHOLD + 1,
      heyaId: heya.id,
    });

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    world.activeRikishiIds = [rikishi.id] as any;

    const impact = checkNaturalizations(world);

    expect(impact.events).toBeUndefined();
    expect(impact.entities?.rikishiUpdates?.has(rikishi.id)).toBeFalsy();
  });

  // Uses same seed as test 1 (nat_rikishi_24_2025) but rikishi is ineligible due to low careerWins
  it("does not naturalize if the rikishi is ineligible despite a passing chance roll", () => {
    const world = MockFactory.createWorld();
    world.year = 2025;

    const heya = MockFactory.createHeya("heya_ineligible");
    const rikishi = MockFactory.createRikishi({
      id: "rikishi_24",
      nationality: "Mongolia",
      careerWins: NATURALIZATION_CAREER_WINS_THRESHOLD - 10,
      rank: "maegashira",
      heyaId: heya.id,
    });

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    world.activeRikishiIds = [rikishi.id] as any;

    const impact = checkNaturalizations(world);

    expect(impact.events).toBeUndefined();
    expect(impact.entities?.rikishiUpdates?.has(rikishi.id)).toBeFalsy();
  });

  // RNG seed: nat_rikishi_24_2025 — same as test 1, roll passes. Yokozuna age 32 qualifies via age rule.
  it("does naturalize if Yokozuna is old enough", () => {
    const world = MockFactory.createWorld();
    world.year = 2025;

    const heya = MockFactory.createHeya("heya_yokozuna");
    const rikishi = MockFactory.createRikishi({
      id: "rikishi_24",
      nationality: "Georgia",
      birthYear: 2025 - 32,
      careerWins: 10,
      rank: "yokozuna",
      heyaId: heya.id,
    });

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    world.activeRikishiIds = [rikishi.id] as any;

    const impact = checkNaturalizations(world);

    expect(impact.events).toBeDefined();
    expect(impact.entities?.rikishiUpdates?.has(rikishi.id)).toBeTruthy();
  });
});
