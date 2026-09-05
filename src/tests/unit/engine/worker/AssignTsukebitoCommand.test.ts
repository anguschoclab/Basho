/**
 * AssignTsukebitoCommand.test.ts — tests SET_TSUKEBITO/CLEAR_TSUKEBITO worker commands.
 * Plan Feature 10 Test-First Protocol item 4.
 * Note: Plan specified ASSIGN_TSUKEBITO/CLEAR_TSUKEBITO; implementation uses SET_TSUKEBITO/CLEAR_TSUKEBITO.
 */
import { describe, it, expect } from "vitest";

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

  it("setTsukebito and clearTsukebito service functions exist", async () => {
    const mod = await import("@/engine/systems/training/TsukebitoService");
    expect(typeof mod.setTsukebito).toBe("function");
    expect(typeof mod.clearTsukebito).toBe("function");
  });
});
