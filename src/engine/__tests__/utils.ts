/**
 * src/engine/__tests__/utils.ts
 * =============================
 * Centralized mock factories for test files.
 * Import from here instead of defining locally per-file.
 */

import type { Rikishi, RikishiStats } from "../types/rikishi";
import type { TacticalArchetype } from "../types/combat";
import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import type { Heya } from "../types/heya";
import type { HeyaBrandIdentity, KeshoMawashi, YokozunaTsuna } from "../types/keshoMawashi";
import { SeededRNG } from "../rng";

// ── Rikishi ────────────────────────────────────────────────────────────────

export function mockRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  const power = overrides.power ?? (overrides.stats as unknown as RikishiStats)?.strength ?? 50;
  const speed = overrides.speed ?? (overrides.stats as unknown as RikishiStats)?.speed ?? 50;
  const balance = overrides.balance ?? (overrides.stats as unknown as RikishiStats)?.balance ?? 50;
  const technique =
    overrides.technique ?? (overrides.stats as unknown as RikishiStats)?.technique ?? 50;
  const aggression =
    overrides.aggression ?? (overrides.stats as unknown as RikishiStats)?.aggression ?? 50;
  const mental = overrides.mental ?? (overrides.stats as unknown as RikishiStats)?.mental ?? 50;
  const experience =
    overrides.experience ?? (overrides.stats as unknown as RikishiStats)?.experience ?? 50;

  return {
    id,
    shikona: `Wrestler-${id}`,
    heyaId: `heya-${id}`,
    nationality: "JP",
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    currentBashoWins: 3,
    currentBashoLosses: 1,
    side: "east",
    weight: 140,
    height: 180,
    style: "oshi",
    archetype: "all_rounder" as unknown as TacticalArchetype,
    power,
    speed,
    balance,
    technique,
    aggression,
    mental,
    experience,
    momentum: 0,
    stamina: 100,
    fatigue: 0,
    injured: false,
    injuryWeeksRemaining: 0,
    birthYear: 1995,
    adaptability: 50,
    h2h: {},
    history: [],
    personalityTraits: [],
    condition: 90,
    motivation: 50,
    stats: {
      strength: power,
      speed,
      technique,
      balance,
      weight: 140,
      stamina: 100,
      mental: 50,
      adaptability: 50,
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
      },
    } as unknown as RikishiStats,
    careerWins: 20,
    careerLosses: 10,
    favoredKimarite: [],
    weakAgainstStyles: [],
    combatProfile: {
      archetype: "all_rounder",
      familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: {},
    },
    ...overrides,
  } as unknown as Rikishi;
}

// ── Heya ───────────────────────────────────────────────────────────────────

export function makeMockHeya(id: string, overrides: Partial<Heya> = {}): Heya {
  return {
    id,
    name: `Heya-${id}`,
    rikishiIds: [],
    staffIds: [],
    funds: 5_000_000,
    reputation: 50,
    scandalScore: 0,
    governanceStatus: "good_standing",
    politicalCapital: 50,
    koenkaiBand: "bronze",
    facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 },
    riskIndicators: { financial: false, welfare: false, governance: false },
    ...overrides,
  } as unknown as Heya;
}

// ── WorldState ─────────────────────────────────────────────────────────────

export function makeMockWorld(overrides: Partial<WorldState> = {}): WorldState {
  const seed = overrides.seed || "test-seed";
  return {
    rikishi: new Map(),
    historicalRikishi: new Map(),
    heyas: new Map(),
    staff: new Map(),
    oyakata: new Map(),
    events: { version: "1.0.0", log: [], dedupe: {} },
    history: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ftue: {} as any,
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    id: "world-test",
    seed,
    cyclePhase: "interim",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    records: {} as any,
    settings: { archiveMode: "standard" },
    rng: new SeededRNG(seed),
    ...overrides,
  } as unknown as WorldState;
}

// ── BashoState ─────────────────────────────────────────────────────────────

export function makeMockBasho(overrides: Partial<BashoState> = {}): BashoState {
  return {
    id: "test-basho",
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 1,
    matches: [],
    standings: new Map(),
    isActive: true,
    ...overrides,
  } as unknown as BashoState;
}

// ── Kesho-Mawashi / Heya Brand Identity ────────────────────────────────────

