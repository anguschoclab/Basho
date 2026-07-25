/**
 * Rikishi Transformers
 * ====================
 * Barrel export for all rikishi DTO transformers.
 * Each transformer handles a specific domain of rikishi data.
 */

/* eslint-disable @typescript-eslint/no-unused-vars -- Barrel exports: these are used by external modules */

// Identity
export { toIdentityDTO } from "./identity";

// Rank & Style
export { toRankDTO, toStyleDTO } from "./rank";

// Stats & Status
export { toStatusDTO, toBandsDTO, toPerceivedStatsDTO, calculatePerceivedStats, toDescriptorDTO } from "./stats";
export { calculateInjurySummary } from "./injury";

// Career
export { toCareerDTO, calculateStreak, calculateAvgRank, rankScore } from "./career";

// Kimarite
export {
  toKimariteDTO,
  calculateMostFrequentKimarite,
  buildFavoredKimariteDisplay,
} from "./kimarite";

// Rivals
export { calculateTopRivals } from "./rivals";

// Achievements & Personality
export { toAchievementsDTO, toPersonalityDTO } from "./achievements";

// Economics
export { toEconomicsDTO } from "./economics";

// Lineage & Career Data
export { toLineageDTO, toCareerDataDTO } from "./lineage";

// Visual
export { toVisualDTO, toH2HDTO } from "./visual";

// Roster
export { projectRosterEntry } from "./roster";
