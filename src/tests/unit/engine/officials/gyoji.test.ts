/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import {
  generateGyoji,
  generateShimpan,
  assignGyojiToBout,
  assembleShimpanPanel,
  recordGyojiBout,
} from "@/engine/systems/officials/GyojiService";
import {
  calculateReversalProbability,
  resolveMonoii,
  type Gyoji,
  type Shimpan,
  type ShimpanPanel,
} from "@/engine/types/gyoji";
import { SeededRNG } from "@/engine/rng";

describe("Gyoji entity type", () => {
  it("generateGyoji creates a gyoji with accuracy field", () => {
    const g = generateGyoji("test-seed", "tate", 0);
    expect(g.id).toBeDefined();
    expect(g.name.length).toBeGreaterThan(0);
    expect(g.rank).toBe("tate");
    expect(g.accuracy).toBeGreaterThanOrEqual(0);
    expect(g.accuracy).toBeLessThanOrEqual(100);
    expect(g.boutsOfficiated).toBe(0);
    expect(g.callsReversed).toBe(0);
  });

  it("generateGyoji is deterministic given same seed", () => {
    const g1 = generateGyoji("seed-abc", "tate", 1);
    const g2 = generateGyoji("seed-abc", "tate", 1);
    expect(g1).toEqual(g2);
  });

  it("tate gyoji has higher accuracy base than makushita gyoji", () => {
    let tateAcc = 0;
    let makushitaAcc = 0;
    for (let i = 0; i < 20; i++) {
      tateAcc += generateGyoji(`s${i}`, "tate", i).accuracy;
      makushitaAcc += generateGyoji(`s${i}`, "makushita", i).accuracy;
    }
    expect(tateAcc / 20).toBeGreaterThan(makushitaAcc / 20);
  });
});

describe("Gyoji assignment to bouts", () => {
  it("assignGyojiToBout is deterministic given same inputs", () => {
    const pool = [
      generateGyoji("seed", "tate", 0),
      generateGyoji("seed", "fuku-tate", 1),
      generateGyoji("seed", "sanyaku", 2),
    ];
    const g1 = assignGyojiToBout(pool, "bout-001", 50);
    const g2 = assignGyojiToBout(pool, "bout-001", 50);
    expect(g1).toEqual(g2);
  });

  it("high-importance bouts get the top-ranked gyoji", () => {
    const pool = [
      generateGyoji("seed", "makushita", 0),
      generateGyoji("seed", "tate", 1),
      generateGyoji("seed", "sanyaku", 2),
    ];
    const g = assignGyojiToBout(pool, "bout-001", 90);
    expect(g).not.toBeNull();
    expect(g!.rank).toBe("tate");
  });

  it("returns null for empty pool", () => {
    const g = assignGyojiToBout([], "bout-001", 50);
    expect(g).toBeNull();
  });
});

describe("Shimpan panel assembly", () => {
  it("assembles a panel of 5 from a pool", () => {
    const pool: Shimpan[] = [];
    for (let i = 0; i < 8; i++) {
      pool.push(generateShimpan("seed", i));
    }
    const panel = assembleShimpanPanel(pool, "bout-001");
    expect(panel).not.toBeNull();
    expect(panel!.chief).toBeDefined();
    expect(panel!.panelists.length).toBe(4);
  });

  it("returns null when pool has fewer than 5", () => {
    const pool = [generateShimpan("seed", 0), generateShimpan("seed", 1)];
    const panel = assembleShimpanPanel(pool, "bout-001");
    expect(panel).toBeNull();
  });

  it("panel assembly is deterministic given same seed", () => {
    const pool: Shimpan[] = [];
    for (let i = 0; i < 8; i++) {
      pool.push(generateShimpan("seed", i));
    }
    const p1 = assembleShimpanPanel(pool, "bout-001");
    const p2 = assembleShimpanPanel(pool, "bout-001");
    expect(p1).toEqual(p2);
  });
});

