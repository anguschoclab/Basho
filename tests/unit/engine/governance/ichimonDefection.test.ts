/**
 * Spec (RED) — WS-7 optional: ichimon defection/migration.
 *
 * Real JSA convention: a heya's clan membership follows the lineage of the
 * elder stock its master holds — a succession that seats an oyakata whose
 * share belongs to another clan CAN realign the stable (the Takanohana-era
 * realignments are the model). Voluntary defection is possible but
 * politically expensive (capital + reputation cost).
 */
import { describe, it, expect } from "vitest";
import { changeHeyaIchimon } from "@/engine/governance/ichimon";
import { triggerSuccession } from "@/engine/legacy/DynastyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { rngForWorld } from "@/engine/core/rng";
import { ICHIMON_MIGRATION_CHANCE } from "@/constants/engine/governance";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

function baseWorld(): WorldState {
  const world = MockFactory.createWorld();
  world.heyas.clear();
  world.rikishi.clear();
  world.activeRikishiIds = new Set();
  return world;
}

describe("changeHeyaIchimon — voluntary defection", () => {
  it("moves the heya to the target clan at a political cost", () => {
    const world = baseWorld();
    world.heyas.set(
      "h1",
      MockFactory.createHeya("h1", {
        ichimon: "Dewanoumi",
        politicalCapital: 60,
        reputation: 50,
      })
    );
    const next = resolveImpacts(world, [
      changeHeyaIchimon(world, "h1", "Isegahama"),
    ]);
    const h = next.heyas.get("h1")!;
    expect(h.ichimon).toBe("Isegahama");
    expect(h.politicalCapital!).toBeLessThan(60);
    expect(h.reputation!).toBeLessThan(50);
  });

  it("is a no-op when targeting the current clan", () => {
    const world = baseWorld();
    world.heyas.set("h1", MockFactory.createHeya("h1", { ichimon: "Dewanoumi" }));
    const impact = changeHeyaIchimon(world, "h1", "Dewanoumi");
    expect(impact.updatedHeyas?.size ?? 0).toBe(0);
  });
});

describe("ichimon migration on succession", () => {
  function successionWorld(seed: string): WorldState {
    const world = baseWorld();
    world.seed = seed;
    world.heyas.set(
      "h1",
      MockFactory.createHeya("h1", { ichimon: "Dewanoumi", oyakataId: "o1" })
    );
    world.oyakata = new Map([
      ["o1", MockFactory.createOyakata("o1", { heyaId: "h1", age: 66 })],
    ]);
    const heir = MockFactory.createRikishi("r-heir", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "maegashira",
      birthYear: (world.year ?? 2026) - 30,
    });
    world.rikishi.set("r-heir", heir);
    world.activeRikishiIds.add("r-heir");
    // The chair's elder stock carries a DIFFERENT clan lineage — the model
    // for realignment.
    world.myosekiMarket = {
      stocks: {
        "ms-1": {
          id: "ms-1",
          name: "TestShare",
          prestigeTier: "respected",
          ownerId: "o1",
          holderId: "o1",
          status: "held",
          ichimon: "Takasago",
        },
      },
      history: [],
    };
    return world;
  }

  it("realigns the heya to the inherited share's clan when the migration roll passes", () => {
    let passingSeed: string | null = null;
    for (let i = 0; i < 100; i++) {
      const w = successionWorld(`migration-${i}`);
      if (rngForWorld(w, "governance", "ichimon_migration_h1").bool(ICHIMON_MIGRATION_CHANCE)) {
        passingSeed = `migration-${i}`;
        break;
      }
    }
    expect(passingSeed).not.toBeNull();
    const world = successionWorld(passingSeed!);
    const next = resolveImpacts(world, [triggerSuccession(world, "h1", "r-heir")]);
    expect(next.heyas.get("h1")!.ichimon).toBe("Takasago");
  });

  it("keeps the current clan when the migration roll fails", () => {
    let failingSeed: string | null = null;
    for (let i = 0; i < 100; i++) {
      const w = successionWorld(`no-migration-${i}`);
      if (!rngForWorld(w, "governance", "ichimon_migration_h1").bool(ICHIMON_MIGRATION_CHANCE)) {
        failingSeed = `no-migration-${i}`;
        break;
      }
    }
    expect(failingSeed).not.toBeNull();
    const world = successionWorld(failingSeed!);
    const next = resolveImpacts(world, [triggerSuccession(world, "h1", "r-heir")]);
    expect(next.heyas.get("h1")!.ichimon).toBe("Dewanoumi");
  });

  it("never migrates when the share's clan matches the heya's", () => {
    const world = successionWorld("same-clan");
    world.myosekiMarket!.stocks["ms-1"].ichimon = "Dewanoumi";
    const next = resolveImpacts(world, [triggerSuccession(world, "h1", "r-heir")]);
    expect(next.heyas.get("h1")!.ichimon).toBe("Dewanoumi");
  });
});
