/**
 * T2.1 — player-visible event census. Ratchets the current volume of
 * distinct event chains so content depth can't silently regress while
 * the content push toward competitor parity (~150 events) proceeds.
 * Measured 2026-11: 15 top-level chains (191 ids incl. stages).
 */
import { describe, it, expect } from "vitest";
import { EVENT_CHAIN_REGISTRY } from "@/engine/events/chains/chainRegistry";

describe("event census (T2.1)", () => {
  it("registry holds at least 15 distinct event chains (measured baseline)", () => {
    expect(EVENT_CHAIN_REGISTRY.length).toBeGreaterThanOrEqual(15);
  });

  it("all chain ids are unique", () => {
    const ids = EVENT_CHAIN_REGISTRY.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
