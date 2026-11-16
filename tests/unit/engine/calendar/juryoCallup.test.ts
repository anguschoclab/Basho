import { describe, it, expect } from "vitest";
import { scheduleAllDivisionsDay } from "@/engine/calendar/schedule";
import { resolveAndApplyBout } from "@/engine/bout/boutPipeline";
import { mockRikishi, makeMockBasho, makeMockWorld } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";

/**
 * Juryo → Makuuchi crossover (W B): when the makuuchi card is odd, a top
 * juryo rikishi is called up to face the leftover low-rank maegashira —
 * exactly as the JSA does. The callup is planned before division
 * scheduling so juryo excludes him and his juryo slot back-fills through
 * the existing makushita crossover.
 */

function mkMakuuchi(id: string, rankNumber: number, side: "east" | "west" = "east"): Rikishi {
  return mockRikishi(id, { division: "makuuchi", rank: "maegashira", rankNumber, side });
}

function mkJuryo(id: string, rankNumber: number, side: "east" | "west" = "east"): Rikishi {
  return mockRikishi(id, { division: "juryo", rank: "juryo", rankNumber, side });
}

function mkMakushita(id: string, rankNumber: number): Rikishi {
  return mockRikishi(id, { division: "makushita", rank: "makushita", rankNumber });
}

function buildWorld(rikishiList: Rikishi[]) {
  const world = makeMockWorld({ seed: "juryo-callup-test" });
  for (const r of rikishiList) world.rikishi.set(r.id, r);
  return world;
}

