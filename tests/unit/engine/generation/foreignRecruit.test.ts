/**
 * Spec (RED) — foreign recruitment realism at genesis.
 *
 * Real September-2026 world: ~69% of active heyas carry exactly one
 * foreign-born slot-consumer; ~74% of foreigners are Mongolian;
 * debut ages skew 18–22; sekitori concentration far exceeds
 * lower-division (selection bias). Genesis currently seeds a flat
 * FOREIGN_RECRUIT_CHANCE with no per-heya occupancy target.
 */
import { describe, it, expect } from "vitest";
import { createRosters } from "@/engine/generation/RosterFactory";
import { SeededRNG } from "@/engine/core/rng";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";

const HEYA_COUNT = 45;

function genesis() {
  const heyaMap = new Map<string, Heya>();
  const oyakataMap = new Map<string, Oyakata>();
  for (let i = 0; i < HEYA_COUNT; i++) {
    heyaMap.set(`h${i}`, MockFactory.createHeya(`h${i}`, {}));
    oyakataMap.set(`o${i}`, MockFactory.createOyakata(`o${i}`, { heyaId: `h${i}` }));
  }
  const rikishi = createRosters(new SeededRNG("genesis-spec"), heyaMap, oyakataMap);
  return { rikishi };
}

const isForeign = (r: Rikishi) =>
  r.citizenshipStatus === "foreign" ||
  (r.nationality !== "Japan" && r.nationality !== "JP" && r.nationality !== "Japanese");

// Slot-consumer semantics (JSA): dual citizens do NOT consume the
// one-foreigner slot even though they are foreign-born.
const consumesSlot = (r: Rikishi) => isForeign(r) && r.citizenshipStatus !== "dual";

describe("genesis foreign occupancy", () => {
  it("~69% of heyas carry a foreign-slot consumer", () => {
    const { rikishi } = genesis();
    const foreignHeyas = new Set<string>();
    for (const r of rikishi.values()) {
      if (isForeign(r)) foreignHeyas.add(r.heyaId);
    }
    const occupancy = foreignHeyas.size / HEYA_COUNT;
    expect(occupancy).toBeGreaterThanOrEqual(0.6);
    expect(occupancy).toBeLessThanOrEqual(0.78);
  });

  it("no heya holds more than one foreign-slot rikishi at genesis", () => {
    const { rikishi } = genesis();
    const perHeya = new Map<string, number>();
    for (const r of rikishi.values()) {
      if (!consumesSlot(r)) continue;
      perHeya.set(r.heyaId, (perHeya.get(r.heyaId) ?? 0) + 1);
    }
    for (const [, count] of perHeya) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it("the origin mix is Mongolia-dominant (~74%)", () => {
    const { rikishi } = genesis();
    let foreign = 0;
    let mongolian = 0;
    for (const r of rikishi.values()) {
      if (!isForeign(r)) continue;
      foreign++;
      if (r.nationality === "Mongolia") mongolian++;
    }
    expect(foreign).toBeGreaterThan(0);
    expect(mongolian / foreign).toBeGreaterThanOrEqual(0.55);
  });
});
