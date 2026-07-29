// Almanac System - Historical Memory per Constitution §A5 and §4
// Tracks rikishi career records, heya records, and historical snapshots

export type {
  BashoPerformance,
  RikishiCareerRecord,
  HeyaRecord,
  OyakataRecord,
  AlmanacSnapshot,
  NotableBoutEntry,
  NarrativeHighlight,
  PromotionHistoryEntry,
} from "./types";

export {
  NOTABLE_NARRATIVE_TAGS,
  NOTABLE_NARRATIVE_PHASES,
  MAX_NOTABLE_BOUTS,
  MAX_NARRATIVE_HIGHLIGHTS,
  MAX_PROMOTION_HISTORY,
} from "./types";

export { generateCareerRecord } from "./career";
export { generateHeyaRecord } from "./heyaRecord";
export { buildAlmanacSnapshot } from "./snapshot";
export { getRikishiCareerSummary } from "./summary";
export {
  createEmptyAlmanacRecord,
  buildNotableBoutEntry,
  enrichAlmanacRecord,
  runAlmanacNarrativeUpdate,
} from "./narrativeEnrichment";
