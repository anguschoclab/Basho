import { describe, it, expect } from "vitest";
import { resolveMorningOfDay } from "@/engine/basho/morningOfDay";
import { advanceBashoDay } from "@/engine/core/world";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { MatchSchedule } from "@/engine/types/basho";

/**
 * Morning-of-day evaluation (W A): once injured rikishi are schedulable,
 * the day must open with the withdraw/compete evaluation BEFORE bouts —
 * NPC oyakata make kyujo calls; player-heya injuries surface as blocking
 * kyujo_decisions. This replaces scheduling-time exclusion so "fighting
 * hurt" (and the decision that enables it) actually exists.
 */
function worldWithTodayCard(
  entrants: ReturnType<typeof MockFactory.createRikishi>[],
  day = 4,
  playerHeyaId?: string
): WorldState {
  const matches: MatchSchedule[] = [];
  for (let i = 0; i + 1 < entrants.length; i += 2) {
    matches.push({
      boutId: `mor-b${i / 2}`,
      day,
      eastRikishiId: entrants[i].id,
      westRikishiId: entrants[i + 1].id,
      division: "makuuchi",
    } as MatchSchedule);
  }
  return MockFactory.createWorld({
    cyclePhase: "active_basho",
    playerHeyaId,
    currentBasho: MockFactory.createBasho({ day, matches }),
    rikishi: new Map(entrants.map((r) => [r.id, r])),
  });
}

describe("resolveMorningOfDay", () => {
  it("withdraws a seriously injured NPC scheduled to fight", () => {
    const hurt = MockFactory.createRikishi("r-serious", {
      heyaId: "npc-heya",
      injured: true,
      injuryStatus: {
        type: "tear",
        isInjured: true,
        severity: "serious",
        location: "knee",
        weeksRemaining: 8,
      },
    });
    const opp = MockFactory.createRikishi("r-opp", { heyaId: "other-heya" });
    const world = worldWithTodayCard([hurt, opp]);

    const world2 = resolveImpacts(world, [resolveMorningOfDay(world)]);

    expect(world2.rikishi.get("r-serious")?.isKyujo).toBe(true);
    expect(world2.rikishi.get("r-serious")?.kyujoReason).toBe("injury");
  });

  it("surfaces a blocking kyujo_decision for an injured player rikishi", () => {
    const hurt = MockFactory.createRikishi("r-player", {
      heyaId: "player-heya",
      injured: true,
      injuryStatus: {
        type: "sprain",
        isInjured: true,
        severity: "moderate",
        location: "ankle",
        weeksRemaining: 2,
      },
    });
    const opp = MockFactory.createRikishi("r-opp", { heyaId: "npc-heya" });
    const world = worldWithTodayCard([hurt, opp], 4, "player-heya");
    // Player heya must exist for the decision detector.
    world.heyas.set(
      "player-heya",
      MockFactory.createHeya("player-heya", { rikishiIds: ["r-player"] })
    );

    const world2 = resolveImpacts(world, [resolveMorningOfDay(world)]);

    const decisions = world2.pendingDecisions ?? [];
    expect(decisions.some((d) => d.id === "kyujo_r-player_4")).toBe(true);
    expect(world2.pendingCrisis?.id).toBe("kyujo_r-player_4");
    // The rikishi is NOT auto-withdrawn — the decision is the player's.
    expect(world2.rikishi.get("r-player")?.isKyujo).toBeFalsy();
  });

  it("does not surface a decision for a minor injury", () => {
    const hurt = MockFactory.createRikishi("r-minor", {
      heyaId: "player-heya",
      injured: true,
      injuryStatus: {
        type: "contusion",
        isInjured: true,
        severity: "minor",
        location: "rib",
        weeksRemaining: 1,
      },
    });
    const opp = MockFactory.createRikishi("r-opp", { heyaId: "npc-heya" });
    const world = worldWithTodayCard([hurt, opp], 4, "player-heya");
    world.heyas.set(
      "player-heya",
      MockFactory.createHeya("player-heya", { rikishiIds: ["r-minor"] })
    );

    const world2 = resolveImpacts(world, [resolveMorningOfDay(world)]);
    expect(
      (world2.pendingDecisions ?? []).filter((d) => d.type === "kyujo_decision")
    ).toHaveLength(0);
  });
});

describe("advanceBashoDay — morning evaluation on the new day", () => {
  it("schedules the next day then withdraws NPC serious injuries on it", () => {
    const hurt = MockFactory.createRikishi("r-serious", {
      heyaId: "npc-heya",
      division: "makuuchi",
      injured: true,
      injuryStatus: {
        type: "tear",
        isInjured: true,
        severity: "serious",
        location: "knee",
        weeksRemaining: 8,
      },
    });
    // Enough healthy rikishi to form the day's card.
    const fillers = Array.from({ length: 9 }, (_, i) =>
      MockFactory.createRikishi(`r-f${i}`, { heyaId: `heya-${i}`, division: "makuuchi" })
    );
    const world = MockFactory.createWorld({
      cyclePhase: "active_basho",
      currentBasho: MockFactory.createBasho({ day: 3, matches: [] }),
      rikishi: new Map([[hurt.id, hurt], ...fillers.map((r) => [r.id, r] as const)]),
    });

    const world2 = advanceBashoDay(world);

    expect(world2.currentBasho?.day).toBe(4);
    // The injured rikishi was scheduled (day 4 card exists) and then the
    // morning evaluation withdrew him — a fusensho for day 4, not silence.
    expect(world2.rikishi.get("r-serious")?.isKyujo).toBe(true);
  });
});
