import { describe, it, expect } from "vitest";
import { projectExhibitions } from "@/presenters/exhibitionProjections";
import type { WorldState, PendingExhibition } from "@/engine/types/world";

function makeWorld(pending: PendingExhibition[] = [], playerHeyaId = "h1"): WorldState {
  return {
    seed: "test",
    year: 2024,
    week: 5,
    heyas: new Map([["h1", { id: "h1" } as any], ["h2", { id: "h2" } as any]]),
    rikishi: new Map(),
    playerHeyaId,
    pendingExhibitions: pending,
  } as any;
}

function makeInvitation(overrides: Partial<PendingExhibition> = {}): PendingExhibition {
  return {
    id: "ex1",
    heyaId: "h1",
    region: "Mongolia",
    prestige: 50,
    expiresAtWeek: 10,
    ...overrides,
  };
}

describe("projectExhibitions", () => {
  it("returns empty when no pending exhibitions", () => {
    const result = projectExhibitions(makeWorld(), "h1");
    expect(result.invitations).toEqual([]);
    expect(result.hasInvitations).toBe(false);
  });

  it("returns only invitations for the specified heya", () => {
    const pending = [
      makeInvitation({ id: "ex1", heyaId: "h1" }),
      makeInvitation({ id: "ex2", heyaId: "h2" }),
    ];
    const result = projectExhibitions(makeWorld(pending), "h1");
    expect(result.invitations).toHaveLength(1);
    expect(result.invitations[0].id).toBe("ex1");
  });

  it("maps region and prestige", () => {
    const pending = [makeInvitation({ region: "Europe", prestige: 85 })];
    const result = projectExhibitions(makeWorld(pending), "h1");
    expect(result.invitations[0].region).toBe("Europe");
    expect(result.invitations[0].prestige).toBe(85);
  });

  it("assigns prestige label based on prestige value", () => {
    expect(
      projectExhibitions(makeWorld([makeInvitation({ prestige: 85 })]), "h1")
        .invitations[0].prestigeLabel
    ).toBe("Prestigious");
    expect(
      projectExhibitions(makeWorld([makeInvitation({ prestige: 65 })]), "h1")
        .invitations[0].prestigeLabel
    ).toBe("Notable");
    expect(
      projectExhibitions(makeWorld([makeInvitation({ prestige: 45 })]), "h1")
        .invitations[0].prestigeLabel
    ).toBe("Standard");
    expect(
      projectExhibitions(makeWorld([makeInvitation({ prestige: 25 })]), "h1")
        .invitations[0].prestigeLabel
    ).toBe("Minor");
  });

  it("sets hasInvitations to true when invitations exist", () => {
    const pending = [makeInvitation()];
    const result = projectExhibitions(makeWorld(pending), "h1");
    expect(result.hasInvitations).toBe(true);
  });
});
