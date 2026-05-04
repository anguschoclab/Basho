/**
 * applyOyakataConfig.ts
 *
 * Pure function that applies the player's OyakataCreationConfig to the world state
 * during new-game initialisation. All mutations are immutable (spread + new Map).
 */

import type { WorldState } from "@/engine/types/world";
import type { OyakataCreationConfig, OyakataArchetype, OyakataTraits } from "@/engine/types/oyakata";
import { OYAKATA_ARCHETYPES } from "@/engine/oyakataPersonalities";
import { generateToshiyoriName } from "@/engine/shikona/toshiyoriNames";
import { SeededRNG } from "@/engine/rng";

// ---------------------------------------------------------------------------
// Backstory data — defined here (NOT imported from the UI wizard layer).
// ---------------------------------------------------------------------------

interface PlayerBackstory {
  id: string;
  label: string;
  highestRank: string;
  preferredArchetype?: OyakataArchetype;
  traitModifiers: Partial<OyakataTraits>;
  bonuses: {
    funds: number;
    prestige: number;
    scouting: number;
    training: number;
    politics: number;
    politicalCapital: number;
  };
  startingQuirks: string[];
}

export const PLAYER_BACKSTORIES: PlayerBackstory[] = [
  {
    id: "yokozuna_champion",
    label: "Champion Inheritor",
    highestRank: "Yokozuna",
    preferredArchetype: "traditionalist",
    traitModifiers: { ambition: 10, tradition: 15, patience: -5 },
    bonuses: { funds: 3_000_000, prestige: 4, scouting: 1, training: 1, politics: 3, politicalCapital: 60 },
    startingQuirks: ["Old-School Stickler", "Media Operator"],
  },
  {
    id: "ozeki_legend",
    label: "Tournament Legend",
    highestRank: "Ozeki",
    preferredArchetype: "strategist",
    traitModifiers: { ambition: 5, patience: 10 },
    bonuses: { funds: 5_000_000, prestige: 3, scouting: 0, training: 2, politics: 1, politicalCapital: 30 },
    startingQuirks: ["Numbers Guy"],
  },
  {
    id: "sanyaku_veteran",
    label: "Sanyaku Veteran",
    highestRank: "Sekiwake",
    preferredArchetype: "scientist",
    traitModifiers: { patience: 5, tradition: -10 },
    bonuses: { funds: 10_000_000, prestige: 1, scouting: 1, training: 2, politics: 0, politicalCapital: 10 },
    startingQuirks: ["Keiko Romantic"],
  },
  {
    id: "maegashira_lifer",
    label: "Long-Distance Runner",
    highestRank: "Maegashira",
    preferredArchetype: "nurturer",
    traitModifiers: { compassion: 15, tradition: 10, ambition: -15 },
    bonuses: { funds: 15_000_000, prestige: -1, scouting: 0, training: 4, politics: -1, politicalCapital: 0 },
    startingQuirks: ["Keiko Romantic", "Family First"],
  },
  {
    id: "injury_comeback",
    label: "Comeback King",
    highestRank: "Ozeki",
    preferredArchetype: "gambler",
    traitModifiers: { risk: 20, ambition: 15, patience: -10 },
    bonuses: { funds: 8_000_000, prestige: 2, scouting: 1, training: 1, politics: 1, politicalCapital: 20 },
    startingQuirks: ["Gambler's Instinct"],
  },
  {
    id: "international_scout",
    label: "International Scout",
    highestRank: "Maegashira",
    preferredArchetype: "scientist",
    traitModifiers: { tradition: -20, patience: 10 },
    bonuses: { funds: 12_000_000, prestige: 0, scouting: 5, training: 1, politics: -1, politicalCapital: 0 },
    startingQuirks: ["Sleeper Scout"],
  },
  {
    id: "council_elder",
    label: "Council Elder",
    highestRank: "Sekiwake",
    preferredArchetype: "strategist",
    traitModifiers: { patience: 15, tradition: 5, ambition: -10 },
    bonuses: { funds: 20_000_000, prestige: -1, scouting: 0, training: -1, politics: 5, politicalCapital: 100 },
    startingQuirks: ["Cold Pragmatist"],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Apply the player's creation wizard choices to the world, updating the
 * oyakata and heya records immutably.
 *
 * @param world       - Current world state (pre-game).
 * @param playerHeyaId - ID of the player-owned heya.
 * @param config      - Choices made in the new-game wizard.
 * @returns Updated WorldState with modified oyakata and heya maps.
 */
export function applyOyakataCreationConfig(
  world: WorldState,
  playerHeyaId: string,
  config: OyakataCreationConfig
): WorldState {
  // 1. Resolve heya
  const heya = world.heyas.get(playerHeyaId);
  if (!heya) {
    console.warn(`[applyOyakataCreationConfig] Heya not found: ${playerHeyaId}`);
    return world;
  }

  // 2. Resolve oyakata
  const oyakata = world.oyakata.get(heya.oyakataId);
  if (!oyakata) {
    console.warn(`[applyOyakataCreationConfig] Oyakata not found: ${heya.oyakataId}`);
    return world;
  }

  // 3. Look up backstory
  const backstory = PLAYER_BACKSTORIES.find((b) => b.id === config.backstoryId);
  if (!backstory) {
    console.warn(`[applyOyakataCreationConfig] Unknown backstoryId: ${config.backstoryId}`);
    return world;
  }

  // 4. Generate formerShikona deterministically from the player's chosen name
  const formerShikona = generateToshiyoriName(new SeededRNG(config.name + "_former"));

  // 5. Determine archetype (backstory preference overrides existing if provided)
  const archetype: OyakataArchetype = backstory.preferredArchetype ?? oyakata.archetype;

  // Build traits: archetype base + backstory modifiers, clamped to [0, 100]
  const baseTraits = OYAKATA_ARCHETYPES[archetype];
  const mods = backstory.traitModifiers;
  const traits: OyakataTraits = {
    ambition: clamp(baseTraits.ambition + (mods.ambition ?? 0)),
    patience: clamp(baseTraits.patience + (mods.patience ?? 0)),
    risk: clamp(baseTraits.risk + (mods.risk ?? 0)),
    tradition: clamp(baseTraits.tradition + (mods.tradition ?? 0)),
    compassion: clamp(baseTraits.compassion + (mods.compassion ?? 0)),
  };

  // Deduplicate quirks: backstory quirks prepended before existing ones
  const existingQuirks = oyakata.quirks ?? [];
  const mergedQuirks = [
    ...backstory.startingQuirks,
    ...existingQuirks.filter((q) => !backstory.startingQuirks.includes(q)),
  ];

  // Memory directive
  const memoryDirective = `I entered this stable as a ${backstory.label}. My legacy begins here.`;
  const updatedMemory = oyakata.memory
    ? {
        ...oyakata.memory,
        coreDirectives: [memoryDirective, ...oyakata.memory.coreDirectives],
      }
    : {
        observations: [],
        coreDirectives: [memoryDirective],
        lastConsolidationTick: 0,
      };

  // Build updated oyakata (immutable)
  const updatedOyakata = {
    ...oyakata,
    name: config.name,
    shikona: config.name,
    backstoryId: config.backstoryId,
    highestRank: backstory.highestRank,
    formerShikona,
    archetype,
    traits,
    stats: {
      scouting: (oyakata.stats?.scouting ?? 0) + backstory.bonuses.scouting,
      training: (oyakata.stats?.training ?? 0) + backstory.bonuses.training,
      politics: (oyakata.stats?.politics ?? 0) + backstory.bonuses.politics,
    },
    quirks: mergedQuirks,
    memory: updatedMemory,
  };

  // 6. Build updated heya (immutable)
  const updatedHeya = {
    ...heya,
    funds: heya.funds + backstory.bonuses.funds,
    prestige: (heya.prestige ?? 0) + backstory.bonuses.prestige,
    politicalCapital: (heya.politicalCapital ?? 0) + backstory.bonuses.politicalCapital,
    ichimon: config.ichimon ?? heya.ichimon,
  };

  // 7. Return new world with updated maps
  const newOyakataMap = new Map(world.oyakata);
  newOyakataMap.set(oyakata.id, updatedOyakata);

  const newHeyasMap = new Map(world.heyas);
  newHeyasMap.set(playerHeyaId, updatedHeya);

  return {
    ...world,
    oyakata: newOyakataMap,
    heyas: newHeyasMap,
  };
}
