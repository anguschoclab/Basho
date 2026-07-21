/**
 * Imperfect-information scouting. NPC stables value recruits by a noisy per-stable
 * ESTIMATE of true talentSeed, not the truth — this is the parity engine: money can't
 * reliably buy the actual best prospect, hidden gems slip to small stables and develop
 * to their TRUE potential, dynasties overpay for duds.
 */
export const PERCEPTION_NOISE_BASE = 32; // ± spread with no scouts and no scouting office
export const PERCEPTION_NOISE_PER_SCOUT = 4; // each scout on staff tightens the spread
export const PERCEPTION_NOISE_OFFICE_BONUS = 6; // scouting_office facility tightens it further
export const PERCEPTION_NOISE_FLOOR = 16; // even elite scouting never sees the truth
