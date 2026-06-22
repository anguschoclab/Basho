import { describe, it, expect, beforeEach } from "vitest";
import { processHeyaEconomics } from "@/engine/tick/phases/monthly/economics/salaries";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import {
  SEKITORI_OVERHEAD_MONTHLY,
  NON_SEKITORI_OVERHEAD_MONTHLY,
} from "@/constants/engine/economic";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import { makeMockHeya, makeMockWorld, mockRikishi } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { HeyaUpdates } from "@/engine/tick/phases/monthly/types";

describe("processHeyaEconomics — monthly rank-scaled heya overhead", () => {
  let world: WorldState;
  let heya: Heya;

  beforeEach(() => {
    // 1 yokozuna + 1 maegashira + 3 non-sekitori
    const r1 = mockRikishi("r-yoko", { rank: "yokozuna", division: "makuuchi", heyaId: "heya-1" });
    const r2 = mockRikishi("r-maeg", { rank: "maegashira", division: "makuuchi", heyaId: "heya-1" });
    const r3 = mockRikishi("r-ms1", { rank: "makushita", division: "makushita", heyaId: "heya-1" });
    const r4 = mockRikishi("r-ms2", { rank: "makushita", division: "makushita", heyaId: "heya-1" });
    const r5 = mockRikishi("r-sd1", { rank: "sandanme", division: "sandanme", heyaId: "heya-1" });

    const rikishiMap = new Map([
      ["r-yoko", r1],
      ["r-maeg", r2],
      ["r-ms1", r3],
      ["r-ms2", r4],
      ["r-sd1", r5],
    ]);

    heya = makeMockHeya("heya-1", {
      funds: 50_000_000,
      rikishiIds: ["r-yoko", "r-maeg", "r-ms1", "r-ms2", "r-sd1"],
    });
    world = makeMockWorld({
      heyas: new Map([["heya-1", heya]]),
      rikishi: rikishiMap,
    });
  });

  it("deducts rank-scaled overhead from heya.funds", () => {
    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const expectedOverhead =
      SEKITORI_OVERHEAD_MONTHLY.yokozuna +
      SEKITORI_OVERHEAD_MONTHLY.maegashira +
      3 * NON_SEKITORI_OVERHEAD_MONTHLY;

    expect(heyaUpdates.funds).toBe(50_000_000 - expectedOverhead);
  });

  it("still credits sekitori salaries to rikishi", () => {
    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const impact = builder.build();
    const resolved = resolveImpacts(world, [impact]);
    const yoko = resolved.rikishi.get("r-yoko");

    expect(yoko?.economics?.cash).toBe(RANK_HIERARCHY.yokozuna.salary);
  });

  it("returns total burn including overhead for runway calculation", () => {
    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    const totalBurn = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    const expectedOverhead =
      SEKITORI_OVERHEAD_MONTHLY.yokozuna +
      SEKITORI_OVERHEAD_MONTHLY.maegashira +
      3 * NON_SEKITORI_OVERHEAD_MONTHLY;
    const expectedSalaries = RANK_HIERARCHY.yokozuna.salary + RANK_HIERARCHY.maegashira.salary;

    expect(totalBurn).toBe(expectedSalaries + expectedOverhead);
  });

  it("resolves heya funds decrease via ImpactBuilder", () => {
    const builder = createImpactBuilder("test");
    const heyaUpdates: HeyaUpdates = {};
    processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);
    builder.updateHeya("heya-1", heyaUpdates);

    const impact = builder.build();
    const resolved = resolveImpacts(world, [impact]);
    const resolvedHeya = resolved.heyas.get("heya-1");

    const expectedOverhead =
      SEKITORI_OVERHEAD_MONTHLY.yokozuna +
      SEKITORI_OVERHEAD_MONTHLY.maegashira +
      3 * NON_SEKITORI_OVERHEAD_MONTHLY;
    expect(resolvedHeya?.funds).toBe(50_000_000 - expectedOverhead);
  });
});
