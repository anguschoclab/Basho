/**
 * WS4 — Rikishi-level agency: request generation via the weekly phase.
 *
 * `phase01_week_rikishi_agency` runs in BOTH weekly pipelines (the welfare
 * phase is off-season only, so it cannot own basho-time agency). It derives
 * dispositions for every rikishi, generates threshold-crossed requests into
 * `world.pendingRikishiRequests`, and never mutates outside ImpactBuilder.
 */

import { describe, it, expect } from "vitest";
import { phase01_week_rikishi_agency } from "@/engine/tick/phases";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { readSrcFile } from "@/tests/helpers/fsScan";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function worldWith(rikishi: Rikishi[], heyaId = "h-npc"): WorldState {
  const world = MockFactory.createWorld({ cyclePhase: "interim", week: 10 });
  const map = new Map<string, Rikishi>();
  for (const r of rikishi) map.set(r.id, r);
  world.rikishi = map;
  world.heyas.set(
    heyaId,
    MockFactory.createHeya(heyaId, { rikishiIds: rikishi.map((r) => r.id) })
  );
  return world;
}

describe("phase01_week_rikishi_agency — registration", () => {
  it("runs in both weekly pipelines before phase01_week_npc_ai", () => {
    for (const file of [
      "engine/tick/pipelines/bashoPipeline.ts",
      "engine/tick/pipelines/offSeasonPipeline.ts",
    ]) {
      const src = readSrcFile(file);
      const agencyIdx = src.indexOf("phase01_week_rikishi_agency");
      const npcIdx = src.indexOf("phase01_week_npc_ai");
      expect(agencyIdx).toBeGreaterThan(-1);
      expect(npcIdx).toBeGreaterThan(-1);
      expect(agencyIdx).toBeLessThan(npcIdx);
    }
  });
});

describe("request generation", () => {
  it("exhausted rikishi requests rest", () => {
    const r = MockFactory.createRikishi({
      id: "r-tired",
      heyaId: "h-npc",
      fatigue: 85,
      behavior: { discipline: 50, mediaSavvy: 50, stress: 60 },
    } as Partial<Rikishi>);
    const next = resolveImpacts(worldWith([r]), [
      phase01_week_rikishi_agency(worldWith([r])),
    ]);
    const reqs = (next.pendingRikishiRequests ?? []).filter(
      (q) => q.rikishiId === "r-tired"
    );
    expect(reqs.some((q) => q.type === "request_rest")).toBe(true);
  });

  it("does not duplicate a pending request of the same type", () => {
    const r = MockFactory.createRikishi({
      id: "r-tired",
      heyaId: "h-npc",
      fatigue: 85,
      behavior: { discipline: 50, mediaSavvy: 50, stress: 60 },
    } as Partial<Rikishi>);
    const world = worldWith([r]);
    world.pendingRikishiRequests = [
      {
        id: "req-1",
        rikishiId: "r-tired",
        heyaId: "h-npc",
        type: "request_rest",
        createdWeek: 9,
        reason: "fatigue",
      },
    ];
    const next = resolveImpacts(world, [phase01_week_rikishi_agency(world)]);
    const rest = (next.pendingRikishiRequests ?? []).filter(
      (q) => q.rikishiId === "r-tired" && q.type === "request_rest"
    );
    expect(rest).toHaveLength(1);
  });

  it("respects the request cooldown after a recent request", () => {
    const r = MockFactory.createRikishi({
      id: "r-cd",
      heyaId: "h-npc",
      fatigue: 85,
      behavior: { discipline: 50, mediaSavvy: 50, stress: 60 },
      agency: {
        satisfaction: 30,
        restlessness: 60,
        loyaltyBand: "wavering",
        deniedCount: 0,
        grantedCount: 0,
        lastRequestWeek: 10,
      },
    } as Partial<Rikishi>);
    const world = worldWith([r]);
    const next = resolveImpacts(world, [phase01_week_rikishi_agency(world)]);
    expect(next.pendingRikishiRequests ?? []).toHaveLength(0);
  });

  it("healthy content rikishi generate no requests", () => {
    const r = MockFactory.createRikishi({
      id: "r-ok",
      heyaId: "h-npc",
      fatigue: 10,
      motivation: 60,
      behavior: { discipline: 70, mediaSavvy: 50, stress: 10 },
    } as Partial<Rikishi>);
    const world = worldWith([r]);
    const next = resolveImpacts(world, [phase01_week_rikishi_agency(world)]);
    expect(next.pendingRikishiRequests ?? []).toHaveLength(0);
  });

  it("writes disposition state onto each rikishi", () => {
    const r = MockFactory.createRikishi({ id: "r1", heyaId: "h-npc" });
    const world = worldWith([r]);
    const next = resolveImpacts(world, [phase01_week_rikishi_agency(world)]);
    const agency = next.rikishi.get("r1")!.agency;
    expect(agency).toBeDefined();
    expect(["loyal", "wavering", "restless", "discontent"]).toContain(
      agency!.loyaltyBand
    );
  });
});
