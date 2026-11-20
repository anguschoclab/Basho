import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { initMaezumoState, graduateMaezumoRikishi } from "@/engine/basho/maezumoPrelims";
import { activeDivisionRoster } from "@/engine/calendar/scheduleHelpers";
import { payBashoTeate } from "@/engine/lifecycle/PrizeDistribution";
import { projectBanzukeUIDigest } from "@/presenters/projections/dashboardProjections";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { mockRikishi, makeMockBasho, makeMockWorld } from "@tests/unit/engine/utils";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

function buildJonokuchiField(list: Rikishi[]): {
  world: WorldState;
  entries: BanzukeEntry[];
} {
  const world = makeMockWorld({ seed: "banzuke-gai-seed", cyclePhase: "post_basho" });
  const entries: BanzukeEntry[] = [];
  for (const r of list) {
    world.rikishi.set(r.id, r);
    world.activeRikishiIds.add(r.id);
    if (!r.isBanzukeGai && !r.isMaezumo) {
      entries.push({
        rikishiId: r.id,
        division: r.division,
        position: {
          rank: r.rank as "jonokuchi",
          rankNumber: r.rankNumber ?? 1,
          side: r.side ?? "east",
        },
      });
    }
  }
  return { world, entries };
}

function seedJonokuchi(
  id: string,
  rankNumber: number,
  side: "east" | "west" = "east",
  overrides: Partial<Rikishi> = {}
): Rikishi {
  return mockRikishi(id, {
    division: "jonokuchi",
    rank: "jonokuchi",
    rankNumber,
    side,
    ...overrides,
  });
}

