import { describe, it, expect } from "vitest";
import { triggerSuccession } from "@/engine/legacy/DynastyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import type { Oyakata } from "@/engine/types/oyakata";

describe("triggerSuccession — achievementsInReign population", () => {
  it("writes tenure boardSeatsWon + reign-window globalCup wins + hof inductees", () => {
    const world = makeMockWorld({ year: 2030 });
    const heya = makeMockHeya("h1", { oyakataId: "oya-old", historicalYusho: 3 });
    heya.dynasty = [];
    world.heyas.set("h1", heya);
    const oya = {
      id: "oya-old", name: "Old", heyaId: "h1", yearsInCharge: 5,
      tenure: { startedYear: 2025, bashoServed: 30, championships: 3, sekitoriProduced: 4, insolvencyEvents: 0, majorScandals: 0, forcedMergers: 0, boardSeatsWon: 2 },
    } as unknown as Oyakata;
    world.oyakata.set("oya-old", oya);
    const successor = mockRikishi("r-succ", { heyaId: "h1", division: "makuuchi" });
    world.rikishi.set("r-succ", successor);
    // Reign window: 2025–2030. One cup win inside, one outside; one HoF inductee inside.
    world.chronicle = { eraLabels: [], topChampions: [], greatestRivalries: [], recordsBroken: [], globalCups: [
      { year: 2028, championId: "r-succ", championName: "X", championHeya: "h1", participantCount: 8, wasPlayerChampion: false },
      { year: 2020, championId: "r-succ", championName: "X", championHeya: "h1", participantCount: 8, wasPlayerChampion: false },
    ] };
    (world as any)["hallOfFame"] = {
      inductees: [
        { rikishiId: "r-succ", shikona: "GreatOne", category: "wrestler", inductionYear: 2027, stats: {} },
        { rikishiId: "r-foreign", shikona: "Other", category: "wrestler", inductionYear: 2027, stats: {} },
      ],
    };

    const impact = triggerSuccession(world, "h1", "r-succ");
    const next = resolveImpacts(world, [impact]);
    const rec = next.heyas.get("h1")!.dynasty!.at(-1)!;
    expect(rec.achievementsInReign.yushoCount).toBe(3);
    expect(rec.achievementsInReign.boardSeatsWon).toBe(2);
    expect(rec.achievementsInReign.globalCupWins).toBe(1);
    expect(rec.achievementsInReign.hofInductees).toEqual(["GreatOne"]);
  });
});