describe("Mono-ii reversal probability", () => {
  it("low-accuracy gyoji has higher reversal probability", () => {
    const lowAcc: Gyoji = {
      id: "g1",
      name: "Test",
      rank: "makushita",
      accuracy: 30,
      yearsActive: 1,
      boutsOfficiated: 0,
      callsReversed: 0,
    };
    const highAcc: Gyoji = {
      id: "g2",
      name: "Test2",
      rank: "tate",
      accuracy: 90,
      yearsActive: 10,
      boutsOfficiated: 0,
      callsReversed: 0,
    };
    const lowProb = calculateReversalProbability(lowAcc, null);
    const highProb = calculateReversalProbability(highAcc, null);
    expect(lowProb).toBeGreaterThan(highProb);
  });

  it("sharp panel increases reversal prob for bad gyoji", () => {
    const badGyoji: Gyoji = {
      id: "g1",
      name: "Bad",
      rank: "makushita",
      accuracy: 30,
      yearsActive: 1,
      boutsOfficiated: 0,
      callsReversed: 0,
    };
    const sharpPanel: ShimpanPanel = {
      chief: { id: "s1", name: "Chief", accuracy: 85, yearsActive: 10, consultations: 0 },
      panelists: [
        { id: "s2", name: "P1", accuracy: 80, yearsActive: 8, consultations: 0 },
        { id: "s3", name: "P2", accuracy: 75, yearsActive: 7, consultations: 0 },
        { id: "s4", name: "P3", accuracy: 82, yearsActive: 9, consultations: 0 },
        { id: "s5", name: "P4", accuracy: 78, yearsActive: 6, consultations: 0 },
      ],
    };
    const probWithoutPanel = calculateReversalProbability(badGyoji, null);
    const probWithPanel = calculateReversalProbability(badGyoji, sharpPanel);
    expect(probWithPanel).toBeGreaterThan(probWithoutPanel);
  });

  it("reversal probability is bounded between 0.05 and 0.6", () => {
    const extreme: Gyoji = {
      id: "g1",
      name: "Extreme",
      rank: "makushita",
      accuracy: 0,
      yearsActive: 1,
      boutsOfficiated: 0,
      callsReversed: 0,
    };
    const prob = calculateReversalProbability(extreme, null);
    expect(prob).toBeGreaterThanOrEqual(0.05);
    expect(prob).toBeLessThanOrEqual(0.6);
  });
});

describe("Mono-ii outcome resolution", () => {
  it("resolveMonoii returns one of upheld/reversed/rematch", () => {
    const gyoji: Gyoji = {
      id: "g1",
      name: "Test",
      rank: "sanyaku",
      accuracy: 60,
      yearsActive: 5,
      boutsOfficiated: 10,
      callsReversed: 2,
    };
    const rng = new SeededRNG("monoii-test");
    const outcome = resolveMonoii(gyoji, null, rng);
    expect(["upheld", "reversed", "rematch"]).toContain(outcome);
  });

  it("resolveMonoii is deterministic given same rng state", () => {
    const gyoji: Gyoji = {
      id: "g1",
      name: "Test",
      rank: "sanyaku",
      accuracy: 60,
      yearsActive: 5,
      boutsOfficiated: 10,
      callsReversed: 2,
    };
    const rng1 = new SeededRNG("monoii-det");
    const rng2 = new SeededRNG("monoii-det");
    expect(resolveMonoii(gyoji, null, rng1)).toBe(resolveMonoii(gyoji, null, rng2));
  });
});

describe("Gyoji career tracking", () => {
  it("recordGyojiBout increments boutsOfficiated", () => {
    const gyoji: Gyoji = {
      id: "g1",
      name: "Test",
      rank: "tate",
      accuracy: 80,
      yearsActive: 5,
      boutsOfficiated: 10,
      callsReversed: 1,
    };
    const updated = recordGyojiBout(gyoji, "hatsu", 2024, false);
    expect(updated.boutsOfficiated).toBe(11);
    expect(updated.callsReversed).toBe(1);
  });

  it("recordGyojiBout increments callsReversed when reversed", () => {
    const gyoji: Gyoji = {
      id: "g1",
      name: "Test",
      rank: "tate",
      accuracy: 80,
      yearsActive: 5,
      boutsOfficiated: 10,
      callsReversed: 1,
    };
    const updated = recordGyojiBout(gyoji, "hatsu", 2024, true);
    expect(updated.callsReversed).toBe(2);
  });

  it("recordGyojiBout appends to careerHistory", () => {
    const gyoji: Gyoji = {
      id: "g1",
      name: "Test",
      rank: "tate",
      accuracy: 80,
      yearsActive: 5,
      boutsOfficiated: 10,
      callsReversed: 1,
    };
    const updated = recordGyojiBout(gyoji, "aki", 2024, true);
    expect(updated.careerHistory).toBeDefined();
    expect(updated.careerHistory!.length).toBe(1);
    expect(updated.careerHistory![0].bashoName).toBe("aki");
    expect(updated.careerHistory![0].reversals).toBe(1);
  });
});
