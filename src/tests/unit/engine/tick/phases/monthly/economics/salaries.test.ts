import { describe, it, expect } from "vitest";
import { processHeyaEconomics } from "../../../../../../../engine/tick/phases/monthly/economics/salaries";
import { MockFactory } from "../../../../../../helpers/utils/MockFactory";
import { createImpactBuilder } from "../../../../../../../engine/core/ImpactBuilder";
import { RANK_HIERARCHY } from "../../../../../../../engine/banzuke";
import {
  SEKITORI_OVERHEAD_MONTHLY,
  NON_SEKITORI_OVERHEAD_MONTHLY,
} from "../../../../../../../constants/engine/economic";

describe("processHeyaEconomics", () => {
  it("credits sekitori JSA salaries and deducts heya overhead for sekitori and non-sekitori", () => {
    const world = MockFactory.createWorld();
    world.heyas = new Map();
    const builder = createImpactBuilder("test");

    const heyaUpdates = { funds: 1000000 };
    const heya = {
      id: "heya1",
      funds: 1000000,
      rikishiIds: ["sekitori1", "nonsekitori1", "unknownRank"],
    } as any;

    const rikishiMap = new Map<string, any>();

    // Sekitori: Yokozuna
    const yokoSalary = RANK_HIERARCHY["yokozuna"]?.salary ?? 0;
    const yokoOverhead = SEKITORI_OVERHEAD_MONTHLY["yokozuna"] ?? 0;
    rikishiMap.set("sekitori1", {
      id: "sekitori1",
      rank: "yokozuna",
      economics: {
        cash: 100,
        totalEarnings: 100,
      },
    });

    // Non-sekitori: Makushita
    rikishiMap.set("nonsekitori1", {
      id: "nonsekitori1",
      rank: "makushita",
    });

    // Unknown rank
    rikishiMap.set("unknownRank", {
      id: "unknownRank",
      rank: "invalidRank",
    });

    const breakdown = { jsaSalaries: 0, heyaOverhead: 0 };

    const result = processHeyaEconomics(
      world,
      heya,
      rikishiMap,
      heyaUpdates as any,
      builder,
      breakdown
    );

    const expectedOverhead = yokoOverhead + NON_SEKITORI_OVERHEAD_MONTHLY * 2;
    const expectedSalaries = yokoSalary;

    expect(result).toBe(expectedSalaries + expectedOverhead);
    expect(breakdown.jsaSalaries).toBe(expectedSalaries);
    expect(breakdown.heyaOverhead).toBe(expectedOverhead);
    expect(heyaUpdates.funds).toBe(1000000 - expectedOverhead);

    const impact = builder.build();
    const sekitoriUpdate = impact.entities?.rikishiUpdates?.get("sekitori1");

    expect(sekitoriUpdate?.economics?.cash).toBe(100 + yokoSalary);
    expect(sekitoriUpdate?.economics?.totalEarnings).toBe(100 + yokoSalary);
  });

  it("falls back to world query when rikishi is missing in map", () => {
    const world = MockFactory.createWorld();
    const builder = createImpactBuilder("test");
    const heyaUpdates = { funds: 1000000 };
    const heya = { id: "heya2", funds: 1000000, rikishiIds: ["worldRikishi1"] } as any;

    const makuuchiSalary = RANK_HIERARCHY["maegashira"]?.salary ?? 0;
    const makuuchiOverhead = SEKITORI_OVERHEAD_MONTHLY["maegashira"] ?? 0;

    world.rikishi.set("worldRikishi1", {
      id: "worldRikishi1",
      rank: "maegashira",
      economics: {
        cash: 0,
        totalEarnings: 0,
      },
    } as any);

    const rikishiMap = new Map<string, any>(); // Empty map
    const breakdown = { jsaSalaries: 0, heyaOverhead: 0 };

    const result = processHeyaEconomics(
      world,
      heya,
      rikishiMap,
      heyaUpdates as any,
      builder,
      breakdown
    );

    expect(result).toBe(makuuchiSalary + makuuchiOverhead);
    expect(heyaUpdates.funds).toBe(1000000 - makuuchiOverhead);
  });

  it("skips non-existent rikishi", () => {
    const world = MockFactory.createWorld();
    const builder = createImpactBuilder("test");
    const heyaUpdates = { funds: 1000000 };
    // "ghostRikishi" is neither in map nor world
    const heya = { id: "heya2", funds: 1000000, rikishiIds: ["ghostRikishi"] } as any;

    const rikishiMap = new Map<string, any>();
    const breakdown = { jsaSalaries: 0, heyaOverhead: 0 };
    const result = processHeyaEconomics(
      world,
      heya,
      rikishiMap,
      heyaUpdates as any,
      builder,
      breakdown
    );

    expect(result).toBe(0);
    expect(breakdown.jsaSalaries).toBe(0);
    expect(breakdown.heyaOverhead).toBe(0);
  });

  it("uses default values when heyaUpdates.funds is undefined", () => {
    const world = MockFactory.createWorld();
    const builder = createImpactBuilder("test");
    const heyaUpdates = {} as any; // No funds set yet
    const heya = { id: "heya2", funds: 1000000, rikishiIds: ["nonsekitori"] } as any;

    const rikishiMap = new Map<string, any>();
    rikishiMap.set("nonsekitori", {
      id: "nonsekitori",
      rank: "makushita",
    });

    processHeyaEconomics(world, heya, rikishiMap, heyaUpdates as any, builder);

    expect(heyaUpdates.funds).toBe(1000000 - NON_SEKITORI_OVERHEAD_MONTHLY);
  });

  it("adds default economics object if undefined", () => {
    const world = MockFactory.createWorld();
    world.heyas = new Map();
    const builder = createImpactBuilder("test");
    const heyaUpdates = { funds: 1000000 };
    const heya = { id: "heya3", funds: 1000000, rikishiIds: ["sekitoriNoEcon"] } as any;

    const rikishiMap = new Map<string, any>();
    const yokoSalary = RANK_HIERARCHY["yokozuna"]?.salary ?? 0;

    rikishiMap.set("sekitoriNoEcon", {
      id: "sekitoriNoEcon",
      rank: "yokozuna",
      // Notice: NO economics object
    });

    processHeyaEconomics(world, heya, rikishiMap, heyaUpdates as any, builder);

    const impact = builder.build();
    const update = impact.entities?.rikishiUpdates?.get("sekitoriNoEcon");

    expect(update?.economics?.cash).toBe(yokoSalary);
    expect(update?.economics?.totalEarnings).toBe(yokoSalary);
    // Other defaults
    expect(update?.economics?.retirementFund).toBe(0);
    expect(update?.economics?.popularity).toBe(50);
  });
});
