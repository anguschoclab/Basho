import { describe, it, expect } from "vitest";
import { checkNaturalizations } from "@/engine/naturalization";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { NATURALIZATION_CAREER_WINS_THRESHOLD } from "@/constants/engine/generation";

describe("checkNaturalizations", () => {
  it("naturalizes an eligible rikishi if the chance roll passes", () => {
    const world = MockFactory.createWorld();
    world.year = 2025;

    const heya = MockFactory.createHeya();
    const rikishi = MockFactory.createRikishi({
      id: "rikishi_24",
      nationality: "Mongolia",
      careerWins: NATURALIZATION_CAREER_WINS_THRESHOLD + 1,
      heyaId: heya.id
    });

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    world.activeRikishiIds = [rikishi.id];

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

  it("does not naturalize an eligible rikishi if chance roll fails", () => {
    const world = MockFactory.createWorld();
    world.year = 2025;

    const heya = MockFactory.createHeya();
    const rikishi = MockFactory.createRikishi({
      id: "rikishi_fail_1",
      nationality: "Mongolia",
      careerWins: NATURALIZATION_CAREER_WINS_THRESHOLD + 1,
      heyaId: heya.id
    });

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    world.activeRikishiIds = [rikishi.id];

    const impact = checkNaturalizations(world);

    expect(impact.events).toBeUndefined();
    expect(impact.entities?.rikishiUpdates?.has(rikishi.id)).toBeFalsy();
  });

  it("does not naturalize if the rikishi is ineligible despite a passing chance roll", () => {
    const world = MockFactory.createWorld();
    world.year = 2025;

    const heya = MockFactory.createHeya();
    const rikishi = MockFactory.createRikishi({
      id: "rikishi_24",
      nationality: "Mongolia",
      careerWins: NATURALIZATION_CAREER_WINS_THRESHOLD - 10,
      rank: "maegashira_12",
      heyaId: heya.id
    });

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    world.activeRikishiIds = [rikishi.id];

    const impact = checkNaturalizations(world);

    expect(impact.events).toBeUndefined();
    expect(impact.entities?.rikishiUpdates?.has(rikishi.id)).toBeFalsy();
  });

  it("does naturalize if Yokozuna is old enough", () => {
    const world = MockFactory.createWorld();
    world.year = 2025;

    const heya = MockFactory.createHeya();
    const rikishi = MockFactory.createRikishi({
      id: "rikishi_24",
      nationality: "Georgia",
      birthYear: 2025 - 32,
      careerWins: 10,
      rank: "yokozuna",
      heyaId: heya.id
    });

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    world.activeRikishiIds = [rikishi.id];

    const impact = checkNaturalizations(world);

    expect(impact.events).toBeDefined();
    expect(impact.entities?.rikishiUpdates?.has(rikishi.id)).toBeTruthy();
  });
});
