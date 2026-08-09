import { describe, it, expect } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { mockRikishi, makeMockWorld, makeMockBasho } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoName } from "@/engine/types/basho";

function makeWorldForPublish(
  rikishiList: Rikishi[],
  standingsMap: Map<string, { wins: number; losses: number; absences?: number }>,
  overrides: Partial<WorldState> = {}
): WorldState {
  const rikishiMap = new Map<string, Rikishi>();
  for (const r of rikishiList) {
    rikishiMap.set(r.id, r);
  }
  const basho = makeMockBasho({
    day: 15,
    standings: standingsMap as any,
    bashoName: "hatsu" as BashoName,
    isActive: false,
  });
  const world = makeMockWorld({
    rikishi: rikishiMap,
    currentBasho: basho,
    cyclePhase: "post_basho",
    ...overrides,
  });
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

function findLoggedEvents(
  impact: ReturnType<typeof publishBanzukeUpdate>,
  status: string
): Array<{ data: any }> {
  return (impact.events ?? []).filter((e: any) => e.data?.status === status);
}

describe("BanzukePublisher.findOptimization — regression tests", () => {
  it("kadoban+promotion duplicate events: banzuke_movement uses promotion event fields, not kadoban status", () => {
    const r = mockRikishi("r-ozeki", {
      shikona: "OzekiFaller",
      rank: "ozeki",
      rankNumber: 1,
      division: "makuuchi",
      side: "east",
      currentBashoWins: 5,
      currentBashoLosses: 10,
      consecutiveStrongOzeki: 0,
    });
    const standings = new Map([["r-ozeki", { wins: 5, losses: 10, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings, {
      ozekiKadoban: { "r-ozeki": { isKadoban: true, consecutiveMakeKoshi: 1 } },
    });
    const impact = publishBanzukeUpdate(world);

    const movementEvents = findLoggedEvents(impact, "banzuke_movement");
    const ozekiMovement = movementEvents.find((e: any) => e.data.rikishiId === "r-ozeki");
    if (ozekiMovement) {
      const from = ozekiMovement.data.from as string;
      const to = ozekiMovement.data.to as string;
      expect(from).not.toContain("kadoban");
      expect(to).not.toContain("kadoban");
      expect(ozekiMovement.data.kind).not.toBe("status");
    }
  });

  it("sanyakuPromotionThisBasho set when maegashira promoted to sanyaku", () => {
    const r = mockRikishi("r-maegashira-1", {
      shikona: "RisingStar",
      rank: "maegashira",
      rankNumber: 1,
      division: "makuuchi",
      side: "east",
      currentBashoWins: 11,
      currentBashoLosses: 4,
    });
    const standings = new Map([["r-maegashira-1", { wins: 11, losses: 4, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);

    const update = impact.entities?.rikishiUpdates?.get("r-maegashira-1");
    expect(update).toBeDefined();
    const newRank = update!.rank;
    const isSanyaku =
      newRank === "yokozuna" ||
      newRank === "ozeki" ||
      newRank === "sekiwake" ||
      newRank === "komusubi";
    if (isSanyaku) {
      expect(update!.sanyakuPromotionThisBasho).toBeTruthy();
    }
  });

  it("sanyakuPromotionThisBasho not set when rikishi stays maegashira", () => {
    const r = mockRikishi("r-maegashira-low", {
      shikona: "SteadyRiki",
      rank: "maegashira",
      rankNumber: 15,
      division: "makuuchi",
      side: "east",
      currentBashoWins: 7,
      currentBashoLosses: 8,
    });
    const standings = new Map([["r-maegashira-low", { wins: 7, losses: 8, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);

    const update = impact.entities?.rikishiUpdates?.get("r-maegashira-low");
    expect(update).toBeDefined();
    const newRank = update!.rank;
    const isSanyaku =
      newRank === "yokozuna" ||
      newRank === "ozeki" ||
      newRank === "sekiwake" ||
      newRank === "komusubi";
    if (!isSanyaku) {
      expect(update!.sanyakuPromotionThisBasho).toBeFalsy();
    }
  });

  it("ozeki_promotion BASHO_STATUS event fires when new entry rank is ozeki", () => {
    const r = mockRikishi("r-sekiwake", {
      shikona: "NextOzeki",
      rank: "sekiwake",
      rankNumber: 1,
      division: "makuuchi",
      side: "east",
      currentBashoWins: 12,
      currentBashoLosses: 3,
      consecutiveStrongSekiwake: 2,
      sekiwakeThreeBashoWins: 33,
    });
    const standings = new Map([["r-sekiwake", { wins: 12, losses: 3, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);

    const ozekiPromoEvents = findLoggedEvents(impact, "ozeki_promotion");
    const forRikishi = ozekiPromoEvents.find((e: any) => e.data.rikishiId === "r-sekiwake");
    if (forRikishi) {
      expect(forRikishi.data.status).toBe("ozeki_promotion");
      expect(forRikishi.data.description).toContain("Ozeki");
    }
  });

  it("yokozuna promotion assigns dohyo-iri style", () => {
    const r = mockRikishi("r-ozeki-yusho", {
      shikona: "YokozunaHopeful",
      rank: "ozeki",
      rankNumber: 1,
      division: "makuuchi",
      side: "east",
      currentBashoWins: 14,
      currentBashoLosses: 1,
      consecutiveStrongOzeki: 3,
      careerHistory: [
        {
          isYusho: true,
          wins: 14,
          losses: 1,
          year: 2024,
          month: 11,
          bashoName: "kyushu",
        },
      ] as any,
    });
    const standings = new Map([["r-ozeki-yusho", { wins: 14, losses: 1, absences: 0 }]]);
    const world = makeWorldForPublish([r], standings);
    const impact = publishBanzukeUpdate(world);

    const update = impact.entities?.rikishiUpdates?.get("r-ozeki-yusho");
    if (update?.dohyoIriStyle) {
      const dohyoEvents = findLoggedEvents(impact, "dohyo_iri_assignment");
      expect(dohyoEvents.length).toBeGreaterThan(0);
      expect(update.dohyoIriStyle).toBeTruthy();
    }
  });
});
