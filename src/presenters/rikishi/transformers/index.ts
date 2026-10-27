/**
 * Rikishi Transformers
 * ====================
 * Barrel export for all rikishi DTO transformers.
 * Each transformer handles a specific domain of rikishi data.
 */

// Identity
export { toIdentityDTO } from "@/presenters/rikishi/transformers/identity";

// Rank & Style
export { toRankDTO, toStyleDTO } from "@/presenters/rikishi/transformers/rank";

// Stats & Status
export {
  toStatusDTO,
  toBandsDTO,
  toPerceivedStatsDTO,
  calculatePerceivedStats,
  toDescriptorDTO,
} from "@/presenters/rikishi/transformers/stats";
export { calculateInjurySummary } from "@/presenters/rikishi/transformers/injury";

// Career
export { toCareerDTO, calculateStreak, calculateAvgRank, rankScore } from "@/presenters/rikishi/transformers/career";

// Kimarite
export {
  toKimariteDTO,
  calculateMostFrequentKimarite,
  buildFavoredKimariteDisplay,
} from "@/presenters/rikishi/transformers/kimarite";

// Rivals
export { calculateTopRivals } from "@/presenters/rikishi/transformers/rivals";

// Achievements & Personality
export { toAchievementsDTO, toPersonalityDTO } from "@/presenters/rikishi/transformers/achievements";

// Economics
export { toEconomicsDTO } from "@/presenters/rikishi/transformers/economics";

// Lineage & Career Data
export { toLineageDTO, toCareerDataDTO } from "@/presenters/rikishi/transformers/lineage";

// Visual
export { toVisualDTO, toH2HDTO } from "@/presenters/rikishi/transformers/visual";

// Roster
export { projectRosterEntry } from "@/presenters/rikishi/transformers/roster";

// Kihaku (fighting spirit)
export { toKihakuDTO } from "@/presenters/rikishi/transformers/kihaku";
export type { RikishiKihakuDTO } from "@/presenters/rikishi/transformers/kihaku";