export function mockHeyaBrandIdentity(
  id: string,
  overrides: Partial<HeyaBrandIdentity> = {}
): HeyaBrandIdentity {
  const rng = new SeededRNG(id);

  return {
    id: `brand-${id}`,
    heyaId: id,
    primaryColor: rng.pick(["#1a365d", "#744210", "#276749", "#742a2a", "#2d3748"]),
    secondaryColor: rng.pick(["#2c5282", "#975a16", "#2f855a", "#9b2c2c", "#4a5568"]),
    accentColor: rng.pick(["#d69e2e", "#ecc94b", "#f6ad55", "#fc8181", "#90cdf4"]),
    crestMotif: rng.pick(["sakura", "pine", "waves", "mountain", "rising_sun"]),
    crestStyle: rng.pick(["circular", "shield", "diamond", "oval", "square"]),
    traditionLevel: 0.5 + rng.next() * 0.5, // 0.5-1.0
    createdAt: { year: 2025, basho: "hatsu" },
    ...overrides,
  };
}

export function mockHeyaWithBrand(
  id: string,
  overrides: Partial<Heya> = {}
): { heya: Heya; brand: HeyaBrandIdentity } {
  const brand = mockHeyaBrandIdentity(id);
  const heya = makeMockHeya(id, {
    brandIdentityId: brand.id,
    ...overrides,
  });

  return { heya, brand };
}

export function mockKeshoMawashi(overrides: Partial<KeshoMawashi> = {}): KeshoMawashi {
  return {
    rikishiId: overrides.rikishiId || "test-rikishi",
    createdAt: overrides.createdAt || { year: 2025, basho: "hatsu", tier: "juryo" },
    tier: (overrides.tier as KeshoMawashi["tier"]) || "juryo",
    origin: (overrides.origin as KeshoMawashi["origin"]) || "traditional",
    basePattern: (overrides.basePattern as KeshoMawashi["basePattern"]) || "striped",
    primaryColor: overrides.primaryColor || "#1a365d",
    secondaryColor: overrides.secondaryColor || "#2c5282",
    accentColor: overrides.accentColor || "#d69e2e",
    goldThreadDensity: overrides.goldThreadDensity ?? 0.3,
    mainSymbol: overrides.mainSymbol || {
      type: "motif",
      value: "dragon",
      position: "center",
      size: "large",
      prominence: 0.8,
    },
    description: overrides.description || "An elegant ceremonial apron",
    ...overrides,
  } as KeshoMawashi;
}

export function mockYokozunaTsuna(overrides: Partial<YokozunaTsuna> = {}): YokozunaTsuna {
  return {
    rikishiId: overrides.rikishiId || "test-rikishi",
    conferredAt: overrides.conferredAt || { year: 2025, basho: "hatsu" },
    style: (overrides.style as YokozunaTsuna["style"]) || "traditional",
    ropeColor: (overrides.ropeColor as YokozunaTsuna["ropeColor"]) || "gold_accented",
    paperTassels: overrides.paperTassels ?? 5,
    displayedOnProfile: overrides.displayedOnProfile ?? true,
    isRetired: overrides.isRetired ?? false,
    ...overrides,
  } as YokozunaTsuna;
}

export function mockRikishiWithKesho(
  id: string,
  tier: KeshoMawashi["tier"] = "juryo",
  overrides: Partial<Rikishi> = {}
): Rikishi {
  const rikishi = mockRikishi(id, {
    rank:
      tier === "yokozuna"
        ? "yokozuna"
        : tier === "sanyaku"
          ? "sekiwake"
          : tier === "makuuchi"
            ? "maegashira"
            : "juryo",
    rankNumber: 1,
    division: tier === "juryo" ? "juryo" : "makuuchi",
    ...overrides,
  });

  (rikishi as Rikishi & { keshoMawashi: KeshoMawashi }).keshoMawashi = mockKeshoMawashi({
    rikishiId: id,
    tier,
  });

  return rikishi as Rikishi & { keshoMawashi: KeshoMawashi };
}

export function makeMockWorldWithBrands(
  heyaCount: number = 5,
  overrides: Partial<WorldState> = {}
): WorldState & { heyaBrandIdentities: Map<string, HeyaBrandIdentity> } {
  const world = makeMockWorld(overrides);
  const heyaBrandIdentities = new Map<string, HeyaBrandIdentity>();

  for (let i = 0; i < heyaCount; i++) {
    const { heya, brand } = mockHeyaWithBrand(`heya-${i + 1}`);
    world.heyas.set(heya.id, heya as unknown as Heya);
    heyaBrandIdentities.set(brand.id, brand);
  }

  return {
    ...world,
    heyaBrandIdentities,
  } as WorldState & { heyaBrandIdentities: Map<string, HeyaBrandIdentity> };
}
