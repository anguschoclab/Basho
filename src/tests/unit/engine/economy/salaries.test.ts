import { describe, it, expect, beforeEach } from "vitest";
import { processHeyaEconomics } from "@/engine/tick/phases/monthly/economics/salaries";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { HeyaUpdates } from "@/engine/tick/phases/monthly/types";
import { createImpactBuilder, ImpactBuilder } from "@/engine/core/ImpactBuilder";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import {
  SEKITORI_OVERHEAD_MONTHLY,
  NON_SEKITORI_OVERHEAD_MONTHLY,
} from "@/constants/engine/economic";

describe("processHeyaEconomics", () => {
  let world: WorldState;
  let builder: ImpactBuilder;

  beforeEach(() => {
    world = MockFactory.createWorld();
    builder = createImpactBuilder("test");
  });

  it("should process sekitori and non-sekitori salaries and overhead correctly", () => {
    const heya = MockFactory.createHeya("heya-1", {
      funds: 10000000,
      rikishiIds: ["r-sekitori", "r-non-sekitori"]
    });

    // Rank "yokozuna" from RANK_HIERARCHY
    const sekitori = MockFactory.createRikishi("r-sekitori", {
        rank: "yokozuna",
        economics: {
            cash: 1000,
            retirementFund: 0,
            careerKenshoWon: 0,
            kinboshiCount: 0,
            totalEarnings: 1000,
            currentBashoEarnings: 0,
            popularity: 50,
        }
    });

    const nonSekitori = MockFactory.createRikishi("r-non-sekitori", {
        rank: "makushita"
    });

    world.rikishi.set("r-sekitori", sekitori);
    world.rikishi.set("r-non-sekitori", nonSekitori);

    const rikishiMap = world.rikishi;
    const heyaUpdates: any = { funds: heya.funds };

    const totalBurn = processHeyaEconomics(world, heya, rikishiMap, heyaUpdates, builder);

    // We expect the impact builder's rikishiUpdates to have been modified
    const impact = builder.build() as any;

    expect(impact.entities?.rikishiUpdates).toBeDefined();
    expect(impact.entities.rikishiUpdates.has("r-sekitori")).toBe(true);

    const rUpdate = impact.entities.rikishiUpdates.get("r-sekitori");
    expect(rUpdate?.economics?.cash).toBeGreaterThan(1000);
    expect(rUpdate?.economics?.totalEarnings).toBeGreaterThan(1000);

    expect(heyaUpdates.funds).toBeLessThan(10000000);
    expect(totalBurn).toBeGreaterThan(0);
  });
});

describe("processHeyaEconomics — exact salary amounts", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  it("credits yokozuna exactly RANK_HIERARCHY.yokozuna.salary to cash and totalEarnings", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 50_000_000,
      rikishiIds: ["r1"],
    });
    const r = MockFactory.createRikishi("r1", {
      rank: "yokozuna",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      },
    });
    world.rikishi.set("r1", r);

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const impact = builder.build() as any;
    const rUpdate = impact.entities.rikishiUpdates.get("r1");
    expect(rUpdate?.economics?.cash).toBe(RANK_HIERARCHY.yokozuna.salary);
    expect(rUpdate?.economics?.totalEarnings).toBe(RANK_HIERARCHY.yokozuna.salary);
  });
});

describe("processHeyaEconomics — non-sekitori only roster", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  it("deducts NON_SEKITORI_OVERHEAD_MONTHLY per rikishi and credits no salaries", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 10_000_000,
      rikishiIds: ["r1", "r2", "r3"],
    });
    world.rikishi.set("r1", MockFactory.createRikishi("r1", { rank: "makushita" }));
    world.rikishi.set("r2", MockFactory.createRikishi("r2", { rank: "sandanme" }));
    world.rikishi.set("r3", MockFactory.createRikishi("r3", { rank: "jonidan" }));

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const expectedOverhead = 3 * NON_SEKITORI_OVERHEAD_MONTHLY;
    expect(heyaUpdates.funds).toBe(10_000_000 - expectedOverhead);
    expect(totalBurn).toBe(expectedOverhead);

    // No rikishi updates (no sekitori salaries to credit)
    const impact = builder.build() as any;
    expect(impact.entities?.rikishiUpdates).toBeUndefined();
  });
});

describe("processHeyaEconomics — empty roster", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  it("returns totalBurn=0 and leaves heya funds unchanged", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 5_000_000,
      rikishiIds: [],
    });
    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    expect(totalBurn).toBe(0);
    expect(heyaUpdates.funds).toBe(5_000_000);
  });
});

describe("processHeyaEconomics — missing economics object", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  it("creates default economics and credits salary to it", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 50_000_000,
      rikishiIds: ["r1"],
    });
    const r = MockFactory.createRikishi("r1", { rank: "ozeki" });
    // Ensure economics is undefined
    (r as any).economics = undefined;
    world.rikishi.set("r1", r);

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const impact = builder.build() as any;
    const rUpdate = impact.entities.rikishiUpdates.get("r1");
    expect(rUpdate?.economics?.cash).toBe(RANK_HIERARCHY.ozeki.salary);
    expect(rUpdate?.economics?.totalEarnings).toBe(RANK_HIERARCHY.ozeki.salary);
  });
});

