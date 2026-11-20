import { describe, it, expect } from "vitest";
import {
  calculateHansokuChance,
  pickFoulType,
  resolveFoulVerdict,
  rollFoulSuspicion,
  type FoulSuspicion,
} from "@/engine/bout/kinjite";
import { KINJITE_MAX_SUSPICION, KINJITE_SUSPICION_BASE } from "@/constants/engine/bout";
import { SeededRNG } from "@/engine/core/rng";
import { mockRikishi, makeMockBasho } from "@tests/unit/engine/utils";
import type { BoutResult, KinjiteFoul } from "@/engine/types/basho";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { ShimpanPanel } from "@/engine/types/gyoji";

const KINJITE_FOULS: KinjiteFoul[] = [
  "topknot_grab",
  "closed_fist",
  "eye_poke",
  "throat_grab",
  "ear_strike",
  "low_blow",
  "finger_bend",
  "kick",
];

function makeBoutContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    id: "bout-test-001",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...overrides,
  };
}

function makeBoutResult(winner: "east" | "west" = "east"): BoutResult {
  return {
    boutId: "bout-test-001",
    winner,
    winnerRikishiId: winner === "east" ? "r-east" : "r-west",
    loserRikishiId: winner === "east" ? "r-west" : "r-east",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: winner,
    duration: 10,
    excitementScore: 50,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 5,
    inBoutInjury: null,
    isTimeout: false,
  };
}

function makeDesperateSetup() {
  const east = mockRikishi("r-east", { aggression: 95, technique: 25, heyaId: "heya-east" });
  const west = mockRikishi("r-west", { technique: 70, heyaId: "heya-west" });
  const bout = makeBoutContext({ day: 15 });
  const basho = makeMockBasho({ day: 15 });
  basho.standings = new Map([
    ["r-east", { wins: 7, losses: 7 }],
    ["r-west", { wins: 7, losses: 7 }],
  ]);
  return { east, west, bout, basho };
}

function makeSuspicion(suspectSide: "east" | "west" = "east"): FoulSuspicion {
  return {
    suspectSide,
    suspectRikishiId: suspectSide === "east" ? "r-east" : "r-west",
    victimRikishiId: suspectSide === "east" ? "r-west" : "r-east",
    foul: "topknot_grab",
  };
}

function makePanel(accuracy = 70): ShimpanPanel {
  const mk = (id: string) => ({
    id,
    name: `Judge-${id}`,
    accuracy,
    yearsActive: 10,
    consultations: 0,
  });
  return {
    chief: mk("sh-chief"),
    panelists: [mk("sh-1"), mk("sh-2"), mk("sh-3"), mk("sh-4")],
  };
}

