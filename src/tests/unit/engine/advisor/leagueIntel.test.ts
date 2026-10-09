/**
 * leagueIntel.test.ts — WS7 advisor intelligence categories.
 *
 * The advisor must surface league-level signals a diligent oyakata would
 * notice: rival plan shifts, meta drift, succession watch, faction pressure,
 * and contested foreign recruits. All outputs are banded — no raw traits.
 */
import { describe, it, expect } from "vitest";
import { generateRecommendations } from "@/engine/advisor/AdvisorService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

function baseWorld(): WorldState {
  const player = MockFactory.createHeya("h-player", { rikishiIds: [] });
  const world = MockFactory.createWorld({
    heyas: new Map([["h-player", player]]),
    playerHeyaId: "h-player",
    week: 10,
    calendar: { currentWeek: 10 } as never,
  });
  return world;
}

describe("AdvisorService — WS7 league intel", () => {
  it("detects a rival stable's recent plan shift", () => {
    const world = baseWorld();
    world.heyas.set("h-rival", MockFactory.createHeya("h-rival"));
    world.events = {
      version: "1.0.0",
      log: [
        {
          type: "STRATEGY_SHIFT",
          category: "ai_plan_change",
          week: 9,
          data: { heyaId: "h-rival", planId: "yokozuna_push" },
        } as never,
      ],
      dedupe: {},
    } as never;

    const recs = generateRecommendations(world, "h-player");
    const intel = recs.find((r) => r.id === "rival-plan-shift");
    expect(intel).toBeDefined();
    expect(intel!.category).toBe("rivalry");
    expect(intel!.detail).toContain("yokozuna_push");
  });

  it("ignores stale plan shifts beyond the intel window", () => {
    const world = baseWorld();
    world.heyas.set("h-rival", MockFactory.createHeya("h-rival"));
    world.events = {
      version: "1.0.0",
      log: [
        {
          type: "STRATEGY_SHIFT",
          category: "ai_plan_change",
          week: 1,
          data: { heyaId: "h-rival", planId: "yokozuna_push" },
        } as never,
      ],
      dedupe: {},
    } as never;

    const recs = generateRecommendations(world, "h-player");
    expect(recs.find((r) => r.id === "rival-plan-shift")).toBeUndefined();
  });

  it("issues a meta-drift bulletin when a family is established-dominant", () => {
    const world = baseWorld();
    world.meta = {
      tone: "technical",
      history: [
        { year: 4, tone: "technical", familyShares: { push: 0.2, belt: 0.5, speed: 0.2, trick: 0.1 } },
        { year: 5, tone: "technical", familyShares: { push: 0.15, belt: 0.6, speed: 0.15, trick: 0.1 } },
      ],
    } as never;

    const recs = generateRecommendations(world, "h-player");
    const bulletin = recs.find((r) => r.id === "meta-drift-bulletin");
    expect(bulletin).toBeDefined();
    expect(bulletin!.detail).toContain("belt");
  });

  it("stays silent on the meta when dominance is unclear", () => {
    const world = baseWorld();
    world.meta = {
      tone: "classic",
      history: [
        { year: 5, tone: "classic", familyShares: { push: 0.27, belt: 0.26, speed: 0.25, trick: 0.22 } },
      ],
    } as never;

    const recs = generateRecommendations(world, "h-player");
    expect(recs.find((r) => r.id === "meta-drift-bulletin")).toBeUndefined();
  });

  it("watches a rival oyakata approaching mandatory retirement", () => {
    const world = baseWorld();
    const oya = MockFactory.createOyakata("o-rival", {
      heyaId: "h-rival",
      successionReadiness: "mandatory",
    });
    world.oyakata.set("o-rival", oya);
    world.heyas.set("h-rival", MockFactory.createHeya("h-rival", { oyakataId: "o-rival" }));

    const recs = generateRecommendations(world, "h-player");
    const watch = recs.find((r) => r.id === "succession-watch");
    expect(watch).toBeDefined();
  });

  it("warns when an ichimon coordinates pressure against the player", () => {
    const world = baseWorld();
    world.heyas.set("h-rival", MockFactory.createHeya("h-rival", { ichimon: "Dewanoumi" }));
    world.factionPostures = {
      Dewanoumi: { posture: "coordinated_pressure", targetHeyaId: "h-player", setWeek: 9 },
    };

    const recs = generateRecommendations(world, "h-player");
    const warn = recs.find((r) => r.id === "faction-pressure");
    expect(warn).toBeDefined();
    expect(warn!.priority === "high" || warn!.priority === "critical").toBe(true);
  });

  it("flags a contested foreign recruit while the player's slot is free", () => {
    const world = baseWorld();
    const pool = MockFactory.createTalentPool();
    const foreignStar = MockFactory.createCandidate("fc-star", {
      nationality: "Mongolia",
      isEmergentProdigy: true,
      availabilityState: "available",
    });
    pool.candidates[foreignStar.candidateId] = foreignStar;
    pool.pools.foreign.candidatesVisible.push(foreignStar.candidateId);
    world.talentPool = pool;

    const recs = generateRecommendations(world, "h-player");
    const rec = recs.find((r) => r.id === "contested-foreign-recruit");
    expect(rec).toBeDefined();
    expect(rec!.category).toBe("recruitment");
  });

  it("does not flag a foreign recruit when the player's slot is occupied", () => {
    const world = baseWorld();
    const incumbent = MockFactory.createRikishi("r-foreign", {
      heyaId: "h-player",
      nationality: "Mongolia",
      citizenshipStatus: "foreign",
    } as never);
    world.rikishi.set("r-foreign", incumbent);
    const player = world.heyas.get("h-player")!;
    player.rikishiIds = ["r-foreign"];
    const pool = MockFactory.createTalentPool();
    const foreignStar = MockFactory.createCandidate("fc-star", {
      nationality: "Mongolia",
      isEmergentProdigy: true,
      availabilityState: "available",
    });
    pool.candidates[foreignStar.candidateId] = foreignStar;
    pool.pools.foreign.candidatesVisible.push(foreignStar.candidateId);
    world.talentPool = pool;

    const recs = generateRecommendations(world, "h-player");
    expect(recs.find((r) => r.id === "contested-foreign-recruit")).toBeUndefined();
  });
});
