/**
 * MediaService.ts — Thin re-export barrel for the Media system.
 *
 * Sub-module responsibilities:
 *   MediaBoutService      — bout-triggered media updates (updateMediaFromBout + private helpers)
 *   MediaStateService     — state lifecycle (createDefaultMediaState, reset, snapshot, weekly boundary)
 *   MediaEventService     — event-driven media (handleMediaEvent, evaluateScandals, generateGovernanceHeadline, processMediaDecision)
 *   MediaPreBashoService  — pre-basho journalism (triggerPreBashoJournalism, buildMediaDigest)
 */

export { updateMediaFromBout } from "./MediaBoutService";

export {
  createDefaultMediaState,
  resetBashoMediaTracking,
  snapshotMediaHeatForBasho,
  processWeeklyMediaBoundary,
} from "./MediaStateService";

export {
  generateGovernanceHeadline,
  handleMediaEvent,
  evaluateScandals,
  processMediaDecision,
} from "./MediaEventService";

export { triggerPreBashoJournalism, buildMediaDigest } from "./MediaPreBashoService";