describe("processHeyaEconomics — per-rank overhead verification", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  const sekitoriRanks: Array<{
    rank: "ozeki" | "sekiwake" | "komusubi" | "maegashira" | "juryo";
    overhead: number;
  }> = [
    { rank: "ozeki", overhead: SEKITORI_OVERHEAD_MONTHLY.ozeki },
    { rank: "sekiwake", overhead: SEKITORI_OVERHEAD_MONTHLY.sekiwake },
    { rank: "komusubi", overhead: SEKITORI_OVERHEAD_MONTHLY.komusubi },
    { rank: "maegashira", overhead: SEKITORI_OVERHEAD_MONTHLY.maegashira },
    { rank: "juryo", overhead: SEKITORI_OVERHEAD_MONTHLY.juryo },
  ];

  for (const { rank, overhead } of sekitoriRanks) {
    it(`deducts exactly ${overhead} for a single ${rank}`, () => {
      const heya = MockFactory.createHeya("h1", {
        funds: 50_000_000,
        rikishiIds: ["r1"],
      });
      world.rikishi.set("r1", MockFactory.createRikishi("r1", { rank }));

      const builder = createImpactBuilder("test");
      const heyaUpdates: HeyaUpdates = {};
      processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

      expect(heyaUpdates.funds).toBe(50_000_000 - overhead);
    });
  }
});

describe("processHeyaEconomics — phantom rikishi ID", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  it("skips rikishi IDs not in map or world without error", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 10_000_000,
      rikishiIds: ["r-real", "r-phantom"],
    });
    world.rikishi.set("r-real", MockFactory.createRikishi("r-real", { rank: "makushita" }));

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    // Only r-real counts: 1 non-sekitori overhead
    expect(totalBurn).toBe(NON_SEKITORI_OVERHEAD_MONTHLY);
    expect(heyaUpdates.funds).toBe(10_000_000 - NON_SEKITORI_OVERHEAD_MONTHLY);
  });
});

describe("processHeyaEconomics — undefined heya.funds", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  it("handles undefined heya.funds and heyaUpdates.funds by defaulting to 0", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 0,
      rikishiIds: ["r1"],
    });
    world.rikishi.set("r1", MockFactory.createRikishi("r1", { rank: "makushita" }));

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(0 - NON_SEKITORI_OVERHEAD_MONTHLY);
  });
});

// ── Validation-driven additions (test-first) ────────────────────────────────
// These tests exercise branches identified during plan validation. Tests #2
// and #3 are written against the *target* (post-fix) behavior and are expected
// to fail against current source — that failure confirms the bug before the
// fix in Step 2.

describe("processHeyaEconomics — getRikishi fallback (defensive contract)", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  // NOTE: The real call site (phase05_monthly_boundary.ts:51) always passes
  // world.rikishi as rikishiMap, so this fallback is dead code in production.
  // We test it as a public-signature contract: if a caller passes a smaller
  // map, the function should still find rikishi via world.rikishi.
  it("finds a rikishi via getRikishi(world, rId) when missing from rikishiMap", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 50_000_000,
      rikishiIds: ["r1"],
    });
    const r = MockFactory.createRikishi("r1", {
      rank: "yokozuna",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      },
    });
    world.rikishi.set("r1", r);

    // Pass an empty map to force the getRikishi(world, rId) fallback
    const emptyMap = new Map();
    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, emptyMap, heyaUpdates, builder);

    // Salary + overhead should be credited/deducted despite missing from map
    const expectedSalary = RANK_HIERARCHY.yokozuna.salary;
    const expectedOverhead = SEKITORI_OVERHEAD_MONTHLY.yokozuna;
    expect(totalBurn).toBe(expectedSalary + expectedOverhead);
    expect(heyaUpdates.funds).toBe(50_000_000 - expectedOverhead);

    const impact = builder.build() as any;
    const rUpdate = impact.entities.rikishiUpdates.get("r1");
    expect(rUpdate?.economics?.cash).toBe(expectedSalary);
    expect(rUpdate?.economics?.totalEarnings).toBe(expectedSalary);
  });
});

