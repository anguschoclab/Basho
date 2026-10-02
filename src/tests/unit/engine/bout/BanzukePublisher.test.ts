import { describe, it, expect, beforeEach } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { mockRikishi, makeMockWorld, makeMockBasho } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { isKachiKoshi } from "@/engine/banzuke/banzukeHelpers";

function makeWorldForPublish(
  rikishiList: Rikishi[],
  standingsMap: Map<string, { wins: number; losses: number; absences?: number }>
): WorldState {
  const rikishiMap = new Map<string, Rikishi>();
  for (const r of rikishiList) {
    rikishiMap.set(r.id, r);
  }
  const basho = makeMockBasho({
    day: 15,
    standings: standingsMap as any,
    bashoName: "hatsu",
  });
  const world = makeMockWorld({
    rikishi: rikishiMap,
    currentBasho: basho,
    cyclePhase: "post_basho",
  });
  // Add minimal history entry required by publishBanzukeUpdate
  (world as any).history = [
    {
      bashoId: "hatsu-2025",
      year: 2025,
      bashoName: "hatsu",
      yusho: rikishiList[0]?.id ?? "",
      junYusho: [],
      shukunsho: null as any,
      kantosho: null as any,
      ginoSho: null as any,
      promotions: [],
      demotions: [],
      notes: "",
    },
  ];
  return world as WorldState;
}

describe("BanzukePublisher — consecutiveKachiKoshi tracking (T16)", () => {
  beforeEach(() => {
    // Reset any cached state if needed
  });

  it("T16.1: kachi-koshi with consecutiveKachiKoshi=1 → updated to 2", () => {
    const r = mockRikishi("r-1", {
      shikona: "Alpha",
      rank: "maegashira",
      rankNumber: 5,
      consecutiveKachiKoshi: 1,
    });
    const standings = new Map([["r-1", { wins: 9, losses: 6, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);
    const update = impact.entities?.rikishiUpdates?.get("r-1");
    expect(update).toBeDefined();
    expect(update!.consecutiveKachiKoshi).toBe(2);
  });

  it("T16.2: make-koshi with consecutiveKachiKoshi=3 → reset to 0", () => {
    const r = mockRikishi("r-1", {
      shikona: "Alpha",
      rank: "maegashira",
      rankNumber: 5,
      consecutiveKachiKoshi: 3,
    });
    const standings = new Map([["r-1", { wins: 5, losses: 10, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);
    const update = impact.entities?.rikishiUpdates?.get("r-1");
    expect(update).toBeDefined();
    expect(update!.consecutiveKachiKoshi).toBe(0);
  });

  it("T16.3: consecutiveKachiKoshi undefined → initialized to 1 on kachi-koshi", () => {
    const r = mockRikishi("r-1", {
      shikona: "Alpha",
      rank: "maegashira",
      rankNumber: 5,
    });
    delete (r as any).consecutiveKachiKoshi;
    const standings = new Map([["r-1", { wins: 8, losses: 7, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);
    const update = impact.entities?.rikishiUpdates?.get("r-1");
    expect(update).toBeDefined();
    expect(update!.consecutiveKachiKoshi).toBe(1);
  });

  it("T16.4: absences >= 15 → reset to 0", () => {
    const r = mockRikishi("r-1", {
      shikona: "Alpha",
      rank: "maegashira",
      rankNumber: 5,
      consecutiveKachiKoshi: 2,
    });
    const standings = new Map([["r-1", { wins: 0, losses: 0, absences: 15 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);
    const update = impact.entities?.rikishiUpdates?.get("r-1");
    expect(update).toBeDefined();
    expect(update!.consecutiveKachiKoshi).toBe(0);
  });

  it("T16.5: Makushita rikishi with 4 wins (kachi-koshi at 7-bout basho) → increment", () => {
    // Makushita has 7 bouts, so 4 wins is kachi-koshi
    const r = mockRikishi("r-1", {
      shikona: "Alpha",
      rank: "makushita" as any,
      rankNumber: 20,
      division: "makushita",
      consecutiveKachiKoshi: 0,
    });
    const standings = new Map([["r-1", { wins: 4, losses: 3, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);
    const update = impact.entities?.rikishiUpdates?.get("r-1");
    expect(update).toBeDefined();
    // Verify isKachiKoshi works for makushita
    expect(isKachiKoshi(4, 3, r.rank)).toBe(true);
    expect(update!.consecutiveKachiKoshi).toBe(1);
  });

  it("T16.7: maegashira (non-yokozuna) kachi-koshi → consecutiveKachiKoshi incremented (outside yokozuna block)", () => {
    const r = mockRikishi("r-1", {
      shikona: "Alpha",
      rank: "maegashira",
      rankNumber: 10,
      consecutiveKachiKoshi: 2,
    });
    const standings = new Map([["r-1", { wins: 10, losses: 5, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);
    const update = impact.entities?.rikishiUpdates?.get("r-1");
    expect(update).toBeDefined();
    expect(update!.consecutiveKachiKoshi).toBe(3);
  });
});

describe("BanzukePublisher — dayResults (hoshitori) capture", () => {
  it("records per-day outcomes incl. kinboshi into the appended careerHistory entry", () => {
    const r = mockRikishi("r-1", {
      shikona: "Alpha",
      rank: "maegashira",
      rankNumber: 5,
    });
    const standings = new Map([["r-1", { wins: 9, losses: 6, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);

    // Give the concluded basho two resolved matches for r-1: a plain win on
    // day 1 and a kinboshi on day 2.
    world.currentBasho!.matches = [
      {
        boutId: "d1",
        day: 1,
        eastRikishiId: "r-1",
        westRikishiId: "opp-1",
        result: {
          boutId: "d1", winner: "east", winnerRikishiId: "r-1", loserRikishiId: "opp-1",
          kimarite: "yorikiri", isKinboshi: false, log: [], kenshoEnvelopes: 0,
          momentumScore: 0, inBoutInjury: null, isTimeout: false, upset: false, day: 1,
        } as never,
      },
      {
        boutId: "d2",
        day: 2,
        eastRikishiId: "r-1",
        westRikishiId: "yoko-1",
        result: {
          boutId: "d2", winner: "east", winnerRikishiId: "r-1", loserRikishiId: "yoko-1",
          kimarite: "uwatenage", isKinboshi: true,
          awards: [{ type: "kinboshi", winnerId: "r-1", loserId: "yoko-1", day: 2, boutId: "d2" }],
          log: [], kenshoEnvelopes: 50, momentumScore: 0, inBoutInjury: null,
          isTimeout: false, upset: true, day: 2,
        } as never,
      },
    ] as never;

    const impact = publishBanzukeUpdate(world);
    const update = impact.entities?.rikishiUpdates?.get("r-1");
    const history = update?.careerHistory as Array<{ dayResults?: Array<{ day: number; outcome: string; isKinboshi?: boolean }> }> | undefined;
    const latest = history?.[history.length - 1];
    expect(latest?.dayResults).toBeDefined();
    const day2 = latest!.dayResults!.find((d) => d.day === 2);
    expect(day2?.outcome).toBe("win");
    expect(day2?.isKinboshi).toBe(true);
    const day1 = latest!.dayResults!.find((d) => d.day === 1);
    expect(day1?.outcome).toBe("win");
    expect(day1?.isKinboshi).toBeFalsy();
  });
});
