import { describe, it, expect } from "vitest";
import { rosterSlice } from "@/contexts/rosterSlice";
import type { GameState } from "@/contexts/gameTypes";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../engine/utils";

function makeGameStateWithPair(
  mentorOverrides: Partial<ReturnType<typeof mockRikishi>> = {},
  apprenticeOverrides: Partial<ReturnType<typeof mockRikishi>> = {}
): GameState {
  const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1", ...mentorOverrides });
  const apprentice = mockRikishi("apprentice", {
    rank: "makushita",
    heyaId: "h1",
    ...apprenticeOverrides,
  });
  const rikishi = new Map([
    [mentor.id, mentor],
    [apprentice.id, apprentice],
  ]);
  const heya = makeMockHeya("h1", { rikishiIds: Array.from(rikishi.keys()) });
  const world = makeMockWorld({
    rikishi,
    heyas: new Map([["h1", heya]]),
    lineage: [],
    rivalriesState: { pairs: {}, version: "1.0.0" } as any,
  });

  return {
    phase: "stable",
    world,
    digest: null,
    currentBoutIndex: 0,
    lastBoutResult: null,
    playerHeyaId: "h1",
    playerOyakataId: null,
    isAutoPlaying: false,
    boutTactics: {},
  } as GameState;
}

describe("rosterSlice mentorship", () => {
  it("ASSIGN_MENTOR applies lineage.assignMentor impact to world", () => {
    const state = makeGameStateWithPair();
    const action = {
      type: "ASSIGN_MENTOR" as const,
      mentorId: "mentor",
      apprenticeId: "apprentice",
    };
    const next = rosterSlice(state, action);

    const apprentice = next.world?.rikishi.get("apprentice");
    const mentor = next.world?.rikishi.get("mentor");
    expect(apprentice?.mentorId).toBe("mentor");
    expect(mentor?.menteeIds).toContain("apprentice");
    expect(
      next.world?.lineage?.some((e) => e.mentorId === "mentor" && e.menteeId === "apprentice")
    ).toBe(true);
    expect(next.world?.rivalriesState?.pairs).toBeDefined();
  });

  it("ASSIGN_MENTOR leaves world unchanged when eligibility check fails", () => {
    const state = makeGameStateWithPair({}, { rank: "juryo" }); // apprentice is sekitori
    const action = {
      type: "ASSIGN_MENTOR" as const,
      mentorId: "mentor",
      apprenticeId: "apprentice",
    };
    const next = rosterSlice(state, action);

    const apprentice = next.world?.rikishi.get("apprentice");
    expect(apprentice?.mentorId).toBeUndefined();
    expect(next.world?.lineage).toHaveLength(0);
  });

  it("REMOVE_MENTOR clears mentorId and menteeIds", () => {
    const state = makeGameStateWithPair();
    const assignAction = {
      type: "ASSIGN_MENTOR" as const,
      mentorId: "mentor",
      apprenticeId: "apprentice",
    };
    const assigned = rosterSlice(state, assignAction);

    const removeAction = { type: "REMOVE_MENTOR" as const, apprenticeId: "apprentice" };
    const next = rosterSlice(assigned, removeAction);

    const apprentice = next.world?.rikishi.get("apprentice");
    const mentor = next.world?.rikishi.get("mentor");
    expect(apprentice?.mentorId).toBeUndefined();
    expect(mentor?.menteeIds).not.toContain("apprentice");
  });
});