describe("processHeyaEconomics — unknown rank fallback overhead (target behavior)", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  // RANK_HIERARCHY is exhaustive over Rank, but SerializationService.sanitizeRikishi
  // does NOT validate rank on load — a corrupted/legacy save can produce a
  // rikishi with an unrecognized rank string. The current source silently skips
  // such rikishi (zero salary, zero overhead), creating a free-rider exploit.
  // Target behavior: charge NON_SEKITORI_OVERHEAD_MONTHLY as a safe fallback.
  it("charges NON_SEKITORI_OVERHEAD_MONTHLY for a rikishi with unrecognized rank", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 50_000_000,
      rikishiIds: ["r-bad-rank"],
    });
    const r = MockFactory.createRikishi("r-bad-rank", { rank: "makushita" });
    // Cast to invalid rank string not in RANK_HIERARCHY
    (r as any).rank = "bogus_rank";
    world.rikishi.set("r-bad-rank", r);

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    expect(totalBurn).toBe(NON_SEKITORI_OVERHEAD_MONTHLY);
    expect(heyaUpdates.funds).toBe(50_000_000 - NON_SEKITORI_OVERHEAD_MONTHLY);

    // No salary credited (not recognized as sekitori)
    const impact = builder.build() as any;
    expect(impact.entities?.rikishiUpdates).toBeUndefined();
  });

  it("in a mixed roster, charges valid rikishi normally and unknown-rank at fallback overhead", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 100_000_000,
      rikishiIds: ["r-valid", "r-bad-rank"],
    });
    const valid = MockFactory.createRikishi("r-valid", {
      rank: "yokozuna",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      },
    });
    const bad = MockFactory.createRikishi("r-bad-rank", { rank: "makushita" });
    (bad as any).rank = "bogus_rank";
    world.rikishi.set("r-valid", valid);
    world.rikishi.set("r-bad-rank", bad);

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const expectedSalary = RANK_HIERARCHY.yokozuna.salary;
    const expectedOverhead = SEKITORI_OVERHEAD_MONTHLY.yokozuna + NON_SEKITORI_OVERHEAD_MONTHLY;
    expect(totalBurn).toBe(expectedSalary + expectedOverhead);
    expect(heyaUpdates.funds).toBe(100_000_000 - expectedOverhead);
  });
});

describe("processHeyaEconomics — duplicate rikishiIds (target behavior: deduped)", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  // If heya.rikishiIds contains the same ID twice, the current source iterates
  // it twice — double-counting overhead in heyaUpdates.funds and totalBurn,
  // while the ImpactBuilder's deep-merge only credits salary once (asymmetric).
  // Target behavior: dedupe rikishiIds so each rikishi is processed exactly once.
  it("processes a duplicated sekitori ID only once (deduped)", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 50_000_000,
      rikishiIds: ["r1", "r1"], // same ID listed twice
    });
    const r = MockFactory.createRikishi("r1", {
      rank: "yokozuna",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      },
    });
    world.rikishi.set("r1", r);

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const expectedSalary = RANK_HIERARCHY.yokozuna.salary;
    const expectedOverhead = SEKITORI_OVERHEAD_MONTHLY.yokozuna; // counted once
    expect(totalBurn).toBe(expectedSalary + expectedOverhead);
    expect(heyaUpdates.funds).toBe(50_000_000 - expectedOverhead);

    const impact = builder.build() as any;
    const rUpdate = impact.entities.rikishiUpdates.get("r1");
    expect(rUpdate?.economics?.cash).toBe(expectedSalary);
    expect(rUpdate?.economics?.totalEarnings).toBe(expectedSalary);
  });
});

describe("processHeyaEconomics — mixed-rank roster (multiple sekitori + non-sekitori)", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
  });

  it("credits each sekitori individually and sums overhead across the full roster", () => {
    const heya = MockFactory.createHeya("h1", {
      funds: 200_000_000,
      rikishiIds: ["r-yoko", "r-juryo", "r-komu", "r-ms"],
    });
    const mkEcon = () => ({
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    });
    world.rikishi.set("r-yoko", MockFactory.createRikishi("r-yoko", { rank: "yokozuna", economics: mkEcon() }));
    world.rikishi.set("r-juryo", MockFactory.createRikishi("r-juryo", { rank: "juryo", economics: mkEcon() }));
    world.rikishi.set("r-komu", MockFactory.createRikishi("r-komu", { rank: "komusubi", economics: mkEcon() }));
    world.rikishi.set("r-ms", MockFactory.createRikishi("r-ms", { rank: "makushita" }));

    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const expectedSalaries =
      RANK_HIERARCHY.yokozuna.salary +
      RANK_HIERARCHY.juryo.salary +
      RANK_HIERARCHY.komusubi.salary;
    const expectedOverhead =
      SEKITORI_OVERHEAD_MONTHLY.yokozuna +
      SEKITORI_OVERHEAD_MONTHLY.juryo +
      SEKITORI_OVERHEAD_MONTHLY.komusubi +
      NON_SEKITORI_OVERHEAD_MONTHLY;

    expect(totalBurn).toBe(expectedSalaries + expectedOverhead);
    expect(heyaUpdates.funds).toBe(200_000_000 - expectedOverhead);

    const impact = builder.build() as any;
    for (const id of ["r-yoko", "r-juryo", "r-komu"]) {
      const rUpdate = impact.entities.rikishiUpdates.get(id);
      expect(rUpdate).toBeDefined();
      expect(rUpdate?.economics?.cash).toBeGreaterThan(0);
    }
    // Non-sekitori should have no salary update
    expect(impact.entities.rikishiUpdates.has("r-ms")).toBe(false);
  });
});
