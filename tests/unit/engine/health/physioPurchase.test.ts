import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { buyPhysioSession, PHYSIO_SESSION_COST } from "@/engine/health/physioPurchase";

function mk(opts: { injured?: boolean; weeks?: number; funds?: number } = {}) {
  const heya = MockFactory.createHeya("h1", { funds: opts.funds ?? 1_000_000 });
  const r = MockFactory.createRikishi("r1", { heyaId: "h1" });
  r.injured = opts.injured ?? true;
  r.injuryWeeksRemaining = opts.weeks ?? 3;
  r.injuryStatus = {
    type: "muscle_strain",
    isInjured: r.injured,
    severity: "moderate",
    location: "knee",
    weeksRemaining: r.injuryWeeksRemaining,
    weeksToHeal: r.injuryWeeksRemaining,
  } as never;
  const world = MockFactory.createWorld({
    heyas: new Map([["h1", heya]]),
    rikishi: new Map([["r1", r]]),
    activeRikishiIds: new Set(["r1"]),
    playerHeyaId: "h1",
  });
  return { world };
}

describe("BUY_PHYSIO (P6)", () => {
  it("reduces injuryWeeksRemaining by 1 and charges the session cost", () => {
    const { world } = mk({ weeks: 3 });
    const impact = buyPhysioSession(world, "r1");
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as { funds?: number };
    expect(heyaUp?.funds).toBe(1_000_000 - PHYSIO_SESSION_COST);
    const rUp = impact.entities?.rikishiUpdates?.get("r1") as { injuryWeeksRemaining?: number };
    expect(rUp?.injuryWeeksRemaining).toBe(2);
  });

  it("clears injury when the last week is bought out", () => {
    const { world } = mk({ weeks: 1 });
    const impact = buyPhysioSession(world, "r1");
    const rUp = impact.entities?.rikishiUpdates?.get("r1") as {
      injuryWeeksRemaining?: number;
      injured?: boolean;
    };
    expect(rUp?.injuryWeeksRemaining).toBe(0);
    expect(rUp?.injured).toBe(false);
  });

  it("refuses when not injured", () => {
    const { world } = mk({ injured: false, weeks: 0 });
    const impact = buyPhysioSession(world, "r1");
    expect(impact.entities?.heyaUpdates).toBeUndefined();
    expect(impact.entities?.rikishiUpdates).toBeUndefined();
  });

  it("refuses when the heya cannot afford it — no free healing", () => {
    const { world } = mk({ funds: PHYSIO_SESSION_COST - 1 });
    const impact = buyPhysioSession(world, "r1");
    expect(impact.entities?.rikishiUpdates).toBeUndefined();
  });
});
