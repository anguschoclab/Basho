// Almanac System - Historical Memory per Constitution §A5 and §4
// Tracks rikishi career records, heya records, and historical snapshots

export type {
  AlmanacBashoPerformance,
  RikishiCareerRecord,
  HeyaRecord,
  OyakataRecord,
  AlmanacSnapshot,
  NotableBoutEntry,
  NarrativeHighlight,
  PromotionHistoryEntry,
} from "@/engine/almanac/types";

export {
  NOTABLE_NARRATIVE_TAGS,
  NOTABLE_NARRATIVE_PHASES,
  MAX_NOTABLE_BOUTS,
  MAX_NARRATIVE_HIGHLIGHTS,
  MAX_PROMOTION_HISTORY,
} from "@/engine/almanac/types";

export { generateCareerRecord } from "@/engine/almanac/career";
export { generateHeyaRecord } from "@/engine/almanac/heyaRecord";
export { buildAlmanacSnapshot } from "@/engine/almanac/snapshot";
export { getRikishiCareerSummary } from "@/engine/almanac/summary";
export {
  createEmptyAlmanacRecord,
  buildNotableBoutEntry,
  enrichAlmanacRecord,
  runAlmanacNarrativeUpdate,
} from "@/engine/almanac/narrativeEnrichment";
