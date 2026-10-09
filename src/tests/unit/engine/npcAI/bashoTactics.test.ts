/**
 * WS3 — Mid-basho daily tactical phase (canon §14, basho-scoped).
 *
 * `phase01_basho_npc_tactics` runs every day of an active basho BEFORE bout
 * resolution — including inside `advanceDaysFast`, which skips the daily
 * micro phases. It owns day-of kyujo calls and per-heya basho posture that
 * feeds NPC tactic selection in the bout resolver.
 */

import { describe, it, expect } from "vitest";
import { phase01_basho_npc_tactics } from "@/engine/tick/phases";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { readSrcFile } from "@/tests/helpers/fsScan";
import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

function injuredRikishi(id: string, heyaId: string, severity: "minor" | "moderate" | "serious"): Rikishi {
  return MockFactory.createRikishi({
    id,
    heyaId,
    injured: true,
    isKyujo: false,
    division: "makuuchi",
    rank: "maegashira",
    injuryWeeksRemaining: 3,
    injuryStatus: {
      type: "muscle_strain",
      severity,
      weeksRemaining: 3,
    } as unknown as Rikishi["injuryStatus"],
  } as Partial<Rikishi>);
}

function bashoWorld(opts: {
  day?: number;
  entrants: { id: string; heyaId: string }[];
  archetype?: Oyakata["archetype"];
  traits?: Partial<typeof TRAITS>;
  standings?: Record<string, { wins: number; losses: number }>;
}): WorldState {
  const day = opts.day ?? 8;
  const rikishi = new Map<string, Rikishi>();
  const matches = [];
  for (let i = 0; i < opts.entrants.length; i += 2) {
    const a = opts.entrants[i];
    const b = opts.entrants[i + 1];
    if (!b) break;
    matches.push({
      boutId: `b-${day}-${a.id}-${b.id}`,
      day,
      eastRikishiId: a.id,
      westRikishiId: b.id,
      result: null,
    });
  }
  for (const e of opts.entrants) {
    rikishi.set(e.id, MockFactory.createRikishi({ id: e.id, heyaId: e.heyaId }));
  }
  const standings = new Map(
    Object.entries(opts.standings ?? {}).map(([id, s]) => [id, { ...s }])
  );

  const world = MockFactory.createWorld({
    cyclePhase: "active_basho",
    rikishi,
    week: 20,
  });
  world.currentBasho = {
    id: "basho-test",
    year: world.year,
    bashoNumber: 3,
    bashoName: "natsu",
    day,
    matches,
    standings,
    isActive: true,
  } as BashoState;

  const oyakata: Oyakata = {
    id: "o-npc",
    heyaId: "h-npc",
    archetype: opts.archetype ?? "nurturer",
    traits: { ...TRAITS, ...opts.traits },
    yearsInCharge: 4,
    shikona: "Npc Oyakata",
    name: "Npc Oyakata",
  } as unknown as Oyakata;
  world.oyakata.set("o-npc", oyakata);
  world.heyas.set("h-npc", MockFactory.createHeya("h-npc", { oyakataId: "o-npc" }));
  world.heyas.set("h-player", MockFactory.createHeya("h-player", { oyakataId: "o-player" }));
  world.playerHeyaId = "h-player";
  return world;
}

describe("phase01_basho_npc_tactics — phase registration", () => {
  it("runs before phase01_basho_bouts inside the active_basho block of tickDaily", () => {
    const src = readSrcFile("engine/tick/tickDaily.ts");
    const tacticsIdx = src.indexOf("phases.phase01_basho_npc_tactics");
    const boutsIdx = src.indexOf("phases.phase01_basho_bouts");
    expect(tacticsIdx).toBeGreaterThan(-1);
    expect(boutsIdx).toBeGreaterThan(-1);
    expect(tacticsIdx).toBeLessThan(boutsIdx);
  });

  it("is a no-op outside active_basho", () => {
    const world = MockFactory.createWorld({ cyclePhase: "interim" });
    const impact = phase01_basho_npc_tactics(world);
    expect(impact.worldFields).toBeUndefined();
    expect(impact.entities).toBeUndefined();
  });
});

