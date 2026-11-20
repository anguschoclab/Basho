/**
 * Sanyo advisory extension (deferred registry): a stockholding elder retiring
 * at the mandatory 65 stays in the JSA registry as a sanyo (consultant) until
 * 70 — emeritus status, not removal. jun-toshiyori appointees are exempt
 * (their own expiry rules apply). At the sanyo term's end the elder finally
 * retires (retirementYear set).
 */
import { describe, it, expect } from "vitest";
import { DynastyService } from "@/engine/legacy/DynastyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { mockRikishi } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function worldWithAgedHeya(opts: { age: number; elderStatus?: Oyakata["elderStatus"] }): {
  world: WorldState;
  oya: Oyakata;
} {
  const world = MockFactory.createWorld({ week: 10, year: 5 });
  const oya = {
    id: "o-h1",
    heyaId: "h1",
    archetype: "traditionalist",
    traits: { ...TRAITS },
    age: opts.age,
    yearsInCharge: 30,
    shikona: "OldOya",
    name: "OldOya",
    elderStatus: opts.elderStatus,
    tenure: {
      startedYear: 0,
      bashoServed: 60,
      championships: 2,
      sekitoriProduced: 4,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
    },
  } as unknown as Oyakata;
  world.oyakata.set(oya.id, oya);
  world.heyas.set("h1", MockFactory.createHeya("h1", { oyakataId: oya.id }));
  // An eligible sekitori successor on the roster.
  const heir = mockRikishi("heir-1", { division: "makuuchi", rank: "komusubi", heyaId: "h1" });
  world.rikishi.set(heir.id, heir);
  world.activeRikishiIds = new Set([heir.id]);
  return { world, oya };
}

describe("sanyo advisory extension to 70", () => {
  it("65-year-old stockholder succeeds AND stays as emeritus sanyo until 70", () => {
    const { world, oya } = worldWithAgedHeya({ age: 65 });
    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);
    expect(next.heyas.get("h1")!.oyakataId).not.toBe(oya.id);
    const retained = next.oyakata.get(oya.id);
    expect(retained).toBeTruthy();
    expect(retained!.elderStatus).toBe("sanyo");
    expect(retained!.isEmeritus).toBe(true);
    expect(retained!.sanyoExpiryYear).toBe(world.year + (70 - 65));
  });

  it("jun-toshiyori elder is removed, not retained as sanyo", () => {
    const { world, oya } = worldWithAgedHeya({ age: 65, elderStatus: "jun_toshiyori" });
    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);
    expect(next.oyakata.get(oya.id)).toBeUndefined();
  });

  it("younger oyakata stepping down is removed (sanyo is post-65 only)", () => {
    const { world, oya } = worldWithAgedHeya({ age: 64 });
    // Forced path needs a trigger — give insolvency events.
    oya.tenure = { ...oya.tenure!, insolvencyEvents: 5 } as Oyakata["tenure"];
    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);
    expect(next.oyakata.get(oya.id)).toBeUndefined();
  });

  it("emeritus sanyo at expiry year finally retires", () => {
    const { world, oya } = worldWithAgedHeya({ age: 70 });
    // Pre-seed him as an unattached emeritus consultant whose term ends now.
    world.heyas.delete("h1");
    oya.elderStatus = "sanyo";
    oya.isEmeritus = true;
    oya.sanyoExpiryYear = world.year;
    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);
    expect(next.oyakata.get(oya.id)?.retirementYear).toBe(world.year);
  });

  it("emeritus sanyo before expiry stays unretired", () => {
    const { world, oya } = worldWithAgedHeya({ age: 68 });
    world.heyas.delete("h1");
    oya.elderStatus = "sanyo";
    oya.isEmeritus = true;
    oya.sanyoExpiryYear = world.year + 2;
    const next = resolveImpacts(world, [DynastyService.tickSuccessionCheck(world)]);
    expect(next.oyakata.get(oya.id)?.retirementYear ?? 0).not.toBe(world.year);
  });
});
