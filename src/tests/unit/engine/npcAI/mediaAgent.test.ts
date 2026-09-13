import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { handleNPCMediaEvent } from "@/engine/npcAI/handlers";
import { handleMediaEventForHeya } from "@/engine/systems/media/MediaEventService";
import { applyImpact } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import type { GovernanceRuling } from "@/engine/types/economy";

/**
 * WS3 contract tests — NPC media autonomy.
 *
 * NPC media responses are chosen by MediaAgent (traits/mood/severity/
 * confidence), and effects are scoped to the acting heya — never the
 * global ±5 sweep of the player path and never `playerChoice`.
 */

function ruling(id: string, heyaId: string): GovernanceRuling {
  return {
    id,
    date: "2026-03-01",
    heyaId,
    type: "warning",
    severity: "medium",
    reason: "nightlife scandal",
    effects: {},
    incident: "scandal_nightlife",
  };
}

function makeWorld(): WorldState {
  const heyaA = MockFactory.createHeya("heya-a", {
    oyakataId: "oya-a",
    reputation: 60,
  });
  const heyaB = MockFactory.createHeya("heya-b", { oyakataId: "oya-b" });
  const oyaA = MockFactory.createOyakata("oya-a", { heyaId: "heya-a" });
  const oyaB = MockFactory.createOyakata("oya-b", { heyaId: "heya-b" });
  return MockFactory.createWorld({
    heyas: new Map([
      ["heya-a", heyaA],
      ["heya-b", heyaB],
      ["player-heya", MockFactory.createHeya("player-heya", { isPlayerOwned: true })],
    ]),
    oyakata: new Map([
      ["oya-a", oyaA],
      ["oya-b", oyaB],
    ]),
    governanceLog: [ruling("ev-1", "heya-a")],
    mediaState: {
      version: "1.0.0",
      heyaPressure: { "heya-a": 50, "heya-b": 40 },
      mediaHeat: { "heya-a": 30, "heya-b": 20 },
      headlines: [],
      bashoStreaks: {},
      streakHeadlinesFired: {},
      promoWatchFired: {},
      retirementWatchFired: {},
      titleRaceDayFired: {},
      injuryWithdrawalFired: {},
      mediaHeatHistory: {},
      absenceAnnouncements: [],
    },
    rivalriesState: {
      version: "1.0.0",
      pairs: {},
      heyaRivalryPairs: {
        "heya-a|heya-b": {
          id: "heya-a|heya-b",
          heyaAId: "heya-a",
          heyaBId: "heya-b",
          heat: 80,
          aWins: 1,
          bWins: 1,
        },
      },
    },
    playerHeyaId: "player-heya",
    week: 10,
  });
}

describe("handleNPCMediaEvent", () => {
  it("returns a MediaAgent response and logs a heya-scoped MEDIA_RESPONSE event", () => {
    const world = makeWorld();
    const res = handleNPCMediaEvent(world, "heya-a", "ev-1", "scandal", "moderate");
    expect(["apologize", "deny", "ignore", "deflect"]).toContain(res.response);
    expect(
      res.impact.events?.some((e) => e.type === "MEDIA_RESPONSE" && e.heyaId === "heya-a")
    ).toBe(true);
  });
});

describe("handleMediaEventForHeya — actor-aware media effects", () => {
  it("apologize reduces ONLY the acting heya's pressure (no global sweep)", () => {
    const world = makeWorld();
    const resolved = applyImpact(world, handleMediaEventForHeya(world, "ev-1", "apologize", "heya-a"));
    expect(resolved.mediaState?.heyaPressure["heya-a"]).toBe(45);
    expect(resolved.mediaState?.heyaPressure["heya-b"]).toBe(40);
    expect(resolved.mediaState?.mediaHeat["heya-b"]).toBe(20);
  });

  it("deny raises only the acting heya's pressure", () => {
    const world = makeWorld();
    const resolved = applyImpact(world, handleMediaEventForHeya(world, "ev-1", "deny", "heya-a"));
    expect(resolved.mediaState?.heyaPressure["heya-a"]).toBe(55);
    expect(resolved.mediaState?.heyaPressure["heya-b"]).toBe(40);
  });

  it("deflect shifts pressure onto the hottest heya rival and costs reputation", () => {
    const world = makeWorld();
    const resolved = applyImpact(world, handleMediaEventForHeya(world, "ev-1", "deflect", "heya-a"));
    expect(resolved.mediaState?.heyaPressure["heya-a"]).toBe(47);
    expect(resolved.mediaState?.heyaPressure["heya-b"]).toBe(43);
    expect(resolved.heyas.get("heya-a")!.reputation).toBeLessThan(60);
  });

  it("records actorChoice/actorId on the ruling — never playerChoice or 'Player chose'", () => {
    const world = makeWorld();
    const resolved = applyImpact(world, handleMediaEventForHeya(world, "ev-1", "deny", "heya-a"));
    const updated = resolved.governanceLog!.find((r) => r.id === "ev-1")!;
    expect(updated.actorChoice).toBe("deny");
    expect(updated.actorId).toBe("heya-a");
    expect(updated.playerChoice).toBeUndefined();
    expect(updated.playerResponse ?? "").not.toContain("Player chose");
  });

  it("leaves the player's own rulings untouched", () => {
    const world = makeWorld();
    world.governanceLog = [...world.governanceLog!, ruling("ev-p", "player-heya")];
    const resolved = applyImpact(world, handleMediaEventForHeya(world, "ev-p", "deny", "heya-a"));
    const playerRuling = resolved.governanceLog!.find((r) => r.id === "ev-p")!;
    expect(playerRuling.actorChoice).toBeUndefined();
  });
});
