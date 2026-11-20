/**
 * applyOyakataConfig.ts
 *
 * Pure function that applies the player's OyakataCreationConfig to the world state
 * during new-game initialisation. All mutations are immutable (spread + new Map).
 */

import type { WorldState } from "@/engine/types/world";
import type {
  OyakataCreationConfig,
  OyakataArchetype,
  OyakataTraits,
} from "@/engine/types/oyakata";
import { OYAKATA_ARCHETYPES } from "@/engine/npc/personas/oyakataPersonalities";
import { generateToshiyoriName } from "@/engine/shikona/toshiyoriNames";
import { SeededRNG } from "@/engine/core/rng";
import { getHeya } from "@/engine/core/queries";
import { warn } from "@/engine/utils/Logger";
import { clamp } from "@/engine/utils/math";
import { BACKSTORY_BONUS_CORE, BACKSTORY_POLITICAL_CAPITAL } from "@/constants/engine/backstories";

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
    bonuses: {
      ...BACKSTORY_BONUS_CORE.yokozuna_champion,
      politicalCapital: BACKSTORY_POLITICAL_CAPITAL.yokozuna_champion,
    },
    startingQuirks: ["Old-School Stickler", "Media Operator"],
  },
  {
    id: "ozeki_legend",
    label: "Tournament Legend",
    highestRank: "Ozeki",
    preferredArchetype: "strategist",
    traitModifiers: { ambition: 5, patience: 10 },
    bonuses: {
      ...BACKSTORY_BONUS_CORE.ozeki_legend,
      politicalCapital: BACKSTORY_POLITICAL_CAPITAL.ozeki_legend,
    },
    startingQuirks: ["Numbers Guy"],
  },
  {
    id: "sanyaku_veteran",
    label: "Sanyaku Veteran",
    highestRank: "Sekiwake",
    preferredArchetype: "scientist",
    traitModifiers: { patience: 5, tradition: -10 },
    bonuses: {
      ...BACKSTORY_BONUS_CORE.sanyaku_veteran,
      politicalCapital: BACKSTORY_POLITICAL_CAPITAL.sanyaku_veteran,
    },
    startingQuirks: ["Keiko Romantic"],
  },
  {
    id: "maegashira_lifer",
    label: "Long-Distance Runner",
    highestRank: "Maegashira",
    preferredArchetype: "nurturer",
    traitModifiers: { compassion: 15, tradition: 10, ambition: -15 },
    bonuses: {
      ...BACKSTORY_BONUS_CORE.maegashira_lifer,
      politicalCapital: BACKSTORY_POLITICAL_CAPITAL.maegashira_lifer,
    },
    startingQuirks: ["Keiko Romantic", "Family First"],
  },
  {
    id: "injury_comeback",
    label: "Comeback King",
    highestRank: "Ozeki",
    preferredArchetype: "gambler",
    traitModifiers: { risk: 20, ambition: 15, patience: -10 },
    bonuses: {
      ...BACKSTORY_BONUS_CORE.injury_comeback,
      politicalCapital: BACKSTORY_POLITICAL_CAPITAL.injury_comeback,
    },
    startingQuirks: ["Gambler's Instinct"],
  },
  {
    id: "international_scout",
    label: "International Scout",
    highestRank: "Maegashira",
    preferredArchetype: "scientist",
    traitModifiers: { tradition: -20, patience: 10 },
    bonuses: {
      ...BACKSTORY_BONUS_CORE.international_scout,
      politicalCapital: BACKSTORY_POLITICAL_CAPITAL.international_scout,
    },
    startingQuirks: ["Sleeper Scout"],
  },
  {
    id: "council_elder",
    label: "Council Elder",
    highestRank: "Sekiwake",
    preferredArchetype: "strategist",
    traitModifiers: { patience: 15, tradition: 5, ambition: -10 },
    bonuses: {
      ...BACKSTORY_BONUS_CORE.council_elder,
      politicalCapital: BACKSTORY_POLITICAL_CAPITAL.council_elder,
    },
    startingQuirks: ["Cold Pragmatist"],
  },
];

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
  const heya = getHeya(world, playerHeyaId);
  if (!heya) {
    warn(`Heya not found: ${playerHeyaId}`, "applyOyakataCreationConfig");
    return world;
  }

  // 2. Resolve oyakata
  const oyakata = world.oyakata.get(heya.oyakataId);
  if (!oyakata) {
    warn(`Oyakata not found: ${heya.oyakataId}`, "applyOyakataCreationConfig");
    return world;
  }

  // 3. Look up backstory
  const backstory = PLAYER_BACKSTORIES.find((b) => b.id === config.backstoryId);
  if (!backstory) {
    warn(`Unknown backstoryId: ${config.backstoryId}`, "applyOyakataCreationConfig");
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
    ambition: clamp(baseTraits.ambition + (mods.ambition ?? 0), 0, 100),
    patience: clamp(baseTraits.patience + (mods.patience ?? 0), 0, 100),
    risk: clamp(baseTraits.risk + (mods.risk ?? 0), 0, 100),
    tradition: clamp(baseTraits.tradition + (mods.tradition ?? 0), 0, 100),
    compassion: clamp(baseTraits.compassion + (mods.compassion ?? 0), 0, 100),
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
        planHistory: [],
        decisionHistory: [],
        opponentModels: {},
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
    settings: { ...world.settings, careerMode: config.careerMode ?? "career" },
    oyakata: newOyakataMap,
    heyas: newHeyasMap,
  };
}
