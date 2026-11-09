/**
 * v18InjuryCleanup.test.ts
 * =========================
 * Failing-first regression pin for S7 — `clearInjury`
 * (src/engine/health/InjuryService.ts:352-366) clears `injured`,
 * `injuryWeeksRemaining`, `isKyujo`, `kyujoReason`, `medicalCertificate` and
 * `currentInjury`, but leaves a stale `injuryStatus` object and the legacy
 * `injury` alias behind.
 *
 * The canonical recovery path — `tickRikishiRecovery`
 * (src/engine/health/RecoveryService.ts:33-42) — clears both:
 *   rikishi.injuryStatus = { type: "none", severity: "none", weeksRemaining: 0 };
 *   rikishi.injury = undefined;
 * A doctor-clearance through clearInjury must leave the rikishi in the same
 * post-recovery shape: anything still reporting `isInjured`/`type != "none"`
 * keeps the wrestler flagged as hurt to every reader of injuryStatus/injury.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { clearInjury } from "@/engine/health/InjuryService";
import { tickRikishiRecovery } from "@/engine/health/RecoveryService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

const ID = "r-inj";

function injuredRikishi() {
  return MockFactory.createRikishi(ID, {
    injured: true,
    injuryWeeksRemaining: 3,
    isKyujo: true,
    kyujoReason: "injury",
    injuryStatus: {
      type: "tear",
      isInjured: true,
      severity: "serious",
      location: "knee",
      weeksRemaining: 3,
      weeksToHeal: 4,
    },
    injury: {
      type: "tear",
      isInjured: true,
      severity: "serious",
      location: "knee",
      weeksRemaining: 3,
    },
    currentInjury: {
      id: "ij-1",
      severity: "serious",
      area: "knee",
      type: "tear",
      weeksOut: 3,
      weekOccurred: 1,
    },
  });
}

describe("clearInjury — consistent post-clearance state (S7 InjuryService)", () => {
  it("clears injuryStatus and the legacy injury alias like the recovery path does", () => {
    const world = MockFactory.createWorld({
      rikishi: new Map([[ID, injuredRikishi()]]),
    });

    const next = resolveImpacts(world, [clearInjury(ID)]);
    const r = next.rikishi.get(ID)!;

    // These already pass — clearInjury does clear the flat fields.
    expect(r.injured).toBe(false);
    expect(r.injuryWeeksRemaining).toBe(0);
    expect(r.currentInjury).toBeUndefined();

    // Canonical reference: the recovery path's cleared shape — reached when
    // the last recovery week ticks down to zero (RecoveryService.ts:33-42).
    const recovered = injuredRikishi();
    recovered.injuryWeeksRemaining = 1;
    tickRikishiRecovery(recovered);
    expect(recovered.injuryStatus?.type).toBe("none");
    expect(recovered.injuryStatus?.weeksRemaining).toBe(0);
    expect(recovered.injury).toBeUndefined();

    // PIN (RED): clearInjury leaves the pre-existing injuryStatus object and
    // the legacy injury alias untouched — a cleared wrestler still reads as
    // injured (type "tear", isInjured true) to injuryStatus consumers.
    expect(r.injuryStatus?.type).toBe("none");
    expect(r.injuryStatus?.isInjured ?? false).toBe(false);
    expect(r.injuryStatus?.weeksRemaining).toBe(0);
    expect(r.injury).toBeUndefined();
  });
});
