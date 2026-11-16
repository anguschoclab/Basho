import { describe, it, expect } from "vitest";
import { rollMissedCallReview } from "@/engine/bout/resolution/missedCall";
import { resolveMonoii } from "@/engine/types/gyoji";
import { generateGyoji, generateShimpan } from "@/engine/officials/GyojiService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BoutResult } from "@/engine/types/basho";
import type { Gyoji, ShimpanPanel } from "@/engine/types/gyoji";

/**
 * Missed-call reviews (W D): the shimpan panel proactively catches calls
 * the gyoji got wrong — hand/knee-down finishes (hiwaza) and close edge
 * finishes — even when physics flagged no controversy. Reviews are
 * reversal-biased and cannot produce a second rematch.
 */
function resultFor(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "mc-1",
    day: 5,
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 10,
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: {} }],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  };
}

function officialsWorld() {
  return MockFactory.createWorld({
    gyojiPool: [generateGyoji("mc-gy", "sanyaku", 0)],
    shimpanPool: [0, 1, 2, 3, 4].map((i) => generateShimpan("mc-sh", i)),
  });
}

describe("rollMissedCallReview", () => {
  it("fires on hiwaza finishes over enough seeds", () => {
    const world = officialsWorld();
    let fired = 0;
    for (let i = 0; i < 200; i++) {
      const r = resultFor({ kimarite: "tsukite", boutId: `mc-${i}` });
      rollMissedCallReview(r, world, `seed-${i}`);
      if (r.monoii && r.monoiiKind === "missed_call") fired++;
    }
    // ~4% expected — wide bounds keep it deterministic-safe.
    expect(fired).toBeGreaterThan(0);
    expect(fired).toBeLessThan(40);
  });

  it("does not fire on clean mid-dohyo wins", () => {
    const world = officialsWorld();
    for (let i = 0; i < 200; i++) {
      const r = resultFor({ kimarite: "yorikiri", boutId: `mcc-${i}` });
      rollMissedCallReview(r, world, `seedc-${i}`);
      expect(r.monoii).toBeFalsy();
    }
  });

  it("skips bouts already flagged or under foul review", () => {
    const world = officialsWorld();
    for (let i = 0; i < 100; i++) {
      const flagged = resultFor({ kimarite: "tsukite", monoii: true, boutId: `mcf-${i}` });
      rollMissedCallReview(flagged, world, `seedf-${i}`);
      expect(flagged.monoiiKind).toBeUndefined();

      const foul = resultFor({
        kimarite: "tsukite",
        boutId: `mcfo-${i}`,
        foulReview: {
          foul: "topknot_grab",
          suspectRikishiId: "r-west",
          victimRikishiId: "r-east",
          suspectSide: "west",
          confirmed: false,
          apparentKimarite: "tsukite",
        },
      });
      rollMissedCallReview(foul, world, `seedfo-${i}`);
      expect(foul.monoiiKind).toBeUndefined();
    }
  });

  it("does not fire without a panelable shimpan pool", () => {
    const world = MockFactory.createWorld({
      gyojiPool: [generateGyoji("mc-gy2", "sanyaku", 0)],
      shimpanPool: [0, 1, 2].map((i) => generateShimpan("mc-sh2", i)),
    });
    for (let i = 0; i < 200; i++) {
      const r = resultFor({ kimarite: "tsukihiza", boutId: `mcnp-${i}` });
      rollMissedCallReview(r, world, `seednp-${i}`);
      expect(r.monoiiKind).toBeUndefined();
    }
  });
});

describe("resolveMonoii — missed-call options", () => {
  // accuracy 50 → base reversal probability is exactly 0.25, panel avg
  // below 70 adds nothing. A roll of 0.30 sits in the bonus band.
  const gyoji: Gyoji = {
    ...generateGyoji("mc-fixed", "sanyaku", 0),
    accuracy: 50,
  };
  const panel: ShimpanPanel = {
    chief: { ...generateShimpan("mc-pc", 0), accuracy: 50 },
    panelists: [1, 2, 3, 4].map((i) => ({
      ...generateShimpan("mc-pp", i),
      accuracy: 50,
    })),
  };
  const rollAt = (v: number) => ({ next: () => v });

  it("reversalBonus widens the reversal band", () => {
    expect(resolveMonoii(gyoji, panel, rollAt(0.3))).toBe("rematch");
    expect(
      resolveMonoii(gyoji, panel, rollAt(0.3), { reversalBonus: 0.15 })
    ).toBe("reversed");
  });

  it("suppressRematch removes the rematch band", () => {
    expect(resolveMonoii(gyoji, panel, rollAt(0.3))).toBe("rematch");
    expect(
      resolveMonoii(gyoji, panel, rollAt(0.3), { suppressRematch: true })
    ).toBe("upheld");
  });

  it("both options compose — rematch reruns reverse but never re-rematch", () => {
    expect(
      resolveMonoii(gyoji, panel, rollAt(0.3), {
        reversalBonus: 0.15,
        suppressRematch: true,
      })
    ).toBe("reversed");
    expect(
      resolveMonoii(gyoji, panel, rollAt(0.5), {
        reversalBonus: 0.15,
        suppressRematch: true,
      })
    ).toBe("upheld");
  });
});
