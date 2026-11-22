/**
 * Spec (RED) — merger realism.
 *
 * Real behavior (merger/closure datasets):
 *  - Ichimon coordination comes FIRST: a closing stable's wrestlers are
 *    placed within the clan when a viable same-ichimon heya exists;
 *    prestige/funds break ties inside the clan, not across clans.
 *    (`findMergerTarget` currently ignores ichimon entirely.)
 *  - Mass transfer triggers retirement: older lower-division rikishi
 *    absorbed in a merger often retire rather than relocate.
 *    (`transferRosterAcrossMerger` transfers everyone.)
 *  - JSA-mandated absorptions may hold TWO+ foreign-slot rikishi
 *    (Miyagino→Isegahama: Toshinofuji + Asahifuji). The count must be
 *    tracked (`heya.grandfatheredForeignCount`) so the exception can't
 *    stack indefinitely. (Transfer waives the cap but stamps nothing.)
 */
import { describe, it, expect } from "vitest";
import { executeMerger, findMergerTarget } from "@/engine/economy/mergers";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import type { Heya } from "@/engine/types/heya";

const withIchimon = (heya: Heya, ichimon: string): Heya =>
  ({ ...heya, ichimon }) as Heya;

describe("findMergerTarget — ichimon coordination", () => {
  it("prefers a viable same-ichimon heya over a richer out-of-clan one", () => {
    const world = makeMockWorld({ year: 2026 });
    const source = withIchimon(makeMockHeya("heya-src", { funds: 100 }), "Dewanoumi");
    const inClan = withIchimon(
      makeMockHeya("heya-clan", { prestige: 40, funds: 8_000_000, prestigeBand: "modest" }),
      "Dewanoumi"
    );
    const outClan = withIchimon(
      makeMockHeya("heya-out", { prestige: 95, funds: 50_000_000, prestigeBand: "elite" }),
      "Isegahama"
    );
    world.heyas.set("heya-src", source);
    world.heyas.set("heya-clan", inClan);
    world.heyas.set("heya-out", outClan);

    expect(findMergerTarget(world, "heya-src")).toBe("heya-clan");
  });
});

describe("transferRosterAcrossMerger — attrition", () => {
  it("older lower-division transferees retire instead of relocating", () => {
    const world = makeMockWorld({ year: 2026 });
    const source = makeMockHeya("heya-src", { rikishiIds: ["old", "young"] });
    const target = makeMockHeya("heya-tgt", { rikishiIds: [] });
    world.heyas.set("heya-src", source);
    world.heyas.set("heya-tgt", target);
    world.rikishi.set(
      "old",
      mockRikishi("old", { heyaId: "heya-src", birthYear: 1990, division: "sandanme" })
    );
    world.rikishi.set(
      "young",
      mockRikishi("young", { heyaId: "heya-src", birthYear: 2004, division: "sandanme" })
    );

    const next = resolveImpacts(world, [
      executeMerger(world, "heya-src", "heya-tgt", "insolvency"),
    ]);
    // The 36-year-old sandanme retires (moved to historical); the
    // 22-year-old transfers.
    const old = next.rikishi.get("old") ?? next.historicalRikishi?.get("old");
    expect(old?.isRetired).toBe(true);
    expect(next.rikishi.get("young")?.heyaId).toBe("heya-tgt");
  });
});

describe("mandated absorption — foreign-slot exception tracking", () => {
  it("a mandated transfer stamps grandfatheredForeignCount on the receiving heya", () => {
    const world = makeMockWorld({ year: 2026 });
    const source = makeMockHeya("heya-src", { rikishiIds: ["f2"] });
    const target = makeMockHeya("heya-tgt", { rikishiIds: ["f1"] });
    world.heyas.set("heya-src", source);
    world.heyas.set("heya-tgt", target);
    world.rikishi.set(
      "f1",
      mockRikishi("f1", { heyaId: "heya-tgt", nationality: "Mongolia", citizenshipStatus: "foreign" })
    );
    world.rikishi.set(
      "f2",
      mockRikishi("f2", { heyaId: "heya-src", nationality: "Mongolia", citizenshipStatus: "foreign" })
    );

    const next = resolveImpacts(world, [
      executeMerger(world, "heya-src", "heya-tgt", "mandated"),
    ]);
    const g = (next.heyas.get("heya-tgt") as { grandfatheredForeignCount?: number })
      ?.grandfatheredForeignCount;
    expect(g).toBe(1);
  });
});
