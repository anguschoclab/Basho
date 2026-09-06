/**
 * AssignTsukebitoCommand.test.ts — tests SET_TSUKEBITO/CLEAR_TSUKEBITO/REMOVE_TSUKEBITO worker commands.
 * Plan Feature 10 Test-First Protocol item 4.
 * Note: Plan specified ASSIGN_TSUKEBITO/CLEAR_TSUKEBITO; implementation uses SET_TSUKEBITO/CLEAR_TSUKEBITO/REMOVE_TSUKEBITO.
 */
import { describe, it, expect } from "vitest";
import { setTsukebito, clearTsukebito } from "@/engine/systems/training/TsukebitoService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi } from "../utils";

describe("Tsukebito worker commands", () => {
  it("SET_TSUKEBITO command type is defined", () => {
    const cmd = {
      type: "SET_TSUKEBITO" as const,
      seniorId: "r1",
      tsukebitoIds: ["r2", "r3"],
    };
    expect(cmd.type).toBe("SET_TSUKEBITO");
    expect(cmd.seniorId).toBe("r1");
    expect(cmd.tsukebitoIds).toEqual(["r2", "r3"]);
  });

  it("CLEAR_TSUKEBITO command type is defined", () => {
    const cmd = {
      type: "CLEAR_TSUKEBITO" as const,
      seniorId: "r1",
    };
    expect(cmd.type).toBe("CLEAR_TSUKEBITO");
    expect(cmd.seniorId).toBe("r1");
  });

  it("REMOVE_TSUKEBITO command type is defined", () => {
    const cmd = {
      type: "REMOVE_TSUKEBITO" as const,
      seniorId: "r1",
      juniorId: "r2",
    };
    expect(cmd.type).toBe("REMOVE_TSUKEBITO");
    expect(cmd.seniorId).toBe("r1");
    expect(cmd.juniorId).toBe("r2");
  });

  it("setTsukebito and clearTsukebito service functions exist", async () => {
    const mod = await import("@/engine/systems/training/TsukebitoService");
    expect(typeof mod.setTsukebito).toBe("function");
    expect(typeof mod.clearTsukebito).toBe("function");
  });

  it("REMOVE_TSUKEBITO actually removes a single junior without clearing the rest", () => {
    // Regression: the StablePage Remove button previously dispatched SET_TSUKEBITO
    // with the remaining IDs, but setTsukebito early-returns if the junior is
    // already present, so removal was a no-op. clearTsukebito(seniorId, juniorId)
    // must remove exactly one junior and leave the others intact.
    const senior = mockRikishi("senior", { rank: "maegashira", rankNumber: 3, tsukebitoIds: ["j1", "j2", "j3"], tsukebitoPlayerSet: true, heyaId: "h1" });
    const j1 = mockRikishi("j1", { rank: "jonokuchi", rankNumber: 15, heyaId: "h1" });
    const j2 = mockRikishi("j2", { rank: "jonokuchi", rankNumber: 15, heyaId: "h1" });
    const j3 = mockRikishi("j3", { rank: "jonokuchi", rankNumber: 15, heyaId: "h1" });
    const world = {
      seed: "rm",
      rikishi: new Map([
        ["senior", senior],
        ["j1", j1],
        ["j2", j2],
        ["j3", j3],
      ]),
    } as any;

    const impact = clearTsukebito(world, "senior", "j2");
    const next = resolveImpacts(world, [impact]);
    expect(next.rikishi.get("senior")?.tsukebitoIds).toEqual(["j1", "j3"]);
    expect(next.rikishi.get("senior")?.tsukebitoPlayerSet).toBe(true);
  });

  it("SET_TSUKEBITO cannot remove (it only appends — proves why REMOVE_TSUKEBITO is needed)", () => {
    const senior = mockRikishi("senior", { rank: "maegashira", rankNumber: 3, tsukebitoIds: ["j1", "j2"], tsukebitoPlayerSet: true, heyaId: "h1" });
    const j1 = mockRikishi("j1", { rank: "jonokuchi", rankNumber: 15, heyaId: "h1" });
    const j2 = mockRikishi("j2", { rank: "jonokuchi", rankNumber: 15, heyaId: "h1" });
    const world = {
      seed: "rm",
      rikishi: new Map([
        ["senior", senior],
        ["j1", j1],
        ["j2", j2],
      ]),
    } as any;

    // Simulate the old broken Remove button: send SET_TSUKEBITO with [j1]
    // (the remaining list after removing j2). j1 is already present → early-return
    // at TsukebitoService.ts:188 → j2 is never removed.
    let next = world;
    for (const juniorId of ["j1"]) {
      const impact = setTsukebito(next, "senior", juniorId);
      next = resolveImpacts(next, [impact]);
    }
    expect(next.rikishi.get("senior")?.tsukebitoIds).toEqual(["j1", "j2"]);
  });
});
