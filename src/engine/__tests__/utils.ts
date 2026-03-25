import type { Rikishi, RikishiStats } from "../types/rikishi";
import type { TacticalArchetype } from "../types/combat";

export function mockRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  const power = overrides.power ?? (overrides.stats as any)?.strength ?? 50;
  const speed = overrides.speed ?? (overrides.stats as any)?.speed ?? 50;
  const balance = overrides.balance ?? (overrides.stats as any)?.balance ?? 50;
  const technique = overrides.technique ?? (overrides.stats as any)?.technique ?? 50;
  const aggression = overrides.aggression ?? (overrides.stats as any)?.aggression ?? 50;
  const experience = overrides.experience ?? (overrides.stats as any)?.experience ?? 50;

  return {
    id,
    shikona: `Wrestler-${id}`,
    heyaId: `heya-${id}`,
    nationality: "JP",
    rank: "maegashira",
    rankNumber: 5, division: "makuuchi",
    currentBashoWins: 3,
    currentBashoLosses: 1,
    side: "east",
    weight: 140,
    height: 180,
    style: "oshi",
    archetype: "all_rounder" as any,
    power,
    speed,
    balance,
    technique,
    aggression,
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
      speed: speed, 
      technique: technique, 
      balance: balance, 
      weight: 140, 
      stamina: 100, 
      mental: 50, 
      adaptability: 50,
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }
      }
    } as any,
    careerWins: 20,
    careerLosses: 10,
    favoredKimarite: [],
    weakAgainstStyles: [],
    combatProfile: {
      archetype: 'all_rounder',
      familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
      preferredGrip: 'none',
      preferredGripDepth: 'standard',
      statModifiers: {}
    },
    ...overrides,
  } as unknown as Rikishi;
}