describe("§3 Banzuke-gai (off-banzuke)", () => {
  it("drops a 0-0-7 full-kyujo Jonokuchi rikishi into banzuke-gai while keeping active peers on the banzuke", () => {
    const r1 = seedJonokuchi("jk-1", 1, "east");
    const r2 = seedJonokuchi("jk-2", 1, "west");
    const rKyujo = seedJonokuchi("jk-kyujo", 10, "east", { isKyujo: true });
    const { world, entries } = buildJonokuchiField([r1, r2, rKyujo]);

    const perfMap = new Map<string, BashoPerformance>([
      ["jk-1", { rikishiId: "jk-1", wins: 5, losses: 2, absences: 0 }],
      ["jk-2", { rikishiId: "jk-2", wins: 3, losses: 4, absences: 0 }],
      ["jk-kyujo", { rikishiId: "jk-kyujo", wins: 0, losses: 0, absences: 7 }],
    ]);

    const res = updateBanzuke(entries, perfMap, world);
    expect(res.banzukeGai).toEqual(["jk-kyujo"]);
    expect(res.banzukeGaiReasons?.["jk-kyujo"]).toBe("kyujo");
    expect(res.newBanzuke.some((e) => e.rikishiId === "jk-kyujo")).toBe(false);
    expect(res.newBanzuke.map((e) => e.rikishiId).sort()).toEqual(["jk-1", "jk-2"]);
    expect(res.events.some((ev) => ev.rikishiId === "jk-kyujo" && ev.to === "banzuke-gai")).toBe(
      true
    );
  });

  it("drops bottom Jonokuchi overflow into banzuke-gai when maxJonokuchiSlots caps the division", () => {
    const r1 = seedJonokuchi("jk-1", 1, "east");
    const r2 = seedJonokuchi("jk-2", 1, "west");
    const r3 = seedJonokuchi("jk-3", 20, "west");
    const { world, entries } = buildJonokuchiField([r1, r2, r3]);

    // All three lose badly so they stay constrained to tier 10 (jonokuchi).
    const perfMap = new Map<string, BashoPerformance>([
      ["jk-1", { rikishiId: "jk-1", wins: 2, losses: 5, absences: 0 }],
      ["jk-2", { rikishiId: "jk-2", wins: 1, losses: 6, absences: 0 }],
      ["jk-3", { rikishiId: "jk-3", wins: 0, losses: 7, absences: 0 }],
    ]);

    const res = updateBanzuke(entries, perfMap, world, {}, undefined, {
      maxJonokuchiSlots: 2,
    });
    expect(res.newBanzuke).toHaveLength(2);
    expect(res.banzukeGai).toEqual(["jk-3"]);
    expect(res.banzukeGaiReasons?.["jk-3"]).toBe("overflow");
  });

  it("excludes banzuke-gai rikishi from scheduling, basho teate, and printed banzuke rows while surfacing them in banzukeGaiEntries", () => {
    const r1 = seedJonokuchi("jk-1", 1, "east");
    const rKyujo = seedJonokuchi("jk-kyujo", 10, "east", { isKyujo: true });
    const { world } = buildJonokuchiField([r1, rKyujo]);
    world.currentBasho = makeMockBasho({
      standings: new Map([["jk-1", { wins: 4, losses: 3, absences: 0 }]]),
    });

    const publishImpact = publishBanzukeUpdate(world);
    const afterPublish = resolveImpacts(world, [publishImpact]);

    const dropped = afterPublish.rikishi.get("jk-kyujo");
    expect(dropped?.isBanzukeGai).toBe(true);
    expect(dropped?.banzukeGaiReason).toBe("kyujo");
    expect(afterPublish.currentBanzuke?.banzukeGai).toEqual(["jk-kyujo"]);

    // Off the active division scheduling pool and teate payroll.
    expect(activeDivisionRoster(afterPublish, "jonokuchi").map((r) => r.id)).not.toContain(
      "jk-kyujo"
    );
    const teateImpact = payBashoTeate(afterPublish);
    expect(teateImpact.entities?.rikishiUpdates?.has("jk-kyujo") ?? false).toBe(false);

    // Off the printed division rows, surfaced in banzukeGaiEntries.
    const digest = projectBanzukeUIDigest(afterPublish);
    expect(digest.totalWrestlerCount).toBe(1);
    expect(digest.banzukeGaiEntries?.map((e) => e.id)).toEqual(["jk-kyujo"]);
  });

  it("re-enrolls healthy banzuke-gai rikishi into maezumo and clears isBanzukeGai on graduation", () => {
    const r1 = seedJonokuchi("jk-1", 1, "east");
    const rBg = seedJonokuchi("jk-bg", 12, "west", {
      isBanzukeGai: true,
      banzukeGaiReason: "kyujo",
      maezumoCompleted: true,
    });
    const { world } = buildJonokuchiField([r1, rBg]);

    const mzState = initMaezumoState(world);
    expect(mzState?.entrantIds).toEqual(["jk-bg"]);

    const basho = makeMockBasho({
      maezumo: mzState,
      matches: [
        {
          boutId: "mz-3",
          day: 3,
          eastRikishiId: "jk-bg",
          westRikishiId: "jk-1",
          isMaezumoBout: true,
          result: {
            boutId: "mz-3",
            winner: "east",
            winnerRikishiId: "jk-bg",
            loserRikishiId: "jk-1",
            kimarite: "yorikiri",
          } as never,
        },
      ],
    });
    const builder = createImpactBuilder("test");
    const grads = graduateMaezumoRikishi(
      world,
      basho,
      [
        {
          rikishiId: "jk-1",
          division: "jonokuchi",
          position: { rank: "jonokuchi", rankNumber: 5, side: "east" },
        },
      ],
      builder
    );
    expect(grads).toHaveLength(1);
    expect(grads[0].rikishiId).toBe("jk-bg");
    expect(grads[0].position).toEqual({ rank: "jonokuchi", rankNumber: 6, side: "east" });
    const update = builder.build().entities?.rikishiUpdates?.get("jk-bg");
    expect(update).toMatchObject({
      isBanzukeGai: false,
      banzukeGaiReason: undefined,
      maezumoCompleted: true,
    });
  });
});
