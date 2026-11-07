/**
 * T2.1 — player-visible event census. Ratchets the current volume of
 * distinct event chains so content depth can't silently regress while
 * the content push toward competitor parity (~150 events) proceeds.
 * Measured 2026-11: 15 top-level chains (191 ids incl. stages).
 * Phase B push 1: 8 new families (sponsor_ultimatum, recruit_race,
 * rehab_crossroads, koenkai_gala, tabloid_leak, young_star_ego,
 * dojo_expansion, myoseki_auction) → 23 chains, ~280 stage/option ids.
 * Phase B push 2: 8 more (danpatsu_shiki, fire_safety_order, ichimon_vote,
 * jungyo_invitation, rikishi_marriage, sandanme_slump, tokoyama_poached,
 * tv_documentary) → 31 chains.
 */
import { describe, it, expect } from "vitest";
import { EVENT_CHAIN_REGISTRY } from "@/engine/events/chains/chainRegistry";

describe("event census (T2.1)", () => {
  it("registry holds at least 31 distinct event chains (measured baseline)", () => {
    expect(EVENT_CHAIN_REGISTRY.length).toBeGreaterThanOrEqual(31);
  });

  it("all chain ids are unique", () => {
    const ids = EVENT_CHAIN_REGISTRY.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
