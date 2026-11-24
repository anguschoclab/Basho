/**
 * Spec (RED) — tsukedashi debuts at the NEXT basho, never mid-card.
 *
 * WS-10 residual — TD slot insertion. A qualified amateur (MsTD/SdTD)
 * signs between basho and is PRINTED at his credential rank on the next
 * banzuke — he does not join a running basho's card partway through.
 * Today the materialized rikishi carries no debut gate: division +
 * maezumoCompleted land him in `activeDivisionRoster` immediately, so a
 * mid-basho signing fights the tail of the current tournament with a
 * partial record.
 *
 * Model: the `isMaezumo && maezumoCompleted` flag pair marks a
 * credential holder awaiting debut — excluded from the active roster,
 * excluded from maezumo prelims (credential already held), graduated at
 * publish into his TD slot rather than the jonokuchi floor.
 */
import { describe, it, expect } from "vitest";
import { materializeCandidateToRikishiInternal } from "@/engine/generation/TalentPoolMaterialization";
import {
  graduateMaezumoRikishi,
  isPendingShinDeshi,
  pendingTsukedashiDebutants,
} from "@/engine/basho/maezumoPrelims";
import { buildStartBashoImpact } from "@/engine/lifecycle/BashoManager";
import { activeDivisionRoster } from "@/engine/calendar/scheduleHelpers";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { mockRikishi, makeMockWorld, makeMockBasho } from "@tests/unit/engine/utils";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import type { TalentCandidate } from "@/engine/types/talent";
import type { WorldState } from "@/engine/types/world";

function worldWithRikishi(list: Rikishi[]): WorldState {
  const world = makeMockWorld({ seed: "td-debut" });
  for (const r of list) {
    world.rikishi.set(r.id, r);
    world.activeRikishiIds.add(r.id);
  }
  return world;
}

function tdCandidate(id: string, tier: "makushita" | "sandanme"): TalentCandidate {
  return MockFactory.createCandidate(id as Id, {
    candidateId: id as Id,
    tsukedashi: tier,
    availabilityState: "available",
  });
}

function pendingTdRikishi(id: string): Rikishi {
  // The post-fix materialized shape: credential holder awaiting debut.
  return mockRikishi(id, {
    division: "makushita",
    rank: "makushita",
    rankNumber: 60,
    heyaId: "h1",
    isMaezumo: true,
    maezumoCompleted: true,
  } as Partial<Rikishi>);
}

describe("tsukedashi debut gate", () => {
  it("a TD signee materializes as a credential holder awaiting debut (isMaezumo + maezumoCompleted)", () => {
    const world = makeMockWorld({ seed: "td-debut" });
    const heya = MockFactory.createHeya("h1" as Id, { rikishiIds: [] });
    world.heyas.set("h1" as Id, heya);
    const candidate = tdCandidate("cand-td", "makushita");
    const pools = MockFactory.createTalentPool({ candidates: { "cand-td": candidate } }).pools;

    const res = materializeCandidateToRikishiInternal(
      world,
      "cand-td" as Id,
      "h1" as Id,
      { "cand-td": candidate },
      pools
    );
    expect(res.newRikishiId).toBe(candidate.personId);

    // The minted rikishi is carried in the impact's collections add-list.
    const minted = res.impact.collections?.rikishiToAdd?.find((r) => r.id === candidate.personId);
    expect(minted).toBeDefined();
    expect(minted?.isMaezumo).toBe(true);
    expect(minted?.maezumoCompleted).toBe(true);
    expect(minted?.division).toBe("makushita");
    expect(minted?.rankNumber).toBe(60);
  });

  it("a pending TD debutant is held off the running card — not in activeDivisionRoster", () => {
    const world = worldWithRikishi([pendingTdRikishi("td-1"), mockRikishi("ms-1", { division: "makushita", rank: "makushita" })]);
    const roster = activeDivisionRoster(world, "makushita").map((r) => r.id);
    expect(roster).not.toContain("td-1");
    expect(roster).toContain("ms-1");
  });

  it("a pending TD debutant is never enrolled in maezumo prelims (credential already held)", () => {
    expect(isPendingShinDeshi(pendingTdRikishi("td-1"))).toBe(false);
  });

  it("publishes the awaiting TD debutant at his credential slot — Ms60 makushita, flag cleared", () => {
    const td = pendingTdRikishi("td-1");
    const world = worldWithRikishi([td]);
    const basho = makeMockBasho({}); // no maezumo state — TD alone must still graduate
    const builder = createImpactBuilder("publish");
    const entries = graduateMaezumoRikishi(world, basho, [], builder);
    const entry = entries.find((e) => e.rikishiId === "td-1");
    expect(entry).toBeDefined();
    expect(entry?.division).toBe("makushita");
    expect(entry?.position.rankNumber).toBe(60);
    const patch = builder.build().entities?.rikishiUpdates?.get("td-1") ?? {};
    expect(patch.isMaezumo).toBe(false);
  });

  it("lifts the debut gate at basho start — the TD debutant joins the new card", () => {
    const td = pendingTdRikishi("td-1");
    const world = worldWithRikishi([td]);
    world.cyclePhase = "interim";
    expect(pendingTsukedashiDebutants(world).map((r) => r.id)).toEqual(["td-1"]);

    const impact = buildStartBashoImpact(world, "hatsu");
    const patch = impact.entities?.rikishiUpdates?.get("td-1") ?? {};
    expect(patch.isMaezumo).toBe(false);
  });
});
