/**
 * src/engine/systems/generation/WorldFactory.ts
 * =================================================
 * World Factory (Thin Orchestrator)
 *
 * Responsibilities:
 * - Orchestrate world generation from seed
 * - Initialize factions and sponsor relationships
 * - Seed initial rivalries for narrative depth
 * - Initialize basho state
 *
 * @see HeyaFactory for heya/oyakata creation
 * @see RosterFactory for rikishi roster generation
 * @see CandidateBuilder for individual rikishi generation
 * @see TalentPoolService for candidate pool management
 * @see SponsorGenerator for sponsor generation
 * @see RivalryService for rivalry seeding
 */

import { rngFromSeed, type SeededRNG } from "../../rng";
import { WorldState } from "../../types/world";
import * as talentpool from "./TalentPoolService";
import { generateInitialSponsorPool } from "./SponsorGenerator";
import { createKoenkai } from "../economy/SponsorshipService";
import { generateHeyaBrandIdentities } from "../keshoMawashi/HeyaBrandGenerator";
import type { BashoName, BashoState } from "../../types/basho";
import type { Faction, IchimonName } from "../../types/economy";
import { TARGET_ROSTER_SIZE } from "../../../constants/engine/recruitmentExtended";
import { getBashoNumber } from "../../calendar";
import { RivalryService } from "../narrative/RivalryService";
import { resetImpactTimestampCounter } from "../../core/StateImpact";
import { createStables } from "./HeyaFactory";
import { createRosters } from "./RosterFactory";

// Re-export factory functions for backward compatibility
export { createHeyaWithOyakata, foundStable, createStables } from "./HeyaFactory";
export { createRosters } from "./RosterFactory";

/**
 * Main orchestrator for world generation.
 * Creates a complete initial world state from a seed.
 *
 * Algorithm:
 * 1. Reset impact timestamp counter for deterministic simulation
 * 2. Create stables and oyakata
 * 3. Generate initial rikishi rosters
 * 4. Build world state with all components
 * 5. Generate heya brand identities
 * 6. Establish koenkai relationships
 * 7. Initialize talent pools
 * 8. Seed initial rivalries
 *
 * @param {string} seed - The seed for deterministic world generation.
 * @returns {WorldState} The complete initial world state.
 *
 * @example
 * ```ts
 * const world = generateInitialWorld("my-sumo-world");
 * console.log(world.rikishi.size); // ~860 wrestlers
 * console.log(world.heyas.size); // 45 stables
 * ```
 */
export function generateInitialWorld(seed: string): WorldState {
  // Reset impact timestamp counter for deterministic simulation
  resetImpactTimestampCounter();
  const worldRng = rngFromSeed(seed, "worldgen", "world");

  // 1. Create Stables
  const { heyaMap, oyakataMap } = createStables(worldRng);

  // 2. Initial Roster Generation
  const rikishiMap = createRosters(worldRng, heyaMap, oyakataMap);

  const world: WorldState = {
    id: worldRng.uuid("WD"),
    seed,
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    // Start in interim: preflight transitions interim → banzuke_reveal → pre_basho → active_basho.
    // currentBashoName points at the upcoming basho (hatsu) so transitions flow correctly.
    cyclePhase: "interim",
    currentBashoName: "hatsu",
    heyas: heyaMap,
    rikishi: rikishiMap,
    historicalRikishi: new Map(),
    activeRikishiIds: new Set(Array.from(rikishiMap.keys())),
    oyakata: oyakataMap,
    staff: new Map(),
    history: [],
    awardLog: [],
    meta: {
      tone: "classic",
      drift: {},
    },
    globalKimariteStats: {},
    events: { version: "1.0.0", log: [], dedupe: {} },
    ftue: { isActive: true, bashoCompleted: 0, suppressedEvents: [] },
    playerHeyaId: Array.from(heyaMap.keys())[0],
    almanacSnapshots: [],
    factions: createInitialFactions(worldRng),
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    records: {
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    },
    settings: { archiveMode: "standard" },
    planetRating: 50,
    isInitialSeed: true,
    sponsorPool: generateInitialSponsorPool(seed),
    trainingState: new Map(),
  };

  // 3. Generate Heya Brand Identities (for kesho-mawashi designs)
  world.heyaBrandIdentities = generateHeyaBrandIdentities(worldRng, world.heyas);

  // 4. Establish Initial Koenkai Relationships (Constitution A6)
  if (world.sponsorPool) {
    for (const heya of world.heyas.values()) {
      const koenkai = createKoenkai(
        heya.id,
        world.sponsorPool,
        "unknown",
        worldRng,
        world.dayIndexGlobal
      );
      world.sponsorPool.koenkais.set(koenkai.koenkaiId, koenkai);
      // Link heya to koenkai
      heya.koenkaiId = koenkai.koenkaiId;
      heya.koenkaiBand = koenkai.strengthBand;
    }
  }

  // Initialize and populate talent pools
  talentpool.tickWeekTalentPool(world);

  // Capture equilibrium active population target for the replacement-rate controller.
  // The initial roster is intentionally small (~440); recruitment fills stables to
  // TARGET_ROSTER_SIZE over the first year. The target is the total NPC stable capacity
  // so the gap controller maintains the population at the intended equilibrium.
  let targetPop = 0;
  for (const heya of world.heyas.values()) {
    if (heya.id === world.playerHeyaId) continue;
    targetPop += TARGET_ROSTER_SIZE;
  }
  world._populationTarget = targetPop;

  // Seed initial rivalries for narrative depth (P0-C1)
  RivalryService.seedInitialRivalries(world);

  return world;
}

/**
 * Initialize a new Basho state.
 * Creates a fresh basho state for the given name and year.
 *
 * @param {WorldState} world - The current world state.
 * @param {BashoName} name - The basho name (e.g., "hatsu", "haru").
 * @returns {BashoState} The initialized basho state.
 *
 * @example
 * ```ts
 * const basho = initializeBasho(world, "hatsu");
 * console.log(basho.year, basho.bashoName);
 * ```
 */
export function initializeBasho(world: WorldState, name: BashoName): BashoState {
  const rng = rngFromSeed(world.seed, "basho", `${world.year}-${name}`);
  return {
    id: rng.uuid("BS"),
    year: world.year,
    bashoNumber: getBashoNumber(name),
    bashoName: name,
    day: 1,
    currentDay: 1,
    matches: [],
    standings: new Map(),
    isActive: true,
  };
}

function createInitialFactions(rng: SeededRNG): Record<string, Faction> {
  const names: IchimonName[] = ["Dewanoumi", "Nishonoseki", "Takasago", "Tokitsukaze", "Isegahama"];
  const factions: Record<string, Faction> = {};

  names.forEach((name) => {
    const id = rng.uuid("FN");
    factions[id] = {
      id: name, // The type Faction uses IchimonName as ID internally (A6.2 compliance)
      name: `${name} Ichimon`,
      influence: 50,
      oyakataLeaderId: null,
    };
  });

  return factions;
}
