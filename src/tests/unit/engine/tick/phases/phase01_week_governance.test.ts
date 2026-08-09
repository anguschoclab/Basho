import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { phase01_week_governance } from "@/engine/tick/phases/phase01_week_governance";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { StateImpact } from "@/engine/core/StateImpact";
import {
  ELECTION_WEEK,
  SCANDAL_SCORE_ALERT_THRESHOLD,
  SCANDAL_SCORE_HIGH_THRESHOLD,
  SCANDAL_SCORE_LOW_THRESHOLD,
} from "@/constants/engine/governanceExtended";
import {
  ELECTION_POLITICAL_CAPITAL_GAIN,
} from "@/constants/engine/governance";

function extractEvents(impact: StateImpact): any[] {
  let events = (impact as any).events || [];
  if (!events.length && (impact as any).impacts) {
      events = (impact as any).impacts.flatMap((i: any) => i.events || []);
  }
  return events;
}

describe("phase01_week_governance", () => {
  it("decays scandal score by 1 each week for all heyas", () => {
    const heya1 = MockFactory.createHeya("h1", { scandalScore: 5 });
    const heya2 = MockFactory.createHeya("h2", { scandalScore: 0 });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya1], ["h2", heya2]]),
    });

    const impact = phase01_week_governance(world);
    const resolvedWorld = resolveImpacts(world, [impact]);

    expect(resolvedWorld.heyas.get("h1")?.scandalScore).toBe(4);
    expect(resolvedWorld.heyas.get("h2")?.scandalScore).toBe(0);
  });

  it("changes governance status based on thresholds and logs events", () => {
    const heya = MockFactory.createHeya("h1", {
      scandalScore: SCANDAL_SCORE_HIGH_THRESHOLD + 1,
      governanceStatus: "good_standing"
    });

    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
    });

    const impact = phase01_week_governance(world);
    const resolvedWorld = resolveImpacts(world, [impact]);

    const updatedHeya = resolvedWorld.heyas.get("h1");
    expect(updatedHeya?.governanceStatus).toBe("sanctioned");

    const events = extractEvents(impact);
    const event = events.find((e: any) => e.type === "GOVERNANCE_RULING" && e.data.incident === "status_changed");
    expect(event).toBeDefined();
    expect(event?.data.status).toBe("sanctioned");
  });

  it("emits an alert event if the player's heya crosses the alert threshold", () => {
    const startingScore = SCANDAL_SCORE_ALERT_THRESHOLD + 5;

    const playerHeya = MockFactory.createHeya("player", { scandalScore: startingScore });
    const npcHeya = MockFactory.createHeya("npc", { scandalScore: startingScore });

    const world = MockFactory.createWorld({
      heyas: new Map([["player", playerHeya], ["npc", npcHeya]]),
      playerHeyaId: "player"
    });

    const impact = phase01_week_governance(world);

    const events = extractEvents(impact);

    const alerts = events.filter((e: any) => e.type === "GOVERNANCE_RULING" && e.data.incident === "governance_warning");

    const playerAlert = alerts.find((e: any) => e.heyaId === "player" || e.entityIds?.heyaId === "player");
    expect(playerAlert).toBeDefined();

    const npcAlert = alerts.find((e: any) => e.heyaId === "npc" || e.entityIds?.heyaId === "npc");
    expect(npcAlert).toBeUndefined();
  });

  it("processes bi-annual JSA board elections for heyas in an ichimon", () => {
    const heyaInIchimon = MockFactory.createHeya("h1", {
      ichimon: "Dewanoumi",
      politicalCapital: 10
    });
    const heyaNoIchimon = MockFactory.createHeya("h2", {
      ichimon: undefined,
      politicalCapital: 10
    });

    const world = MockFactory.createWorld({
      year: 2020,
      week: ELECTION_WEEK,
      heyas: new Map([["h1", heyaInIchimon], ["h2", heyaNoIchimon]]),
    });

    const impact = phase01_week_governance(world);
    const resolvedWorld = resolveImpacts(world, [impact]);

    expect(resolvedWorld.heyas.get("h1")?.politicalCapital).toBe(10 + ELECTION_POLITICAL_CAPITAL_GAIN);
    expect(resolvedWorld.heyas.get("h2")?.politicalCapital).toBe(10);

    const events = extractEvents(impact);
    const electionEvent = events.find((e: any) => e.type === "BASHO_STATUS" && e.data.status === "phase_transition");
    expect(electionEvent).toBeDefined();
    expect(electionEvent?.data.incident).toContain("Dewanoumi");
  });

  it("uses post-decay score for status: score 16 decays to 15 → 'warning'", () => {
    const heya = MockFactory.createHeya("h1", {
      scandalScore: SCANDAL_SCORE_LOW_THRESHOLD + 1,
      governanceStatus: "good_standing",
    });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
    });

    const impact = phase01_week_governance(world);
    const resolvedWorld = resolveImpacts(world, [impact]);

    expect(resolvedWorld.heyas.get("h1")?.scandalScore).toBe(SCANDAL_SCORE_LOW_THRESHOLD);
    expect(resolvedWorld.heyas.get("h1")?.governanceStatus).toBe("warning");
  });

  it("uses post-decay score for status: score 15 decays to 14 → 'good_standing'", () => {
    const heya = MockFactory.createHeya("h1", {
      scandalScore: SCANDAL_SCORE_LOW_THRESHOLD,
      governanceStatus: "warning",
    });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
    });

    const impact = phase01_week_governance(world);
    const resolvedWorld = resolveImpacts(world, [impact]);

    expect(resolvedWorld.heyas.get("h1")?.scandalScore).toBe(SCANDAL_SCORE_LOW_THRESHOLD - 1);
    expect(resolvedWorld.heyas.get("h1")?.governanceStatus).toBe("good_standing");
  });

  it("alert uses post-decay score: score 31 decays to 30 → alert fires", () => {
    const playerHeya = MockFactory.createHeya("player", {
      scandalScore: SCANDAL_SCORE_ALERT_THRESHOLD + 1,
    });
    const world = MockFactory.createWorld({
      heyas: new Map([["player", playerHeya]]),
      playerHeyaId: "player",
    });

    const impact = phase01_week_governance(world);
    const events = extractEvents(impact);

    const alerts = events.filter(
      (e: any) => e.type === "GOVERNANCE_RULING" && e.data.incident === "governance_warning",
    );
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]?.data.score).toBe(SCANDAL_SCORE_ALERT_THRESHOLD);
  });

  it("alert does NOT fire when post-decay score is below threshold", () => {
    const playerHeya = MockFactory.createHeya("player", {
      scandalScore: SCANDAL_SCORE_ALERT_THRESHOLD,
    });
    const world = MockFactory.createWorld({
      heyas: new Map([["player", playerHeya]]),
      playerHeyaId: "player",
    });

    const impact = phase01_week_governance(world);
    const events = extractEvents(impact);

    const alerts = events.filter(
      (e: any) => e.type === "GOVERNANCE_RULING" && e.data.incident === "governance_warning",
    );
    expect(alerts.length).toBe(0);
  });
});