describe("Kinjite (hansoku/DQ) — calculateHansokuChance", () => {
  it("high-technique rikishi get the baseline rate (no brawler bonus)", () => {
    const winner = mockRikishi("r-east", { aggression: 60, technique: 80 });
    const bout = makeBoutContext({ day: 1 });
    const basho = makeMockBasho({ day: 1 });
    basho.standings = new Map([["r-east", { wins: 3, losses: 2 }]]);

    // Balanced rikishi carry only the universal baseline — any rikishi can
    // commit a heat-of-the-moment foul, but no aggression bonus applies.
    expect(calculateHansokuChance(winner, bout, basho)).toBe(KINJITE_SUSPICION_BASE);
  });

  it("adds desperation bonuses even without a brawler ratio", () => {
    const winner = mockRikishi("r-east", { aggression: 60, technique: 80 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([["r-east", { wins: 7, losses: 7 }]]);

    expect(calculateHansokuChance(winner, bout, basho)).toBeGreaterThan(KINJITE_SUSPICION_BASE);
  });

  it("returns > 0 for high-aggression/low-technique on day 15 with 7-7", () => {
    const winner = mockRikishi("r-east", { aggression: 95, technique: 25 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([["r-east", { wins: 7, losses: 7 }]]);

    expect(calculateHansokuChance(winner, bout, basho)).toBeGreaterThan(0);
  });

  it("scales with desperation — day 15 + 7-7 > day 1", () => {
    const winner = mockRikishi("r-east", { aggression: 95, technique: 25 });

    const day15Bout = makeBoutContext({ day: 15 });
    const day15Basho = makeMockBasho({ day: 15 });
    day15Basho.standings = new Map([["r-east", { wins: 7, losses: 7 }]]);

    const day1Bout = makeBoutContext({ day: 1 });
    const day1Basho = makeMockBasho({ day: 1 });
    day1Basho.standings = new Map([["r-east", { wins: 0, losses: 0 }]]);

    const day15Chance = calculateHansokuChance(winner, day15Bout, day15Basho);
    const day1Chance = calculateHansokuChance(winner, day1Bout, day1Basho);

    expect(day15Chance).toBeGreaterThan(day1Chance);
  });

  it("adds bonus for kadoban ozeki", () => {
    const winner = mockRikishi("r-east", {
      aggression: 95,
      technique: 25,
      rank: "ozeki",
    });

    const kadobanBout = makeBoutContext({ day: 12 });
    const kadobanBasho = makeMockBasho({ day: 12 });
    kadobanBasho.standings = new Map([["r-east", { wins: 5, losses: 6 }]]);

    const normalBout = makeBoutContext({ day: 12 });
    const normalBasho = makeMockBasho({ day: 12 });
    normalBasho.standings = new Map([["r-east", { wins: 9, losses: 2 }]]);

    const kadobanChance = calculateHansokuChance(winner, kadobanBout, kadobanBasho);
    const normalChance = calculateHansokuChance(winner, normalBout, normalBasho);

    expect(kadobanChance).toBeGreaterThan(normalChance);
  });

  it("caps at maximum probability", () => {
    const winner = mockRikishi("r-east", { aggression: 100, technique: 1 });
    const bout = makeBoutContext({ day: 15 });
    const basho = makeMockBasho({ day: 15 });
    basho.standings = new Map([["r-east", { wins: 7, losses: 7 }]]);

    expect(calculateHansokuChance(winner, bout, basho)).toBeLessThanOrEqual(KINJITE_MAX_SUSPICION);
  });
});

describe("Kinjite — rollFoulSuspicion", () => {
  it("returns null for fusensho results", () => {
    const { east, west, bout, basho } = makeDesperateSetup();
    const fusenshoResult: BoutResult = {
      ...makeBoutResult("east"),
      kimarite: "fusensho",
      kimariteName: "Fusensho",
      duration: 0,
    };
    for (let i = 0; i < 100; i++) {
      const suspicion = rollFoulSuspicion(bout, fusenshoResult, east, west, basho, `seed-${i}`);
      expect(suspicion).toBeNull();
    }
  });

  it("fires far less often for a high-technique winner than a desperate brawler", () => {
    const east = mockRikishi("r-east", { aggression: 60, technique: 80 });
    const west = mockRikishi("r-west", { technique: 70 });
    const { bout, basho } = makeDesperateSetup();
    let balancedCount = 0;
    for (let i = 0; i < 2000; i++) {
      if (rollFoulSuspicion(bout, makeBoutResult("east"), east, west, basho, `seed-${i}`)) {
        balancedCount++;
      }
    }
    // Baseline rate ~1.1% on day 15 (base + senshuraku + 7-7 bonuses, no
    // brawler bonus) — over 2000 seeds expect ~22, well under the brawler's
    // ~7% rate. Bound loosely to keep the test seed-insensitive.
    expect(balancedCount).toBeGreaterThan(0);
    expect(balancedCount).toBeLessThan(80);
  });

  it("returns a suspicion naming the apparent winner as suspect for desperate rikishi", () => {
    const { east, west, bout, basho } = makeDesperateSetup();
    let suspicion: FoulSuspicion | null = null;
    for (let i = 0; i < 600 && !suspicion; i++) {
      suspicion = rollFoulSuspicion(
        bout,
        makeBoutResult("east"),
        east,
        west,
        basho,
        `seed-hansoku-${i}`
      );
    }
    expect(suspicion).not.toBeNull();
    expect(suspicion?.suspectSide).toBe("east");
    expect(suspicion?.suspectRikishiId).toBe("r-east");
    expect(suspicion?.victimRikishiId).toBe("r-west");
    expect(KINJITE_FOULS).toContain(suspicion?.foul);
  });

  it("is deterministic for the same seed", () => {
    const { east, west, bout, basho } = makeDesperateSetup();
    const s1 = rollFoulSuspicion(bout, makeBoutResult("east"), east, west, basho, "det-seed-1");
    const s2 = rollFoulSuspicion(bout, makeBoutResult("east"), east, west, basho, "det-seed-1");
    expect(s1).toEqual(s2);
  });

  it("is position-invariant — mirrored east/west produces mirrored suspicion", () => {
    const { east, west, bout, basho } = makeDesperateSetup();
    // Find a seed that fires for the east-winner configuration.
    let firingSeed: string | null = null;
    for (let i = 0; i < 600 && !firingSeed; i++) {
      const s = rollFoulSuspicion(bout, makeBoutResult("east"), east, west, basho, `mirror-${i}`);
      if (s) firingSeed = `mirror-${i}`;
    }
    expect(firingSeed).not.toBeNull();
    // Mirror: swap rikishi and flip the apparent winner. The west rikishi in the
    // mirrored bout is the aggressive one — same stats as r-east above.
    const mirroredEast = mockRikishi("r-west", { technique: 70, heyaId: "heya-west" });
    const mirroredWest = mockRikishi("r-east", {
      aggression: 95,
      technique: 25,
      heyaId: "heya-east",
    });
    const mirroredBasho = makeMockBasho({ day: 15 });
    mirroredBasho.standings = new Map([
      ["r-west", { wins: 7, losses: 7 }],
      ["r-east", { wins: 7, losses: 7 }],
    ]);
    const mirrored = rollFoulSuspicion(
      bout,
      makeBoutResult("west"),
      mirroredEast,
      mirroredWest,
      mirroredBasho,
      firingSeed!
    );
    expect(mirrored).not.toBeNull();
    expect(mirrored?.suspectSide).toBe("west");
    expect(mirrored?.suspectRikishiId).toBe(mirroredWest.id);
    expect(mirrored?.victimRikishiId).toBe(mirroredEast.id);
  });
});

describe("Kinjite — pickFoulType", () => {
  it("weights topknot_grab as the dominant foul type", () => {
    const counts = new Map<KinjiteFoul, number>();
    const rng = new SeededRNG("foul-dist");
    for (let i = 0; i < 400; i++) {
      const foul = pickFoulType(rng);
      counts.set(foul, (counts.get(foul) ?? 0) + 1);
    }
    for (const foul of KINJITE_FOULS) {
      expect(counts.get(foul) ?? 0).toBeGreaterThan(0);
    }
    const topknot = counts.get("topknot_grab") ?? 0;
    for (const [foul, count] of counts) {
      if (foul === "topknot_grab") continue;
      expect(topknot).toBeGreaterThan(count);
    }
  });

  it("is deterministic for the same draw", () => {
    const v = { next: () => 0.01 };
    expect(pickFoulType(v)).toBe(pickFoulType(v));
  });

  it("maps the top of the roll range to a non-topknot foul", () => {
    const foul = pickFoulType({ next: () => 0.999 });
    expect(KINJITE_FOULS).toContain(foul);
    expect(foul).not.toBe("topknot_grab");
  });
});

describe("Kinjite — resolveFoulVerdict", () => {
  it("is deterministic for the same seed and panel", () => {
    const suspicion = makeSuspicion();
    const panel = makePanel();
    const v1 = resolveFoulVerdict(suspicion, panel, "verdict-seed-1");
    const v2 = resolveFoulVerdict(suspicion, panel, "verdict-seed-1");
    expect(v1).toBe(v2);
  });

  it("produces both confirmed and cleared verdicts across seeds", () => {
    const suspicion = makeSuspicion();
    const panel = makePanel(65);
    let confirmed = 0;
    let cleared = 0;
    for (let i = 0; i < 300; i++) {
      if (resolveFoulVerdict(suspicion, panel, `verdict-${i}`)) confirmed++;
      else cleared++;
    }
    expect(confirmed).toBeGreaterThan(0);
    expect(cleared).toBeGreaterThan(0);
  });

  it("higher-accuracy panels confirm more often than low-accuracy panels", () => {
    const suspicion = makeSuspicion();
    const highPanel = makePanel(90);
    const lowPanel = makePanel(40);
    let highConfirmed = 0;
    let lowConfirmed = 0;
    for (let i = 0; i < 300; i++) {
      if (resolveFoulVerdict(suspicion, highPanel, `acc-${i}`)) highConfirmed++;
      if (resolveFoulVerdict(suspicion, lowPanel, `acc-${i}`)) lowConfirmed++;
    }
    expect(highConfirmed).toBeGreaterThan(lowConfirmed);
  });
});
