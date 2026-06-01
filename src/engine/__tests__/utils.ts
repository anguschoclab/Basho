import type { Rikishi, RikishiStats } from "../types/rikishi";
import type { CombatArchetype, Style } from "../types/combat";
import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import type { Heya } from "../types/heya";
import type { HeyaBrandIdentity, KeshoMawashi, YokozunaTsuna } from "../types/keshoMawashi";
import { SeededRNG } from "../rng";
import type { Id } from "../types/common";

// ── Rikishi ────────────────────────────────────────────────────────────────

export function mockRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  const statsOverride = overrides.stats;
  const power = overrides.power ?? statsOverride?.strength ?? 50;
  const speed = overrides.speed ?? statsOverride?.speed ?? 50;
  const balance = overrides.balance ?? statsOverride?.balance ?? 50;
  const technique = overrides.technique ?? statsOverride?.technique ?? 50;
  const aggression = overrides.aggression ?? statsOverride?.aggression ?? 50;
  const mental = overrides.mental ?? statsOverride?.mental ?? 50;
  const experience = overrides.experience ?? statsOverride?.experience ?? 50;

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
    style: "oshi" as Style,
    archetype: "hybrid" as CombatArchetype,
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
      ...statsOverride,
    } as RikishiStats,
    careerWins: 20,
    careerLosses: 10,
    favoredKimarite: [],
    weakAgainstStyles: [],
    combatProfile: {
      archetype: "all_rounder" as CombatArchetype,
      familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: {},
    },
    ...overrides,
  } as Rikishi;
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
  } as Heya;
}

// ── WorldState ─────────────────────────────────────────────────────────────

export function makeMockWorld(overrides: Partial<WorldState> = {}): WorldState {
  const seed = overrides.seed || "test-seed";
  const rikishiMap = overrides.rikishi || new Map();
  // The engine derives the active roster from `activeRikishiIds` (a perf optimization),
  // so keep it in sync — including for rikishi added via `world.rikishi.set(...)` after
  // construction. Retired rikishi are excluded, matching production's "active = not retired".
  const activeRikishiIds =
    overrides.activeRikishiIds ||
    new Set(
      Array.from(rikishiMap.entries())
        .filter(([, r]) => !(r as Rikishi | undefined)?.isRetired)
        .map(([k]) => k)
    );
  if (!(rikishiMap as { __activeSyncPatched?: boolean }).__activeSyncPatched) {
    const baseSet = rikishiMap.set.bind(rikishiMap);
    rikishiMap.set = (k: string, v: Rikishi) => {
      if (v && !v.isRetired) activeRikishiIds.add(k);
      else activeRikishiIds.delete(k);
      return baseSet(k, v);
    };
    (rikishiMap as { __activeSyncPatched?: boolean }).__activeSyncPatched = true;
  }
  return {
    rikishi: rikishiMap,
    historicalRikishi: new Map(),
    activeRikishiIds,
    heyas: new Map(),
    staff: new Map(),
    oyakata: new Map(),
    events: { version: "1.0.0", log: [], dedupe: {} },
    history: [],
    ftue: { onboardingComplete: true },
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    id: "world-test",
    seed,
    cyclePhase: "interim",
    records: {
      allTimeWins: { value: 0, rikishiId: "none" as Id, year: 0 },
      yushoRecord: { value: 0, rikishiId: "none" as Id, year: 0 },
      kinboshiRecord: { value: 0, rikishiId: "none" as Id, year: 0 },
    },
    settings: { archiveMode: "standard" },
    rng: new SeededRNG(seed),
    meta: { tone: "classic", drift: {} },
    globalKimariteStats: {},
    ...overrides,
  } as WorldState;
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
  } as BashoState;
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
    crestMotif: rng.pick([
      "sakura",
      "pine",
      "waves",
      "mountain",
      "rising_sun",
    ]) as HeyaBrandIdentity["crestMotif"],
    crestStyle: rng.pick([
      "circular",
      "shield",
      "diamond",
      "oval",
      "square",
    ]) as HeyaBrandIdentity["crestStyle"],
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
): WorldState & { heyaBrandIdentities: Map<Id, HeyaBrandIdentity> } {
  const world = makeMockWorld(overrides);
  const heyaBrandIdentities = new Map<Id, HeyaBrandIdentity>();

  for (let i = 0; i < heyaCount; i++) {
    const { heya, brand } = mockHeyaWithBrand(`heya-${i + 1}`);
    world.heyas.set(heya.id, heya);
    heyaBrandIdentities.set(brand.id, brand);
  }

  return {
    ...world,
    heyaBrandIdentities,
  } as WorldState & { heyaBrandIdentities: Map<Id, HeyaBrandIdentity> };
}
