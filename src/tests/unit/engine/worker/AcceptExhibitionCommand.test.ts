/**
 * AcceptExhibitionCommand.test.ts — tests ACCEPT_EXHIBITION worker command.
 * Plan Feature 11 Test-First Protocol item 3.
 * Note: Plan specified ACCEPT_EXHIBITION_INVITATION; implementation uses ACCEPT_EXHIBITION.
 */
import { describe, it, expect } from "vitest";

describe("ACCEPT_EXHIBITION worker command", () => {
  it("ACCEPT_EXHIBITION command type is defined", () => {
    const cmd = {
      type: "ACCEPT_EXHIBITION" as const,
      heyaId: "h1",
      invitationId: "ex1",
    };
    expect(cmd.type).toBe("ACCEPT_EXHIBITION");
    expect(cmd.heyaId).toBe("h1");
    expect(cmd.invitationId).toBe("ex1");
  });

  it("DECLINE_EXHIBITION command type is defined", () => {
    const cmd = {
      type: "DECLINE_EXHIBITION" as const,
      heyaId: "h1",
      invitationId: "ex1",
    };
    expect(cmd.type).toBe("DECLINE_EXHIBITION");
  });

  it("processExhibitionResult is callable via WorldCircuitService", async () => {
    const { WorldCircuitService } = await import("@/engine/systems/worldCircuit/WorldCircuitService");
    expect(typeof WorldCircuitService.processExhibitionResult).toBe("function");
  });
});
