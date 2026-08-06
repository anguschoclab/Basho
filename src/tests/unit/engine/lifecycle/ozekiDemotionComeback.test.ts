 
import { describe, it, expect } from "vitest";
import { concludeBashoCompetition } from "@/engine/lifecycle/CompetitionService";
import { makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";

function createComebackWorld(
  yushoId: string,
  wasDemoted: boolean,
  wins: number = 14
): WorldState {
  const rikishi = mockRikishi(yushoId, {
    rank: "sekiwake",
    division: "makuuchi",
    wasDemotedFromOzeki: wasDemoted,
    currentBashoWins: wins,
    currentBashoLosses: 15 - wins,
    shikona: "Comeback Riki",
    heyaId: "heya-1",
    milestones: [],
  });

  const world = makeMockWorld({
    rikishi: new Map([[yushoId, rikishi]]),
    year: 2025,
    cyclePhase: "basho_wrap",
    currentBasho: {
      id: "test-basho",
      year: 2025,
      bashoNumber: 1,
      bashoName: "hatsu",
      day: 15,
      matches: [],
      standings: new Map([[yushoId, { wins, losses: 15 - wins, absences: 0 }]]),
      isActive: false,
    } as BashoState,
    history: [
      {
        yusho: yushoId,
        junYusho: [],
        ginoSho: undefined,
        shukunsho: undefined,
        kantosho: undefined,
      } as any,
    ],
    heyas: new Map([
      ["heya-1", { id: "heya-1", name: "Test Stable", oyakataId: "oyakata-1" } as any],
    ]),
    oyakata: new Map([
      ["oyakata-1", { id: "oyakata-1", age: 50, name: "Test Oyakata" } as any],
    ]),
  } as any);

  return world;
}

describe("Ozeki Demotion Comeback Tracking", () => {
  it("fires LIFECYCLE_EVENT with incident ozeki_demotion_comeback_yusho when demoted Ozeki wins yusho", () => {
    const world = createComebackWorld("r1", true, 14);
    const impact = concludeBashoCompetition(world);

    const comebackEvent = impact.events?.find(
      (e) => e.type === "LIFECYCLE_EVENT" &&
      (e.data as any).incident === "ozeki_demotion_comeback_yusho"
    );
    expect(comebackEvent).toBeDefined();
    expect((comebackEvent!.data as any).status).toBe("historic_achievement");
    expect((comebackEvent!.data as any).shikona).toBe("Comeback Riki");
  });

  it("adds Milestone with type ozeki_demotion_comeback_yusho", () => {
    const world = createComebackWorld("r2", true, 13);
    const impact = concludeBashoCompetition(world);

    const milestoneUpdate = impact.entities?.rikishiUpdates?.get("r2");
    const milestones = milestoneUpdate?.milestones as any[] | undefined;
    expect(milestones).toBeDefined();
    const comebackMilestone = milestones?.find(
      (m) => m.type === "ozeki_demotion_comeback_yusho"
    );
    expect(comebackMilestone).toBeDefined();
    expect(comebackMilestone?.title).toBe("Ozeki Demotion Comeback Yusho");
  });

  it("clears wasDemotedFromOzeki flag after comeback yusho fires", () => {
    const world = createComebackWorld("r3", true, 14);
    const impact = concludeBashoCompetition(world);

    const update = impact.entities?.rikishiUpdates?.get("r3");
    expect(update?.wasDemotedFromOzeki).toBe(false);
  });

  it("does NOT fire comeback event when yusho winner was NOT demoted from Ozeki", () => {
    const world = createComebackWorld("r4", false, 14);
    const impact = concludeBashoCompetition(world);

    const comebackEvent = impact.events?.find(
      (e) => e.type === "LIFECYCLE_EVENT" &&
      (e.data as any).incident === "ozeki_demotion_comeback_yusho"
    );
    expect(comebackEvent).toBeUndefined();
  });

  it("does NOT fire comeback event when wasDemotedFromOzeki is undefined", () => {
    const world = createComebackWorld("r5", undefined as any, 14);
    const impact = concludeBashoCompetition(world);

    const comebackEvent = impact.events?.find(
      (e) => e.type === "LIFECYCLE_EVENT" &&
      (e.data as any).incident === "ozeki_demotion_comeback_yusho"
    );
    expect(comebackEvent).toBeUndefined();
  });

  it("generates PBP narrative lines for the comeback yusho", () => {
    const world = createComebackWorld("r6", true, 14);
    const impact = concludeBashoCompetition(world);

    const comebackEvent = impact.events?.find(
      (e) => e.type === "LIFECYCLE_EVENT" &&
      (e.data as any).incident === "ozeki_demotion_comeback_yusho"
    );
    expect(comebackEvent).toBeDefined();
    const narrative = (comebackEvent!.data as any).narrative as any[];
    expect(narrative).toBeDefined();
    expect(narrative.length).toBeGreaterThan(0);
    expect(narrative[0].text).toContain("Comeback Riki");
  });

  it("does not clear wasDemotedFromOzeki when no comeback yusho (non-winner)", () => {
    const rikishi = mockRikishi("r7", {
      rank: "sekiwake",
      division: "makuuchi",
      wasDemotedFromOzeki: true,
      currentBashoWins: 10,
      currentBashoLosses: 5,
      shikona: "Loser Riki",
      heyaId: "heya-1",
      milestones: [],
    });

    const winner = mockRikishi("winner", {
      rank: "yokozuna",
      division: "makuuchi",
      wasDemotedFromOzeki: false,
      currentBashoWins: 14,
      currentBashoLosses: 1,
      shikona: "Champion",
      heyaId: "heya-2",
      milestones: [],
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["r7", rikishi],
        ["winner", winner],
      ]),
      year: 2025,
      cyclePhase: "basho_wrap",
      currentBasho: {
        id: "test-basho",
        year: 2025,
        bashoNumber: 1,
        bashoName: "hatsu",
        day: 15,
        matches: [],
        standings: new Map([
          ["winner", { wins: 14, losses: 1, absences: 0 }],
          ["r7", { wins: 10, losses: 5, absences: 0 }],
        ]),
        isActive: false,
      } as BashoState,
      history: [
        {
          yusho: "winner",
          junYusho: [],
          ginoSho: undefined,
          shukunsho: undefined,
          kantosho: undefined,
        } as any,
      ],
      heyas: new Map([
        ["heya-1", { id: "heya-1", name: "Stable 1", oyakataId: "oyakata-1" } as any],
        ["heya-2", { id: "heya-2", name: "Stable 2", oyakataId: "oyakata-2" } as any],
      ]),
      oyakata: new Map([
        ["oyakata-1", { id: "oyakata-1", age: 50, name: "Oyakata 1" } as any],
        ["oyakata-2", { id: "oyakata-2", age: 50, name: "Oyakata 2" } as any],
      ]),
    } as any);

    const impact = concludeBashoCompetition(world);

    // r7 should still have wasDemotedFromOzeki unchanged (not cleared)
    const r7Update = impact.entities?.rikishiUpdates?.get("r7");
    expect(r7Update?.wasDemotedFromOzeki).toBeUndefined();
  });
});
