import { describe, it, expect } from "vitest";
import { applyOfficiating } from "@/engine/bout/resolution/officiating";
import { applyGyojiOfficiation } from "@/engine/bout/resolution/gyoji";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { mockRikishi, makeMockBasho, makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import { makeBoutResult } from "@tests/helpers/boutTestHelpers";
import type { BoutResult, BashoState, KinjiteFoul } from "@/engine/types/basho";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { WorldState } from "@/engine/types/world";
import type { Gyoji, Shimpan } from "@/engine/types/gyoji";

function makeShimpan(i: number, accuracy = 65): Shimpan {
  return {
    id: `sh-${i}`,
    name: `Judge-${i}`,
    accuracy,
    yearsActive: 10,
    consultations: 0,
  };
}

function makeGyoji(): Gyoji {
  return {
    id: "gy-1",
    name: "Kimura Shonosuke",
    rank: "makuuchi",
    accuracy: 60,
    yearsActive: 12,
    boutsOfficiated: 0,
    callsReversed: 0,
  };
}

function makeOfficialsWorld(shimpanCount = 6): WorldState {
  return makeMockWorld({
    shimpanPool: Array.from({ length: shimpanCount }, (_, i) => makeShimpan(i)),
    gyojiPool: [makeGyoji()],
    governanceLog: [],
    heyas: new Map([
      ["heya-r-east", makeMockHeya("heya-r-east")],
      ["heya-r-west", makeMockHeya("heya-r-west")],
    ]),
  }) as WorldState;
}

function makeBout(id: string, playerSide?: "east" | "west"): BoutContext {
  return {
    id,
    day: 15,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...(playerSide ? { playerSide } : {}),
  };
}

function makePhysicsResult(): BoutResult {
  return makeBoutResult({
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    excitementScore: 50,
  });
}

function makeDesperateEast() {
  return mockRikishi("r-east", {
    shikona: "Alpha",
    aggression: 95,
    technique: 25,
    heyaId: "heya-r-east",
  });
}

function makeBasho15(): BashoState {
  const basho = makeMockBasho({ day: 15 });
  basho.standings = new Map([
    ["r-east", { wins: 7, losses: 7 }],
    ["r-west", { wins: 7, losses: 7 }],
  ]);
  return basho;
}

function runOfficiating(
  boutId: string,
  world: WorldState | undefined,
  playerSide?: "east" | "west",
  physicsResult: BoutResult = makePhysicsResult()
) {
  const east = makeDesperateEast();
  const west = mockRikishi("r-west", { shikona: "Beta", technique: 70, heyaId: "heya-r-west" });
  const basho = makeBasho15();
  const builder = createImpactBuilder("test");
  const outcome = applyOfficiating(
    makeBout(boutId, playerSide),
    physicsResult,
    east,
    west,
    basho,
    undefined,
    undefined,
    world,
    builder
  );
  return { outcome, impact: builder.build(), east, west };
}

describe("applyOfficiating — foul review eligibility", () => {
  it("suspects and reviews fouls in NPC-vs-NPC bouts when a 5+ shimpan pool exists", () => {
    const world = makeOfficialsWorld();
    let seen: ReturnType<typeof runOfficiating>["outcome"] | null = null;
    for (let i = 0; i < 600 && !seen; i++) {
      const { outcome } = runOfficiating(`npc-foul-${i}`, world);
      if (outcome.result.foulReview) seen = outcome;
    }
    expect(seen).not.toBeNull();
    expect(seen?.result.monoii).toBe(true);
    expect(seen?.result.foulReview?.suspectRikishiId).toBe("r-east");
    expect(seen?.result.foulReview?.victimRikishiId).toBe("r-west");
  });

  it("never reviews a foul without a world (worldless harnesses stay foul-free)", () => {
    for (let i = 0; i < 300; i++) {
      const { outcome } = runOfficiating(`worldless-${i}`, undefined);
      expect(outcome.result.foulReview).toBeUndefined();
      expect(outcome.result.kimarite).toBe("yorikiri");
    }
  });

  it("never reviews a foul when the shimpan pool is smaller than five", () => {
    const world = makeOfficialsWorld(4);
    // Reuse a seed that fires with a full pool to prove the gate, not the roll.
    const full = makeOfficialsWorld(6);
    let firingBoutId: string | null = null;
    for (let i = 0; i < 600 && !firingBoutId; i++) {
      const { outcome } = runOfficiating(`gate-${i}`, full);
      if (outcome.result.foulReview) firingBoutId = `gate-${i}`;
    }
    expect(firingBoutId).not.toBeNull();
    const { outcome } = runOfficiating(firingBoutId!, world);
    expect(outcome.result.foulReview).toBeUndefined();
  });

  it("never reviews a foul on fusensho results", () => {
    const world = makeOfficialsWorld();
    const fusensho = makePhysicsResult();
    fusensho.kimarite = "fusensho";
    fusensho.kimariteName = "Fusensho";
    for (let i = 0; i < 300; i++) {
      const { outcome } = runOfficiating(`fusen-${i}`, world, undefined, fusensho);
      expect(outcome.result.foulReview).toBeUndefined();
    }
  });

  it("is deterministic — same bout id and world produce the same review", () => {
    const world = makeOfficialsWorld();
    const { outcome: first } = runOfficiating("det-bout-7", world);
    const { outcome: second } = runOfficiating("det-bout-7", makeOfficialsWorld());
    expect(first.result.foulReview).toEqual(second.result.foulReview);
    expect(first.result.kimarite).toBe(second.result.kimarite);
  });
});

describe("applyOfficiating — confirmed foul", () => {
  function findOutcome(confirmed: boolean) {
    const world = makeOfficialsWorld();
    for (let i = 0; i < 1200; i++) {
      const ran = runOfficiating(`verdict-${i}`, world);
      if (ran.outcome.result.foulReview?.confirmed === confirmed) return ran;
    }
    return null;
  }

  it("confirmed foul flips the result to hansoku", () => {
    const found = findOutcome(true);
    expect(found).not.toBeNull();
    const { outcome, impact } = found!;
    const { result } = outcome;
    expect(result.kimarite).toBe("hansoku");
    expect(result.kimariteName).toBe("Hansoku");
    expect(result.winner).toBe("west");
    expect(result.winnerRikishiId).toBe("r-west");
    expect(result.loserRikishiId).toBe("r-east");
    expect(result.upset).toBe(true);
    expect(result.foulReview?.confirmed).toBe(true);
    expect(result.foulReview?.apparentKimarite).toBe("yorikiri");
    expect(result.foulReview?.suspectRikishiId).toBe("r-east");
    expect(result.excitementScore ?? 0).toBeLessThanOrEqual(100);
    expect(result.log.some((e) => e.phase === "finish" && e.data?.event === "hansoku")).toBe(true);
  });

  it("confirmed foul reports a scandal for the suspect's heya", () => {
    const found = findOutcome(true);
    expect(found).not.toBeNull();
    const { impact } = found!;
    const heyaUpdate = impact.entities?.heyaUpdates?.get("heya-r-east");
    expect(heyaUpdate).toBeDefined();
    expect((heyaUpdate?.scandalScore ?? 0) > 0).toBe(true);
  });

  it("a routine hansoku never counts as a major scandal against the master", () => {
    // Hansoku is a sporting foul — a loss by disqualification — not stable
    // misconduct. Reporting it "major" bumped tenure.majorScandals on every
    // NPC disqualification, mass-firing masters via the §16.1 scandal trigger
    // and churning trustees until stables folded sanctioned-and-heirless.
    const found = findOutcome(true);
    expect(found).not.toBeNull();
    const { impact } = found!;
    const scandalEvents = (impact.events ?? []).filter(
      (e) => (e.data as { incident?: string }).incident === "scandal_reported"
    );
    expect(scandalEvents.length).toBeGreaterThan(0);
    for (const e of scandalEvents) {
      expect((e.data as { status?: string }).status).not.toBe("major");
    }
  });
});

describe("applyOfficiating — cleared foul", () => {
  it("cleared review keeps the original result and still records mono-ii", () => {
    const world = makeOfficialsWorld();
    let cleared: ReturnType<typeof runOfficiating> | null = null;
    for (let i = 0; i < 1200 && !cleared; i++) {
      const ran = runOfficiating(`clear-${i}`, world);
      if (ran.outcome.result.foulReview && !ran.outcome.result.foulReview.confirmed) {
        cleared = ran;
      }
    }
    expect(cleared).not.toBeNull();
    const { result } = cleared!.outcome;
    expect(result.winner).toBe("east");
    expect(result.kimarite).toBe("yorikiri");
    expect(result.foulReview?.confirmed).toBe(false);
    expect(result.monoii).toBe(true);
    // No scandal for the cleared suspect.
    const heyaUpdate = cleared!.impact.entities?.heyaUpdates?.get("heya-r-east");
    expect(heyaUpdate?.scandalScore ?? 0).toBe(0);
  });
});

describe("applyOfficiating — yaocho gating unchanged", () => {
  it("keeps yaocho checks player-bout-gated while foul review is open to all", () => {
    const world = makeOfficialsWorld();
    const npc = runOfficiating("yaocho-gate-1", world);
    expect(npc.outcome.enableYaocho).toBe(false);
    const player = runOfficiating("yaocho-gate-1", world, "east");
    expect(player.outcome.enableYaocho).toBe(true);
  });
});

describe("applyGyojiOfficiation — foul review verdict", () => {
  function makeFoulResult(confirmed: boolean): BoutResult {
    return makeBoutResult({
      monoii: true,
      foulReview: {
        foul: "topknot_grab" as KinjiteFoul,
        suspectRikishiId: "r-east",
        victimRikishiId: "r-west",
        suspectSide: "east",
        confirmed,
        apparentKimarite: "yorikiri",
      },
    });
  }

  it("confirmed foul review forces monoiiOutcome = reversed and records panel + gyoji reversal", () => {
    const world = makeOfficialsWorld();
    const basho = makeBasho15();
    const result = makeFoulResult(true);
    const builder = createImpactBuilder("test");
    applyGyojiOfficiation(world, result, basho, builder);

    expect(result.monoiiOutcome).toBe("reversed");
    expect(result.shimpanPanelIds?.length).toBe(5);
    expect(result.gyojiId).toBe("gy-1");

    const impact = builder.build();
    const pool = (impact.worldFields?.shimpanPool ?? []) as Shimpan[];
    const credited = pool.filter((s) => s.consultations === 1);
    expect(credited.length).toBe(5);
    for (const s of credited) {
      expect(result.shimpanPanelIds).toContain(s.id);
    }
    const gyojiPool = (impact.worldFields?.gyojiPool ?? []) as Gyoji[];
    expect(gyojiPool[0].callsReversed).toBe(1);
  });

  it("cleared foul review forces monoiiOutcome = upheld with no gyoji reversal", () => {
    const world = makeOfficialsWorld();
    const basho = makeBasho15();
    const result = makeFoulResult(false);
    const builder = createImpactBuilder("test");
    applyGyojiOfficiation(world, result, basho, builder);

    expect(result.monoiiOutcome).toBe("upheld");
    expect(result.shimpanPanelIds?.length).toBe(5);
    const impact = builder.build();
    const pool = (impact.worldFields?.shimpanPool ?? []) as Shimpan[];
    expect(pool.filter((s) => s.consultations === 1).length).toBe(5);
    const gyojiPool = (impact.worldFields?.gyojiPool ?? []) as Gyoji[];
    expect(gyojiPool[0].callsReversed).toBe(0);
  });

  it("foul reviews never produce a rematch outcome", () => {
    const world = makeOfficialsWorld();
    const basho = makeBasho15();
    for (const confirmed of [true, false]) {
      const result = makeFoulResult(confirmed);
      const builder = createImpactBuilder("test");
      applyGyojiOfficiation(world, result, basho, builder);
      expect(result.monoiiOutcome).not.toBe("rematch");
    }
  });

  it("non-foul mono-ii still resolves through the panel roll", () => {
    const world = makeOfficialsWorld();
    const basho = makeBasho15();
    const result = makeBoutResult({ monoii: true });
    const builder = createImpactBuilder("test");
    applyGyojiOfficiation(world, result, basho, builder);
    expect(["upheld", "reversed", "rematch"]).toContain(result.monoiiOutcome);
    expect(result.shimpanPanelIds?.length).toBe(5);
  });
});
