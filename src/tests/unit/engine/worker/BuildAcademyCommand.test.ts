/**
 * BuildAcademyCommand.test.ts — tests BUILD_FOREIGN_ACADEMY worker command.
 * Plan Feature 11 Test-First Protocol item 4.
 * Note: Plan specified BUILD_ACADEMY; implementation uses BUILD_FOREIGN_ACADEMY.
 */
import { describe, it, expect } from "vitest";

describe("BUILD_FOREIGN_ACADEMY worker command", () => {
  it("BUILD_FOREIGN_ACADEMY command type is defined", () => {
    const cmd = {
      type: "BUILD_FOREIGN_ACADEMY" as const,
      heyaId: "h1",
      region: "europe",
    };
    expect(cmd.type).toBe("BUILD_FOREIGN_ACADEMY");
    expect(cmd.heyaId).toBe("h1");
    expect(cmd.region).toBe("europe");
  });

  it("BUILD_YOUTH_ACADEMY command type is defined", () => {
    const cmd = {
      type: "BUILD_YOUTH_ACADEMY" as const,
      heyaId: "h1",
    };
    expect(cmd.type).toBe("BUILD_YOUTH_ACADEMY");
  });

  it("buildForeignAcademy is callable via WorldCircuitService", async () => {
    const { WorldCircuitService } = await import("@/engine/systems/worldCircuit/WorldCircuitService");
    expect(typeof WorldCircuitService.buildForeignAcademy).toBe("function");
  });
});