describe("day-of kyujo decisions", () => {
  it("withdraws a seriously injured NPC rikishi before the day's bout", () => {
    const world = bashoWorld({
      entrants: [
        { id: "r-inj", heyaId: "h-npc" },
        { id: "r-opp", heyaId: "h-npc" },
      ],
    });
    world.rikishi.set("r-inj", injuredRikishi("r-inj", "h-npc", "serious"));

    const next = resolveImpacts(world, [phase01_basho_npc_tactics(world)]);
    expect(next.rikishi.get("r-inj")!.isKyujo).toBe(true);
    expect(next.rikishi.get("r-inj")!.kyujoReason).toBe("injury");
    expect(next.rikishi.get("r-inj")!.medicalCertificate).toBeDefined();
  });

  it("never auto-withdraws the player's rikishi", () => {
    const world = bashoWorld({
      entrants: [
        { id: "r-pinj", heyaId: "h-player" },
        { id: "r-opp2", heyaId: "h-npc" },
      ],
    });
    world.rikishi.set("r-pinj", injuredRikishi("r-pinj", "h-player", "serious"));

    const next = resolveImpacts(world, [phase01_basho_npc_tactics(world)]);
    expect(next.rikishi.get("r-pinj")!.isKyujo).toBe(false);
  });

  it("welfare-minded manager withdraws a moderate injury; keeps fighting when record is live", () => {
    const world = bashoWorld({
      entrants: [
        { id: "r-mod", heyaId: "h-npc" },
        { id: "r-opp3", heyaId: "h-npc" },
      ],
      archetype: "nurturer",
      traits: { compassion: 80 },
      standings: { "r-mod": { wins: 3, losses: 4 } },
    });
    world.rikishi.set("r-mod", injuredRikishi("r-mod", "h-npc", "moderate"));

    const next = resolveImpacts(world, [phase01_basho_npc_tactics(world)]);
    expect(next.rikishi.get("r-mod")!.isKyujo).toBe(true);
  });

  it("hard-driving manager fights through moderate injury on the kachi-koshi line", () => {
    const world = bashoWorld({
      day: 13,
      entrants: [
        { id: "r-kk", heyaId: "h-npc" },
        { id: "r-opp4", heyaId: "h-npc" },
      ],
      archetype: "tyrant",
      traits: { compassion: 10 },
      standings: { "r-kk": { wins: 6, losses: 6 } },
    });
    world.rikishi.set("r-kk", injuredRikishi("r-kk", "h-npc", "moderate"));

    const next = resolveImpacts(world, [phase01_basho_npc_tactics(world)]);
    expect(next.rikishi.get("r-kk")!.isKyujo).toBe(false);
  });
});

describe("basho posture", () => {
  it("writes a banded posture per NPC heya into world.bashoNpcPosture", () => {
    const world = bashoWorld({
      entrants: [
        { id: "r1", heyaId: "h-npc" },
        { id: "r2", heyaId: "h-npc" },
      ],
      archetype: "tyrant",
    });
    const next = resolveImpacts(world, [phase01_basho_npc_tactics(world)]);
    expect(["conservative", "standard", "aggressive"]).toContain(
      next.bashoNpcPosture?.["h-npc"]
    );
    // Player heya gets no NPC posture.
    expect(next.bashoNpcPosture?.["h-player"]).toBeUndefined();
  });

  it("is deterministic — identical world yields identical posture and kyujo calls", () => {
    const build = () => {
      const world = bashoWorld({
        entrants: [
          { id: "r-inj", heyaId: "h-npc" },
          { id: "r-opp", heyaId: "h-npc" },
        ],
        archetype: "strategist",
      });
      world.rikishi.set("r-inj", injuredRikishi("r-inj", "h-npc", "moderate"));
      return resolveImpacts(world, [phase01_basho_npc_tactics(world)]);
    };
    const a = build();
    const b = build();
    expect(a.bashoNpcPosture).toEqual(b.bashoNpcPosture);
    expect(a.rikishi.get("r-inj")!.isKyujo).toBe(b.rikishi.get("r-inj")!.isKyujo);
  });
});
