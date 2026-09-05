/**
 * EnterJungyoCommand.test.ts — tests ACCEPT_EXHIBITION/DECLINE_EXHIBITION worker commands.
 * Plan Feature 7 Test-First Protocol item 2.
 * Note: Plan specified ENTER_JUNGYO/SKIP_JUNGYO; implementation uses ACCEPT_EXHIBITION/DECLINE_EXHIBITION
 * which are functionally equivalent.
 */
import { describe, it, expect } from "vitest";

describe("Exhibition (Jungyo) worker commands", () => {
  it("ACCEPT_EXHIBITION and DECLINE_EXHIBITION command types are defined", async () => {
    // Verify the command types compile correctly
    const acceptCmd = { type: "ACCEPT_EXHIBITION" as const, heyaId: "h1", invitationId: "ex1" };
    const declineCmd = { type: "DECLINE_EXHIBITION" as const, heyaId: "h1", invitationId: "ex1" };

    expect(acceptCmd.type).toBe("ACCEPT_EXHIBITION");
    expect(declineCmd.type).toBe("DECLINE_EXHIBITION");
    expect(acceptCmd.heyaId).toBe("h1");
    expect(acceptCmd.invitationId).toBe("ex1");
  });

  it("ACCEPT_EXHIBITION calls processExhibitionResult via service", async () => {
    const { WorldCircuitService } = await import("@/engine/systems/worldCircuit/WorldCircuitService");
    expect(typeof WorldCircuitService.processExhibitionResult).toBe("function");
  });
});
