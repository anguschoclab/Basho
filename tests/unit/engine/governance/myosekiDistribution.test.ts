/**
 * Spec — 105-kabu clan distribution at genesis (JSA 2026).
 *
 * The real kabu pool is clan-shaped: ~35/29/16/11/11 of the 105 shares sit
 * in Dewanoumi/Nishonoseki/Tokitsukaze/Takasago/Isegahama hands. Held shares
 * split ~45 stablemaster kabu + ~39 sekitori reserve shares (a top-division
 * rikishi holds the stock earmarked for his own elder life); ~21 stay in
 * the JSA pool on the market.
 */
import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { MYOSEKI_TOTAL_COUNT } from "@/constants/engine/economic";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import type { WorldState } from "@/engine/types/world";
import type { IchimonName } from "@/engine/types/economy";

const SEED = "kabu-dist-seed";

function clanOf(world: WorldState, entityId: string): IchimonName | undefined {
  const oyakata = world.oyakata.get(entityId);
  const rikishi = world.rikishi.get(entityId);
  const heyaId = oyakata?.heyaId ?? rikishi?.heyaId;
  return heyaId ? world.heyas.get(heyaId)?.ichimon : undefined;
}

describe("genesis kabu distribution", () => {
  const world = generateInitialWorld(SEED);
  const stocks = Object.values(world.myosekiMarket?.stocks ?? {});

  it(`mints exactly ${MYOSEKI_TOTAL_COUNT} shares`, () => {
    expect(stocks.length).toBe(MYOSEKI_TOTAL_COUNT);
  });

  it("held shares track the real clan distribution (≈29/24/13/9/9 of ~85)", () => {
    const heldByClan = new Map<string, number>();
    for (const s of stocks) {
      if (s.status === "available") continue;
      const clan = s.ichimon ?? clanOf(world, s.holderId) ?? "?";
      heldByClan.set(clan, (heldByClan.get(clan) ?? 0) + 1);
    }
    expect(heldByClan.get("Dewanoumi")).toBeGreaterThanOrEqual(27);
    expect(heldByClan.get("Dewanoumi")).toBeLessThanOrEqual(31);
    expect(heldByClan.get("Nishonoseki")).toBeGreaterThanOrEqual(22);
    expect(heldByClan.get("Nishonoseki")).toBeLessThanOrEqual(26);
    // T/I are sekitori-supply-limited at genesis (~5/~4 available) — their
    // shortfall lands in the JSA pool, matching the real unattributed shares.
    expect(heldByClan.get("Tokitsukaze")).toBeGreaterThanOrEqual(9);
    expect(heldByClan.get("Tokitsukaze")).toBeLessThanOrEqual(13);
    expect(heldByClan.get("Isegahama")).toBeGreaterThanOrEqual(7);
    expect(heldByClan.get("Isegahama")).toBeLessThanOrEqual(11);
    expect(heldByClan.get("Takasago")).toBeGreaterThanOrEqual(7);
    expect(heldByClan.get("Takasago")).toBeLessThanOrEqual(11);
  });

  it("every stablemaster holds a share of his own clan", () => {
    for (const heya of world.heyas.values()) {
      const held = stocks.filter((s) => s.holderId === heya.oyakataId);
      expect(held.length).toBeGreaterThanOrEqual(1);
      for (const s of held) {
        expect(s.status).toBe("held");
        expect(s.ichimon).toBe(heya.ichimon);
      }
    }
  });

  it("seats reserve shares on active sekitori of the stock's clan", () => {
    const reserves = stocks.filter((s) => {
      const r = world.rikishi.get(s.holderId);
      return r && !r.isRetired;
    });
    expect(reserves.length).toBeGreaterThanOrEqual(30);
    expect(reserves.length).toBeLessThanOrEqual(50);
    for (const s of reserves) {
      const r = world.rikishi.get(s.holderId)!;
      expect(isSekitoriDivision(r.division)).toBe(true);
      expect(s.ownerId).toBe(r.id);
      expect(s.status).toBe("held");
      expect(s.ichimon).toBe(world.heyas.get(r.heyaId)?.ichimon);
    }
  });

  it("keeps a real-scale JSA pool on the market", () => {
    const available = stocks.filter((s) => s.status === "available");
    expect(available.length).toBeGreaterThanOrEqual(15);
    expect(available.length).toBeLessThanOrEqual(25);
    for (const s of available) {
      expect(s.ownerId).toBe("JSA");
    }
  });

  it("is deterministic per seed", () => {
    const again = generateInitialWorld(SEED);
    expect(again.myosekiMarket?.stocks).toEqual(world.myosekiMarket?.stocks);
  });
});
