import { describe, it, expect } from "vitest";
import { buildSwissTorikumi, scorePairing } from "@/engine/matchmaking/index";
import { applyDramaBudget } from "@/engine/matchmaking/DramaMatchmaker";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

function buildFullUpperDeck() {
  const y1 = MockFactory.createRikishi("y1", {
    rank: "yokozuna",
    division: "makuuchi",
    heyaId: "h-y1",
    side: "east",
  });
  const y2 = MockFactory.createRikishi("y2", {
    rank: "yokozuna",
    division: "makuuchi",
    heyaId: "h-y2",
    side: "west",
  });
  const o1 = MockFactory.createRikishi("o1", {
    rank: "ozeki",
    division: "makuuchi",
    heyaId: "h-o1",
    side: "east",
  });
  const s1 = MockFactory.createRikishi("s1", {
    rank: "sekiwake",
    division: "makuuchi",
    heyaId: "h-s1",
    side: "east",
  });
  const k1 = MockFactory.createRikishi("k1", {
    rank: "komusubi",
    division: "makuuchi",
    heyaId: "h-k1",
    side: "east",
  });
  const m1 = MockFactory.createRikishi("m1", {
    rank: "maegashira",
    rankNumber: 1,
    division: "makuuchi",
    heyaId: "h-m1",
    side: "east",
  });
  const m2 = MockFactory.createRikishi("m2", {
    rank: "maegashira",
    rankNumber: 2,
    division: "makuuchi",
    heyaId: "h-m2",
    side: "west",
  });
  const m3 = MockFactory.createRikishi("m3", {
    rank: "maegashira",
    rankNumber: 3,
    division: "makuuchi",
    heyaId: "h-m3",
    side: "east",
  });
  const m4 = MockFactory.createRikishi("m4", {
    rank: "maegashira",
    rankNumber: 4,
    division: "makuuchi",
    heyaId: "h-m4",
    side: "west",
  });
  return { y1, y2, o1, s1, k1, m1, m2, m3, m4, all: [y1, y2, o1, s1, k1, m1, m2, m3, m4] };
}

function findOpponentId(
  pairings: ReturnType<typeof buildSwissTorikumi>,
  rikishiId: string
): string | undefined {
  const bout = pairings.find((p) => p.eastId === rikishiId || p.westId === rikishiId);
  if (!bout) return undefined;
  return bout.eastId === rikishiId ? bout.westId : bout.eastId;
}

