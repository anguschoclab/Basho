/**
 * scoutingStore.purity.test.ts
 *
 * Regression tests for presenter read-path world mutation (audit WS4-04).
 *
 * `getOrCreateScouted` is invoked from `boutProjections` — a render-path
 * projection — but it creates `world.playerKnowledge.scouting` and writes
 * entries into it. Read paths must not mutate WorldState: the worker is the
 * authoritative world owner, so a main-thread write either gets clobbered by
 * the next WORLD_UPDATED (scouted data flickers/vanishes) or leaks into an
 * autosave the worker never produced.
 *
 * These tests pin the read-only contract. Explicit scouting actions
 * (`setScoutingInvestment`, `tickWeekScouting`) may still mutate via impacts.
 */
import { describe, it, expect } from "vitest";
import { getOrCreateScouted } from "@/engine/scoutingStore";
import { makeMockWorld, mockRikishi } from "./utils";

describe("scoutingStore read-path purity", () => {
  it("getOrCreateScouted does not create world.playerKnowledge on a world that lacks it", () => {
    const world = makeMockWorld({ playerHeyaId: "h1" });
    delete (world as any).playerKnowledge;
    world.rikishi.set("r1", mockRikishi("r1", { heyaId: "other-heya" }));

    getOrCreateScouted(world, "r1");

    expect(world.playerKnowledge).toBeUndefined();
  });

  it("getOrCreateScouted does not write into an existing scouting table", () => {
    const world = makeMockWorld({ playerHeyaId: "h1" });
    const r1 = mockRikishi("r1", { heyaId: "other-heya" });
    world.rikishi.set("r1", r1);

    const existingEntry = { rikishiId: "r1", marker: "original" } as any;
    (world as any).playerKnowledge = { scouting: { r1: existingEntry } };
    const tableBefore = (world as any).playerKnowledge.scouting;

    getOrCreateScouted(world, "r1");

    // No writes at all on a read path — no new keys, no replaced entries.
    expect(Object.keys(tableBefore)).toEqual(["r1"]);
    expect(tableBefore.r1).toBe(existingEntry);
  });
});
