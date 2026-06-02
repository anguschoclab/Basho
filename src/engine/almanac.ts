// Almanac barrel — re-exports from the almanac/ directory.
// The implementation has been decomposed into focused modules.

export type {
  BashoPerformance,
  RikishiCareerRecord,
  HeyaRecord,
  OyakataRecord,
  AlmanacSnapshot,
} from "./almanac/types";

export { generateCareerRecord } from "./almanac/career";
export { generateHeyaRecord } from "./almanac/heyaRecord";
export { buildAlmanacSnapshot } from "./almanac/snapshot";
export { getRikishiCareerSummary } from "./almanac/summary";