describe("Yokozuna joi back-loading", () => {
  it("pairs yokozuna with M3-M4 before M1-M2 on Days 1-3", () => {
    const { y1, m1, m2, m3, m4 } = buildFullUpperDeck();
    const basho = MockFactory.createBasho({ day: 1 });
    const pairings = buildSwissTorikumi(basho, [y1, m1, m2, m3, m4], {
      seed: "backload-d1",
      division: "makuuchi",
    });

    const y1Opp = findOpponentId(pairings, "y1");
    expect(["m3", "m4"]).toContain(y1Opp);
    const y1Bout = pairings.find((p) => p.eastId === "y1" || p.westId === "y1");
    expect(y1Bout?.reasons).toContain("yokozuna_joi_backload");
  });

  it("ramps yokozuna up to M1-M2 on Days 4-7 and falls back to Komusubi/Sekiwake", () => {
    const { y1, s1, k1, m1, m2, m3, m4 } = buildFullUpperDeck();
    const basho = MockFactory.createBasho({ day: 5 });
    const pairingsDay5 = buildSwissTorikumi(basho, [y1, s1, k1, m1, m2, m3, m4], {
      seed: "backload-d5",
      division: "makuuchi",
    });
    expect(findOpponentId(pairingsDay5, "y1")).toBe("m1");

    // Once M1-M4 are already faced, Days 4-7 fall back to Komusubi/Sekiwake
    const bashoWithFaced = MockFactory.createBasho({
      day: 6,
      matches: [
        { boutId: "b1", day: 1, eastRikishiId: "y1", westRikishiId: "m4" },
        { boutId: "b2", day: 2, eastRikishiId: "y1", westRikishiId: "m3" },
        { boutId: "b3", day: 3, eastRikishiId: "y1", westRikishiId: "m2" },
        { boutId: "b4", day: 4, eastRikishiId: "y1", westRikishiId: "m1" },
      ],
    });
    const pairingsDay6 = buildSwissTorikumi(bashoWithFaced, [y1, s1, k1, m1, m2, m3, m4], {
      seed: "backload-d6",
      division: "makuuchi",
    });
    const oppDay6 = findOpponentId(pairingsDay6, "y1");
    expect(["k1", "s1"]).toContain(oppDay6);
  });

  it("defers Yokozuna-vs-Yokozuna and Yokozuna-vs-Ozeki on Days 8-10 while pairing Yokozuna vs S/K", () => {
    const { all } = buildFullUpperDeck();
    const basho = MockFactory.createBasho({
      day: 8,
      standings: new Map([
        ["y1", { wins: 7, losses: 0 }],
        ["y2", { wins: 7, losses: 0 }],
        ["o1", { wins: 7, losses: 0 }],
        ["s1", { wins: 5, losses: 2 }],
        ["k1", { wins: 5, losses: 2 }],
        ["m1", { wins: 4, losses: 3 }],
        ["m2", { wins: 4, losses: 3 }],
        ["m3", { wins: 4, losses: 3 }],
        ["m4", { wins: 3, losses: 4 }],
      ]),
    });

    const pairings = buildSwissTorikumi(basho, all, {
      seed: "backload-d8",
      division: "makuuchi",
    });

    const y1Opp = findOpponentId(pairings, "y1");
    const y2Opp = findOpponentId(pairings, "y2");
    expect(y1Opp).not.toBe("y2");
    expect(y1Opp).not.toBe("o1");
    expect(["s1", "k1"]).toContain(y1Opp);
    expect(["s1", "k1"]).toContain(y2Opp);
  });

  it("pairs Yokozuna vs Ozeki on Days 11-13 while reserving Yokozuna-vs-Yokozuna for Day 15 finale", () => {
    const o2 = MockFactory.createRikishi("o2", {
      rank: "ozeki",
      division: "makuuchi",
      heyaId: "h-o2",
      side: "west",
    });
    const { y1, y2, o1, s1, k1, m1 } = buildFullUpperDeck();
    const pool = [y1, y2, o1, o2, s1, k1, m1];

    const bashoD12 = MockFactory.createBasho({
      day: 12,
      standings: new Map([
        ["y1", { wins: 11, losses: 0 }],
        ["y2", { wins: 11, losses: 0 }],
        ["o1", { wins: 10, losses: 1 }],
        ["o2", { wins: 10, losses: 1 }],
        ["s1", { wins: 8, losses: 3 }],
        ["k1", { wins: 7, losses: 4 }],
        ["m1", { wins: 6, losses: 5 }],
      ]),
    });

    const pairingsD12 = buildSwissTorikumi(bashoD12, pool, {
      seed: "backload-d12",
      division: "makuuchi",
    });
    expect(["o1", "o2"]).toContain(findOpponentId(pairingsD12, "y1"));
    expect(["o1", "o2"]).toContain(findOpponentId(pairingsD12, "y2"));

    // Day 14 still reserves the top 2 unfaced yokozuna for Day 15 kore_yori_sanyaku
    const bashoD14 = MockFactory.createBasho({
      day: 14,
      matches: [
        { boutId: "b-y1-o1", day: 11, eastRikishiId: "y1", westRikishiId: "o1" },
        { boutId: "b-y2-o2", day: 11, eastRikishiId: "y2", westRikishiId: "o2" },
      ],
      standings: new Map(bashoD12.standings),
    });
    const pairingsD14 = buildSwissTorikumi(bashoD14, pool, {
      seed: "backload-d14",
      division: "makuuchi",
    });
    expect(findOpponentId(pairingsD14, "y1")).not.toBe("y2");

    // Day 15 pairs y1 vs y2 in kore_yori_sanyaku
    const bashoD15 = MockFactory.createBasho({
      day: 15,
      matches: bashoD14.matches,
      standings: new Map(bashoD12.standings),
    });
    const pairingsD15 = buildSwissTorikumi(bashoD15, pool, {
      seed: "backload-d15",
      division: "makuuchi",
    });
    expect(findOpponentId(pairingsD15, "y1")).toBe("y2");
    const finaleBout = pairingsD15.find(
      (p) => (p.eastId === "y1" && p.westId === "y2") || (p.eastId === "y2" && p.westId === "y1")
    );
    expect(finaleBout?.reasons).toContain("finale");
  });

  it("scorePairing emits joi_jin_scheduling and yokozuna_joi_backload without reading stale basho.day", () => {
    const { y1, m1, m4, o1 } = buildFullUpperDeck();
    const bashoDay1 = MockFactory.createBasho({ day: 1 });

    const d2M4 = scorePairing({ basho: bashoDay1, a: y1, b: m4, day: 2 });
    const d2M1 = scorePairing({ basho: bashoDay1, a: y1, b: m1, day: 2 });
    expect(d2M4?.reasons).toContain("joi_jin_scheduling");
    expect(d2M4?.reasons).toContain("yokozuna_joi_backload");
    expect(d2M4!.score).toBeGreaterThan(d2M1!.score);

    const earlyClash = scorePairing({ basho: bashoDay1, a: y1, b: o1, day: 5 });
    expect(earlyClash?.reasons).toContain("elite_clash_deferred");
  });

  it("applyDramaBudget refuses swaps that violate same-heya, sibling, or locked back-load pairings", () => {
    const y1 = MockFactory.createRikishi("y1", { rank: "yokozuna", heyaId: "hA" });
    const m1 = MockFactory.createRikishi("m1", {
      rank: "maegashira",
      rankNumber: 1,
      heyaId: "hB",
    });
    const m2 = MockFactory.createRikishi("m2", {
      rank: "maegashira",
      rankNumber: 2,
      heyaId: "hA",
      siblingIds: ["m3"],
    });
    const m3 = MockFactory.createRikishi("m3", {
      rank: "maegashira",
      rankNumber: 3,
      heyaId: "hC",
      siblingIds: ["m2"],
    });
    const map = new Map([
      ["y1", y1],
      ["m1", m1],
      ["m2", m2],
      ["m3", m3],
    ]);
    const standings = new Map([
      ["y1", { wins: 9, losses: 5 }],
      ["m1", { wins: 7, losses: 7 }],
      ["m2", { wins: 7, losses: 7 }],
      ["m3", { wins: 5, losses: 9 }],
    ]);

    const lockedResult = applyDramaBudget(
      [
        { eastId: "y1", westId: "m3", score: 1, reasons: ["yokozuna_backload"] },
        { eastId: "m1", westId: "m2", score: 1, reasons: [] },
      ],
      map,
      15,
      standings,
      new Set()
    );
    expect(lockedResult[0].eastId).toBe("y1");
    expect(lockedResult[0].westId).toBe("m3");

    // Unlocked pairings where swapping easts would create y1 vs m2 (same heya hA)
    const heyaBlocked = applyDramaBudget(
      [
        { eastId: "m1", westId: "m2", score: 1, reasons: [] },
        { eastId: "y1", westId: "m3", score: 1, reasons: [] },
      ],
      map,
      15,
      standings,
      new Set()
    );
    expect(heyaBlocked[0].eastId).toBe("m1");
    expect(heyaBlocked[0].westId).toBe("m2");
  });
});