describe("scheduleAllDivisionsDay — juryo → makuuchi callup", () => {
  it("odd makuuchi pool calls up the top juryo rikishi against the lowest maegashira", () => {
    // 3 makuuchi (odd), 6 juryo → after the callup 5 juryo + 5 makushita
    // callups = 10-man pool → everyone fights.
    const world = buildWorld([
      mkMakuuchi("m-high", 5),
      mkMakuuchi("m-mid", 10),
      mkMakuuchi("m-low", 16),
      mkJuryo("j-top", 1),
      mkJuryo("j-2", 2),
      mkJuryo("j-3", 3),
      mkJuryo("j-4", 4),
      mkJuryo("j-5", 5),
      mkJuryo("j-6", 6),
      mkMakushita("ms-1", 1),
      mkMakushita("ms-2", 2),
      mkMakushita("ms-3", 3),
      mkMakushita("ms-4", 4),
      mkMakushita("ms-5", 5),
    ]);
    const basho = makeMockBasho({ day: 1 });

    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho,
      day: 1,
      seed: "s1",
      divisions: ["juryo", "makuuchi"],
    });

    // Cross-division bout pairs the lowest makuuchi man vs the top juryo callup.
    const cross = scheduled.find(
      (m) =>
        (m.eastRikishiId === "m-low" && m.westRikishiId === "j-top") ||
        (m.eastRikishiId === "j-top" && m.westRikishiId === "m-low")
    );
    expect(cross).toBeDefined();
    expect(cross!.crossDivisionCallupId).toBe("j-top");

    // The callup does NOT also fight a juryo bout today.
    const juryoBouts = scheduled.filter(
      (m) => m !== cross && [m.eastRikishiId, m.westRikishiId].includes("j-top")
    );
    expect(juryoBouts).toHaveLength(0);

    // The remaining two makuuchi rikishi still pair against each other.
    const makuuchiPair = scheduled.find(
      (m) =>
        [m.eastRikishiId, m.westRikishiId].sort().join("|") === ["m-high", "m-mid"].sort().join("|")
    );
    expect(makuuchiPair).toBeDefined();

    // Juryo's lost slot back-fills through the makushita crossover: every
    // remaining juryo rikishi is still scheduled (even 10-man pool).
    const pairedIds = new Set(scheduled.flatMap((m) => [m.eastRikishiId, m.westRikishiId]));
    for (const id of ["j-2", "j-3", "j-4", "j-5", "j-6"]) {
      expect(pairedIds.has(id)).toBe(true);
    }
    // And makushita men fill the vacated juryo slots.
    expect(["ms-1", "ms-2", "ms-3", "ms-4", "ms-5"].some((id) => pairedIds.has(id))).toBe(true);
  });

  it("even makuuchi pool produces no callup bout", () => {
    const world = buildWorld([
      mkMakuuchi("m-1", 5),
      mkMakuuchi("m-2", 10),
      mkJuryo("j-1", 1),
      mkJuryo("j-2", 2),
    ]);
    const basho = makeMockBasho({ day: 1 });

    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho,
      day: 1,
      seed: "s2",
      divisions: ["juryo", "makuuchi"],
    });

    expect(scheduled.every((m) => !m.crossDivisionCallupId)).toBe(true);
  });

  it("picks the highest-ranked juryo rikishi — not a mid-pack one", () => {
    const world = buildWorld([
      mkMakuuchi("m-a", 5),
      mkMakuuchi("m-b", 10),
      mkMakuuchi("m-low", 16),
      mkJuryo("j-1e", 1, "east"),
      mkJuryo("j-1w", 1, "west"),
      mkJuryo("j-5", 5),
    ]);
    const basho = makeMockBasho({ day: 1 });

    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho,
      day: 1,
      seed: "s3",
      divisions: ["juryo", "makuuchi"],
    });

    const cross = scheduled.find((m) => m.crossDivisionCallupId);
    // J1e beats J1w and the rest of the field.
    expect(cross?.crossDivisionCallupId).toBe("j-1e");
    expect(cross && [cross.eastRikishiId, cross.westRikishiId].includes("j-1e")).toBe(true);
  });

  it("the cross-division bout lands on the makuuchi rikishi, not a healthy mid-ranker", () => {
    const world = buildWorld([
      mkMakuuchi("m-top", 1),
      mkMakuuchi("m-mid", 8),
      mkMakuuchi("m-lowest", 17, "west"),
      mkJuryo("j-1", 1),
      mkJuryo("j-2", 2),
      mkJuryo("j-3", 3),
    ]);
    const basho = makeMockBasho({ day: 1 });

    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho,
      day: 1,
      seed: "s4",
      divisions: ["juryo", "makuuchi"],
    });

    const cross = scheduled.find((m) => m.crossDivisionCallupId);
    expect(cross).toBeDefined();
    expect([cross!.eastRikishiId, cross!.westRikishiId]).toContain("m-lowest");
  });

  it("no eligible juryo rikishi → makuuchi odd man simply sits out", () => {
    // All juryo rikishi are kyujo — no callup is possible.
    const world = buildWorld([
      mkMakuuchi("m-1", 5),
      mkMakuuchi("m-2", 10),
      mkMakuuchi("m-3", 16),
      mockRikishi("j-out", { division: "juryo", rank: "juryo", rankNumber: 1, isKyujo: true }),
    ]);
    const basho = makeMockBasho({ day: 1 });

    const { scheduled } = scheduleAllDivisionsDay({
      world,
      basho,
      day: 1,
      seed: "s5",
      divisions: ["juryo", "makuuchi"],
    });

    expect(scheduled.every((m) => !m.crossDivisionCallupId)).toBe(true);
    // floor(3/2) = 1 makuuchi pairing; the odd man sits out (existing behavior).
    expect(scheduled).toHaveLength(1);
  });

  it("callup's result counts on his juryo record; the makuuchi man's on makuuchi", () => {
    const blankRecords = () => ({
      makuuchi: { wins: 0, losses: 0 },
      juryo: { wins: 0, losses: 0 },
      makushita: { wins: 0, losses: 0 },
      sandanme: { wins: 0, losses: 0 },
      jonidan: { wins: 0, losses: 0 },
      jonokuchi: { wins: 0, losses: 0 },
    });
    const world = buildWorld([
      { ...mkMakuuchi("m-odd", 16), divisionRecords: blankRecords() },
      { ...mkJuryo("j-call", 1), divisionRecords: blankRecords() },
    ]);
    const basho = makeMockBasho({ day: 1 });

    const match = {
      boutId: "b-cross",
      day: 1,
      eastRikishiId: "m-odd",
      westRikishiId: "j-call",
      crossDivisionCallupId: "j-call",
    };
    basho.matches = [match];
    world.currentBasho = basho;

    const { result, world: after } = resolveAndApplyBout(world, basho, match, undefined, "fb");

    expect(result).toBeDefined();
    // Metadata propagates onto the result for narrative/UI.
    expect(result!.crossDivisionCallupId).toBe("j-call");

    const winner = after.rikishi.get(result!.winnerRikishiId)!;
    const loser = after.rikishi.get(result!.loserRikishiId)!;
    expect(winner.divisionRecords?.[winner.division]?.wins ?? 0).toBeGreaterThan(0);
    expect(loser.divisionRecords?.[loser.division]?.losses ?? 0).toBeGreaterThan(0);
  });
});
